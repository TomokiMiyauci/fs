import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import {
  createNewFileSystemSyncAccessHandle,
  FileSystemSyncAccessHandle,
} from "./file_system_sync_access_handle.ts";
import { FileEntry, FileSystem } from "@test/helper.ts";
import { Msg } from "./constant.ts";

interface Context {
  fileSystem: FileSystem;
  fileEntry: FileEntry;
  handle: FileSystemSyncAccessHandle;
}

describe("FileSystemSyncAccessHandle", () => {
  beforeEach<Context>(function () {
    this.fileSystem = new FileSystem();
    this.fileEntry = new FileEntry(this.fileSystem);
    this.handle = createNewFileSystemSyncAccessHandle(this.fileEntry);
  });

  describe("constructor", () => {
    it("should not construct", () => {
      // @ts-expect-error it should not construct
      new FileSystemSyncAccessHandle();
    });
  });

  describe("read", () => {
    it<Context>("should throw error if state is not 'open'", function () {
      this.handle["state"] = "close";

      const u8 = new Uint8Array();
      expect(() => this.handle.read(u8)).toThrow(
        new DOMException(Msg.AlreadyClosed, "InvalidStateError"),
      );
    });

    it<Context>("should return 0 if error has occurred", function () {
      const u8 = new Uint8Array();

      Object.defineProperty(this.fileEntry, "binaryData", {
        get() {
          throw new Error();
        },
      });

      expect(this.handle.read(u8)).toBe(0);
    });
  });

  describe("write", () => {
    it<Context>("should throw error if state is not 'open'", function () {
      this.handle["state"] = "close";

      const u8 = new Uint8Array();
      expect(() => this.handle.write(u8)).toThrow(
        new DOMException(Msg.AlreadyClosed, "InvalidStateError"),
      );
    });

    it<Context>("should throw error if error has occurred", function () {
      const u8 = new Uint8Array();

      Object.defineProperty(this.fileEntry, "binaryData", {
        set() {
          throw new Error();
        },
        get() {
          return new Uint8Array();
        },
      });

      expect(() => this.handle.write(u8)).toThrow(
        new DOMException(Msg.InvalidOperation, "InvalidStateError"),
      );
    });

    it<Context>("should write with ArrayBuffer", function () {
      const buffer = new ArrayBuffer(5);

      expect(this.handle.write(buffer)).toBe(5);
      expect(this.fileEntry.binaryData.byteLength).toBe(5);
    });
  });

  describe("truncate", () => {
    it<Context>("should throw error if state is not 'open'", function () {
      this.handle["state"] = "close";

      expect(() => this.handle.truncate(0)).toThrow(
        new DOMException(Msg.AlreadyClosed, "InvalidStateError"),
      );
    });

    it<Context>("should throw error if error has occurred", function () {
      Object.defineProperty(this.fileEntry, "binaryData", {
        set() {
          throw new Error();
        },
        get() {
          return new Uint8Array(2);
        },
      });

      expect(() => this.handle.truncate(1)).toThrow(
        new DOMException(Msg.InvalidOperation, "InvalidStateError"),
      );
    });

    it<Context>("should throw error if error has occurred 2", function () {
      Object.defineProperty(this.fileEntry, "binaryData", {
        set() {
          throw new Error();
        },
        get() {
          return new Uint8Array(2);
        },
      });

      expect(() => this.handle.truncate(3)).toThrow(
        new DOMException(Msg.InvalidOperation, "InvalidStateError"),
      );
    });
  });

  describe("getSize", () => {
    it<Context>("should throw error if state is not 'open'", function () {
      this.handle["state"] = "close";

      expect(() => this.handle.getSize()).toThrow(
        new DOMException(Msg.AlreadyClosed, "InvalidStateError"),
      );
    });

    it<Context>("should return 0", function () {
      expect(this.handle.getSize()).toBe(0);
    });
  });
});
