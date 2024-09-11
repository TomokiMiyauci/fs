import { List, Set } from "@miyauci/infra";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import type {
  DirectoryEntry as IDirectoryEntry,
  FileEntry as IFileEntry,
  FileSystemAccessResult,
  FileSystemEntry,
} from "./file_system_entry.ts";
import type {
  FileSystem as IFileSystem,
  FileSystemObservation,
  FileSystemPath,
} from "./file_system.ts";
import { Msg } from "./constant.ts";
import {
  createNewFileSystemDirectoryHandle,
  FileSystemDirectoryHandle,
} from "./file_system_directory_handle.ts";
import { VirtualFileSystem } from "@test/util.ts";
import { runFileSystemDirectoryHandleTest } from "@test/file_system_directory_handle.ts";

runFileSystemDirectoryHandleTest(async () => {
  const fs = new VirtualFileSystem();
  const root = await fs.getDirectory();

  return {
    root,
  };
});

class FileSystem implements IFileSystem {
  root: string = "";
  observations: Set<FileSystemObservation> = new Set();
  getPath(entry: FileSystemEntry): List<string> {
    const path = new List([entry.name]);
    let parent = entry.parent;

    while (parent) {
      path.prepend(parent.name);

      parent = parent.parent;
    }

    return path;
  }
  locateEntry(_: FileSystemPath): FileSystemEntry | null {
    return null;
  }
}

class DirectoryEntry implements IDirectoryEntry {
  constructor(public fileSystem: FileSystem) {}
  name: string = "";

  parent: null = null;

  children: Pick<
    Set<FileSystemEntry>,
    "append" | "remove" | "isEmpty" | typeof Symbol.iterator
  > = new Set();

  requestAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }

  queryAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
}

class FileEntry implements IFileEntry {
  constructor(public fileSystem: FileSystem) {}
  name: string = "";

  binaryData: Uint8Array = new Uint8Array();

  parent: null = null;

  modificationTimestamp: number = Date.now();

  lock: "open" | "taken-exclusive" | "taken-shared" = "open";

  sharedLockCount: number = 0;
  requestAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }

  queryAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
}

