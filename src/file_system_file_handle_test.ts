import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { List, Set } from "@miyauci/infra";
import {
  createNewFileSystemFileHandle,
  FileSystemFileHandle,
} from "./file_system_file_handle.ts";
import { runFileSystemFileHandleTest } from "@test/file_system_file_handle.ts";
import { VirtualFileSystem } from "@test/util.ts";
import type {
  FileSystem as IFileSystem,
  FileSystemObservation,
  FileSystemPath,
} from "./file_system.ts";
import type {
  DirectoryEntry,
  FileEntry as IFileEntry,
  FileSystemAccessResult,
  FileSystemEntry,
} from "./file_system_entry.ts";
import { Msg } from "./constant.ts";

runFileSystemFileHandleTest(async () => {
  const fs = new VirtualFileSystem();
  const root = await fs.getDirectory();

  return {
    root,
  };
});

class FileSystem implements IFileSystem {
  getPath(entry: FileSystemEntry) {
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
  root: string = "";
  observations: Set<FileSystemObservation> = new Set();
}

class FileEntry implements IFileEntry {
  constructor(public fileSystem: FileSystem) {}
  name: string = "";
  queryAccess(_: "read" | "readwrite"): FileSystemAccessResult {
    return { errorName: "", permissionState: "granted" };
  }

  requestAccess(_: "read" | "readwrite"): FileSystemAccessResult {
    return { errorName: "", permissionState: "granted" };
  }

  parent: DirectoryEntry | null = null;

  modificationTimestamp: number = Date.now();
  lock: "open" | "taken-exclusive" | "taken-shared" = "open";
  sharedLockCount: number = 0;
  binaryData: Uint8Array = new Uint8Array();
}

describe("FileSystemFileHandle", () => {
  interface Context {
    fileSystem: FileSystem;
    fileEntry: FileEntry;
  }
  beforeEach<Context>(function () {
    this.fileSystem = new FileSystem();
    this.fileEntry = new FileEntry(this.fileSystem);
  });

  describe("constructor", () => {
    it("should not construct", () => {
      // @ts-ignore it should not construct
      new FileSystemFileHandle();
    });
  });

  describe("getFile", () => {
    it<Context>(
      "should throw error if located entry does not permit",
      async function () {
        const errorName = "DENIED";
        this.fileEntry.queryAccess = () => {
          return { errorName, permissionState: "denied" };
        };

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "file.txt") {
            return this.fileEntry;
          }

          return null;
        };

        const handle = createNewFileSystemFileHandle(
          this.fileSystem,
          new List(["file.txt"]),
        );

        await expect(handle.getFile()).rejects.toThrow(
          new DOMException(Msg.PermissionDenied, errorName),
        );
      },
    );

    it<Context>(
      "should throw error if located entry does not exist",
      async function () {
        const handle = createNewFileSystemFileHandle(
          this.fileSystem,
          new List(["file.txt"]),
        );

        await expect(handle.getFile()).rejects.toThrow(
          new DOMException(Msg.NotFound, "NotFoundError"),
        );
      },
    );

    it<Context>(
      "should return File",
      async function () {
        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "file.txt") {
            return this.fileEntry;
          }

          return null;
        };

        const handle = createNewFileSystemFileHandle(
          this.fileSystem,
          new List(["file.txt"]),
        );

        await expect(handle.getFile()).resolves.toBeTruthy();
      },
    );
  });

  describe("createWritable", () => {
    it<Context>(
      "should throw error if located entry does not permit",
      async function () {
        const errorName = "DENIED";
        this.fileEntry.requestAccess = () => {
          return { errorName, permissionState: "denied" };
        };

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "file.txt") {
            return this.fileEntry;
          }

          return null;
        };

        const handle = createNewFileSystemFileHandle(
          this.fileSystem,
          new List(["file.txt"]),
        );

        await expect(handle.createWritable()).rejects.toThrow(
          new DOMException(Msg.PermissionDenied, errorName),
        );
      },
    );

    it<Context>(
      "should throw error if located entry is already taken exclusive",
      async function () {
        this.fileEntry.lock = "taken-exclusive";

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 2 && path[0] === "" && path[1] === "file.txt") {
            return this.fileEntry;
          }

          return null;
        };

        const handle = createNewFileSystemFileHandle(
          this.fileSystem,
          new List(["", "file.txt"]),
        );

        await expect(handle.createWritable()).rejects.toThrow(
          new DOMException(
            Msg.NoModificationAllowed,
            "NoModificationAllowedError",
          ),
        );
      },
    );
  });

  describe("createSyncAccessHandle", () => {
    it<Context>(
      "should throw error if located entry does not exist",
      async function () {
        const handle = createNewFileSystemFileHandle(
          this.fileSystem,
          new List(["file.txt"]),
        );

        await expect(handle.createSyncAccessHandle()).rejects.toThrow(
          DOMException,
        );
      },
    );

    it<Context>(
      "should throw error if located entry does not permit",
      async function () {
        const errorName = "DENIED";
        this.fileEntry.requestAccess = () => {
          return { errorName, permissionState: "denied" };
        };

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "file.txt") {
            return this.fileEntry;
          }

          return null;
        };

        const handle = createNewFileSystemFileHandle(
          this.fileSystem,
          new List(["file.txt"]),
        );

        await expect(handle.createSyncAccessHandle()).rejects.toThrow(
          new DOMException(Msg.PermissionDenied, errorName),
        );
      },
    );

    it<Context>(
      "should throw error if located entry is already taken shared",
      async function () {
        this.fileEntry.lock = "taken-shared";
        this.fileEntry.sharedLockCount = 1;

        this.fileSystem.locateEntry = (path) => {
          if (path.size === 2 && path[0] === "" && path[1] === "file.txt") {
            return this.fileEntry;
          }

          return null;
        };

        const handle = createNewFileSystemFileHandle(
          this.fileSystem,
          new List(["", "file.txt"]),
        );

        await expect(handle.createSyncAccessHandle()).rejects.toThrow(
          new DOMException(
            Msg.NoModificationAllowed,
            "NoModificationAllowedError",
          ),
        );
      },
    );

    it<Context>("should return FileSystemSyncAccessHandle", async function () {
      this.fileSystem.locateEntry = (path) => {
        if (path.size === 2 && path[0] === "" && path[1] === "file.txt") {
          return this.fileEntry;
        }

        return null;
      };

      const handle = createNewFileSystemFileHandle(
        this.fileSystem,
        new List(["", "file.txt"]),
      );

      await expect(handle.createSyncAccessHandle()).resolves.toBeTruthy();
    });
  });
});
