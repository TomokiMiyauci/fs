import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { List } from "@miyauci/infra";
import {
  createNewFileSystemFileHandle,
  FileSystemFileHandle,
} from "./file_system_file_handle.ts";
import { runFileSystemFileHandleTest } from "@test/file_system_file_handle.ts";
import { VirtualFileSystem } from "@test/util.ts";
import { FileEntry, FileSystem } from "@test/helper.ts";
import { Msg } from "./constant.ts";

runFileSystemFileHandleTest(async () => {
  const fs = new VirtualFileSystem();
  const root = await fs.getDirectory();

  return {
    root,
  };
});

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
      "should throw error if located entry does not exist",
      async function () {
        const handle = createNewFileSystemFileHandle(
          this.fileSystem,
          new List(["file.txt"]),
        );

        await expect(handle.createWritable()).rejects.toThrow(
          new DOMException(Msg.NotFound, "NotFoundError"),
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
          new List(["", "file.txt"]),
        );

        await expect(handle.createSyncAccessHandle()).rejects.toThrow(
          new DOMException(Msg.NotFound, "NotFoundError"),
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