describe("FileSystemDirectoryHandle", () => {
  interface Context {
    fileSystem: FileSystem;
    handle: FileSystemDirectoryHandle;
  }

  beforeEach<Context>(function () {
    this.fileSystem = new FileSystem();
    this.handle = createNewFileSystemDirectoryHandle(
      this.fileSystem,
      new List([""]),
    );
  });

  describe("constructor", () => {
    it("should not construct", () => {
      // @ts-expect-error it should not construct
      new FileSystemDirectoryHandle();
    });
  });

  describe("getDirectoryHandle", () => {
    it<Context>("should throw error if name is invalid", async function () {
      await expect(this.handle.getDirectoryHandle("")).rejects.toThrow(
        new TypeError(Msg.InvalidName),
      );
    });

    it<Context>(
      "should throw error if located entry does not exist",
      async function () {
        await expect(this.handle.getDirectoryHandle("dir")).rejects.toThrow(
          new DOMException(Msg.NotFound, "NotFound"),
        );
      },
    );

    it<Context>(
      "should throw error if located entry does not permit",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const errorName = "DeniedError";
        dir.queryAccess = () => {
          return { permissionState: "denied", errorName };
        };
        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await expect(this.handle.getDirectoryHandle("dir")).rejects.toThrow(
          new DOMException(Msg.PermissionDenied, errorName),
        );
      },
    );

    it<Context>(
      "should throw error if child exists and it is not directory",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const entry = new FileEntry(this.fileSystem);

        entry.name = "dir";

        class MySet extends Set<FileSystemEntry> {
          *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
            yield entry;
          }
        }
        dir.children = new MySet();

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await expect(this.handle.getDirectoryHandle("dir"))
          .rejects.toThrow(
            new DOMException(Msg.Mismatch, "TypeMismatchError"),
          );
      },
    );

    it<Context>(
      "should throw error if appending is failed",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const error = new Error();

        class MySet extends Set<FileSystemEntry> {
          append(_: FileSystemEntry): void {
            throw error;
          }
        }
        dir.children = new MySet();

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await expect(this.handle.getDirectoryHandle("dir", { create: true }))
          .rejects.toThrow(
            error,
          );
      },
    );

    it<Context>(
      "should return directory handle if create true",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const name = "dir";

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        const childDir = await this.handle.getDirectoryHandle(name, {
          create: true,
        });

        expect(childDir.name).toBe(name);
        expect(childDir.kind).toBe("directory");
      },
    );

    it<Context>(
      "should return directory handle if create false",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const name = "dir";
        const childDir = new DirectoryEntry(this.fileSystem);
        childDir.name = name;

        class MySet extends Set<FileSystemEntry> {
          *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
            yield childDir;
          }
        }
        dir.children = new MySet();

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        const handle = await this.handle.getDirectoryHandle(name, {
          create: false,
        });

        expect(handle.name).toBe(name);
        expect(handle.kind).toBe("directory");
      },
    );
  });

  describe("getFileHandle", () => {
    it<Context>("should throw error if name is invalid", async function () {
      await expect(this.handle.getFileHandle("")).rejects.toThrow(
        new TypeError(Msg.InvalidName),
      );
    });

    it<Context>(
      "should throw error if located entry does not exist",
      async function () {
        await expect(this.handle.getFileHandle("dir")).rejects.toThrow(
          new DOMException(Msg.NotFound, "NotFound"),
        );
      },
    );

    it<Context>(
      "should throw error if located entry does not permit",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const errorName = "DeniedError";
        dir.queryAccess = () => {
          return { permissionState: "denied", errorName };
        };
        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await expect(this.handle.getFileHandle("file.txt")).rejects.toThrow(
          new DOMException(Msg.PermissionDenied, errorName),
        );
      },
    );

    it<Context>(
      "should throw error if child exists and it is not directory",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const entry = new DirectoryEntry(this.fileSystem);
        const name = "dir";
        entry.name = name;

        class MySet extends Set<FileSystemEntry> {
          *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
            yield entry;
          }
        }
        dir.children = new MySet();

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await expect(this.handle.getFileHandle(name))
          .rejects.toThrow(
            new DOMException(Msg.Mismatch, "TypeMismatchError"),
          );
      },
    );

    it<Context>(
      "should throw error if appending is failed",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const error = new Error();

        class MySet extends Set<FileSystemEntry> {
          append(_: FileSystemEntry): void {
            throw error;
          }
        }
        dir.children = new MySet();

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await expect(this.handle.getFileHandle("dir", { create: true }))
          .rejects.toThrow(
            error,
          );
      },
    );

    it<Context>(
      "should return file handle if create true",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const name = "file.txt";

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        const childDir = await this.handle.getFileHandle(name, {
          create: true,
        });

        expect(childDir.name).toBe(name);
        expect(childDir.kind).toBe("file");
      },
    );

    it<Context>(
      "should return file handle if create false",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const name = "file.txt";
        const childFile = new FileEntry(this.fileSystem);
        childFile.name = name;

        class MySet extends Set<FileSystemEntry> {
          *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
            yield childFile;
          }
        }
        dir.children = new MySet();

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        const handle = await this.handle.getFileHandle(name, {
          create: false,
        });

        expect(handle.name).toBe(name);
        expect(handle.kind).toBe("file");
      },
    );
  });

  describe("removeEntry", () => {
    it<Context>("should throw error if name is invalid", async function () {
      await expect(this.handle.removeEntry("")).rejects.toThrow(
        new TypeError(Msg.InvalidName),
      );
    });

    it<Context>(
      "should throw error if located entry does not exist",
      async function () {
        await expect(this.handle.removeEntry("dir")).rejects.toThrow(
          new DOMException(Msg.NotFound, "NotFound"),
        );
      },
    );

    it<Context>(
      "should throw error if located entry does not permit",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const errorName = "DeniedError";
        dir.requestAccess = () => {
          return { permissionState: "denied", errorName };
        };
        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await expect(this.handle.removeEntry("file.txt")).rejects.toThrow(
          new DOMException(Msg.PermissionDenied, errorName),
        );
      },
    );

    it<Context>(
      "should throw error if child exists and it is directory what has child entry",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const entry = new DirectoryEntry(this.fileSystem);

        const name = "dir";
        entry.name = name;

        class MySet extends Set<FileSystemEntry> {
          *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
            yield entry;
          }

          get isEmpty(): boolean {
            return false;
          }
        }

        entry.children = new MySet();
        dir.children = new MySet();

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await expect(this.handle.removeEntry(name))
          .rejects.toThrow(
            new DOMException(
              Msg.InvalidModification,
              "InvalidModificationError",
            ),
          );
      },
    );

    it<Context>(
      "should throw error if removing is failed",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const file = new FileEntry(this.fileSystem);
        const name = "file.txt";
        file.name = name;

        class MyError extends Error {
          name = "custom";
        }
        const error = new MyError();

        class MySet extends Set<FileSystemEntry> {
          remove(_: FileSystemEntry): void {
            throw error;
          }
          *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
            yield file;
          }
        }
        dir.children = new MySet();

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await expect(this.handle.removeEntry(name))
          .rejects.toThrow(error);
      },
    );

    it<Context>(
      "should throw error if it does not match entry",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const name = "dir";
        dir.name = name;

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await expect(this.handle.removeEntry(name))
          .rejects.toThrow(
            new DOMException(Msg.NotFound, "NotFoundError"),
          );
      },
    );

    it<Context>(
      "should return void if success",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const file = new FileEntry(this.fileSystem);
        const name = "file.txt";
        file.name = name;

        class MySet extends Set<FileSystemEntry> {
          *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
            yield file;
          }
        }
        dir.children = new MySet();

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await expect(this.handle.removeEntry(name))
          .resolves.toBeFalsy();
      },
    );
  });

  describe("iterable", () => {
    it<Context>("should throw error if name is invalid", async function () {
      await expect(Array.fromAsync(this.handle.keys())).rejects.toThrow(
        new DOMException(Msg.NotFound, "NotFoundError"),
      );
    });

    it<Context>(
      "should throw error if located entry does not permit",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);
        const errorName = "DeniedError";
        dir.queryAccess = () => {
          return { permissionState: "denied", errorName };
        };
        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await expect(Array.fromAsync(this.handle.keys())).rejects.toThrow(
          new DOMException(Msg.PermissionDenied, errorName),
        );
      },
    );

    it<Context>(
      "should return empty array if children is empty",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await expect(Array.fromAsync(this.handle.keys())).resolves.toEqual([]);
      },
    );

    it<Context>(
      "should return 2 entries",
      async function () {
        const dir = new DirectoryEntry(this.fileSystem);

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") return dir;

          return null;
        };

        await this.handle.getDirectoryHandle("dir", { create: true });
        await this.handle.getDirectoryHandle("file.txt", { create: true });

        await expect(Array.fromAsync(this.handle.keys())).resolves.toEqual([
          "dir",
          "file.txt",
        ]);
      },
    );
  });
});
