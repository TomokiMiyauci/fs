import { List, Set } from "@miyauci/infra";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import type {
  DirectoryEntry as IDirectoryEntry,
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

  children: Set<FileSystemEntry> = new Set();

  requestAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }

  queryAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
}

describe("FileSystemDirectoryHandle", () => {
  describe("constructor", () => {
    it("should not construct", () => {
      // @ts-expect-error it should not construct
      new FileSystemDirectoryHandle();
    });
  });

  describe("getDirectoryHandle", () => {
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
  });
});
