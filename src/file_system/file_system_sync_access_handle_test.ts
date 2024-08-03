import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { FileSystemSyncAccessHandle } from "./file_system_sync_access_handle.ts";
import { FileSystemDirectoryHandle } from "./file_system_directory_handle.ts";
import { define } from "./helper.ts";

interface Context {
  handle: FileSystemSyncAccessHandle;
}

describe("FileSystemSyncAccessHandle", () => {
  beforeEach<Context>(async function () {
    const root = new FileSystemDirectoryHandle(
      { kind: "directory", path: [""], root: "" },
      define({
        getBinaryData() {
          return new Uint8Array();
        },
        getChildren() {
          return [];
        },
        getModificationTimestamp() {
          return Date.now();
        },
        queryAccess() {
          return { permissionState: "granted", errorName: "" };
        },
        requestAccess() {
          return { permissionState: "granted", errorName: "" };
        },
      }),
    );

    const handle = await root.getFileHandle("file.txt", { create: true });

    this.handle = await handle.createSyncAccessHandle();
  });

  describe("getSize", () => {
    it<Context>(
      "test SyncAccessHandle.getSize after SyncAccessHandle.write",
      function () {
        expect(this.handle.getSize()).toBe(0);

        const bufferSize = 4;
        const writeBuffer = new Uint8Array(bufferSize);
        writeBuffer.set([96, 97, 98, 99]);

        this.handle.write(writeBuffer, { at: 0 });

        expect(this.handle.getSize()).toBe(bufferSize);

        let offset = 3;
        this.handle.write(writeBuffer, { at: offset });
        expect(this.handle.getSize()).toBe(bufferSize + offset);

        offset = 10;
        this.handle.write(writeBuffer, { at: offset });
        expect(this.handle.getSize()).toBe(bufferSize + offset);
      },
    );
  });

  describe("close", () => {
    it<Context>(
      "SyncAccessHandle.close is idempotent",
      function () {
        expect(this.handle.close()).toBe(undefined);
        expect(this.handle.close()).toBe(undefined);
      },
    );

    it<Context>(
      "SyncAccessHandle.read fails after SyncAccessHandle.close",
      function () {
        expect(this.handle.close()).toBe(undefined);

        const readBuffer = new Uint8Array(4);

        expect(() => this.handle.read(readBuffer, { at: 0 })).toThrow(
          DOMException,
        );
      },
    );

    it<Context>(
      "SyncAccessHandle.write fails after SyncAccessHandle.close",
      function () {
        expect(this.handle.close()).toBe(undefined);
        const writeBuffer = new Uint8Array(4);
        writeBuffer.set([96, 97, 98, 99]);

        expect(() => this.handle.write(writeBuffer, { at: 0 })).toThrow(
          DOMException,
        );
      },
    );

    it<Context>(
      "SyncAccessHandle.flush fails after SyncAccessHandle.close",
      function () {
        expect(this.handle.close()).toBe(undefined);

        expect(() => this.handle.flush()).toThrow(
          DOMException,
        );
      },
    );

    it<Context>(
      "SyncAccessHandle.getSize fails after SyncAccessHandle.close",
      function () {
        expect(this.handle.close()).toBe(undefined);

        expect(() => this.handle.getSize()).toThrow(
          DOMException,
        );
      },
    );

    it<Context>(
      "SyncAccessHandle.truncate fails after SyncAccessHandle.handle.close",
      function () {
        expect(this.handle.close()).toBe(undefined);

        expect(() => this.handle.truncate(4)).toThrow(
          DOMException,
        );
      },
    );
  });
});
