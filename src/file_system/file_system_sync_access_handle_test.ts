import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { createEmptyFile } from "@test";
import { FileSystemDirectoryHandle } from "./file_system_directory_handle.ts";
import { define } from "./helper.ts";

interface Context {
  root: FileSystemDirectoryHandle;
}

describe("FileSystemSyncAccessHandle", () => {
  beforeEach<Context>(function () {
    this.root = new FileSystemDirectoryHandle(
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
  });

  describe("getSize", () => {
    it<Context>(
      "test SyncAccessHandle.getSize after SyncAccessHandle.write",
      async function () {
        const handle = await createEmptyFile(this.root, "file.txt");
        const writer = await handle.createSyncAccessHandle();

        expect(writer.getSize()).toBe(0);

        const bufferSize = 4;
        const writeBuffer = new Uint8Array(bufferSize);
        writeBuffer.set([96, 97, 98, 99]);

        writer.write(writeBuffer, { at: 0 });

        expect(writer.getSize()).toBe(bufferSize);

        let offset = 3;
        writer.write(writeBuffer, { at: offset });
        expect(writer.getSize()).toBe(bufferSize + offset);

        offset = 10;
        writer.write(writeBuffer, { at: offset });
        expect(writer.getSize()).toBe(bufferSize + offset);
      },
    );
  });
});
