/**
 * @see https://github.com/web-platform-tests/wpt/blob/1eaddc37a55977200ae3f983eafc1cfcb121235e/fs/FileSystemSyncAccessHandle-read-write.https.worker.js
 * @see https://github.com/web-platform-tests/wpt/blob/1eaddc37a55977200ae3f983eafc1cfcb121235e/fs/FileSystemSyncAccessHandle-truncate.https.worker.js
 */

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

  describe("flush", () => {
    it<Context>(
      "Test flush on an empty file.",
      function () {
        this.handle.flush();
      },
    );

    it<Context>(
      `SyncAccessHandle.read returns bytes written by SyncAccessHandle.write + after SyncAccessHandle.flush`,
      function () {
        const text = "Hello Storage Foundation";
        const writeBuffer = new TextEncoder().encode(text);
        this.handle.write(writeBuffer, { at: 0 });
        this.handle.flush();

        const readBuffer = new Uint8Array(text.length);
        this.handle.read(readBuffer, { at: 0 });

        expect(text).toBe(new TextDecoder().decode(readBuffer));
      },
    );
  });

  describe("read write", () => {
    it<Context>(
      `Test reading an empty file through a sync access handle.`,
      function () {
        const readBuffer = new Uint8Array(24);
        const readBytes = this.handle.read(readBuffer, { at: 0 });

        expect(0).toBe(readBytes);
      },
    );

    it<Context>(
      `Test using an empty ArrayBuffer.`,
      function () {
        const readBuffer = new ArrayBuffer(0);
        const readBytes = this.handle.read(readBuffer, { at: 0 });

        expect(0).toBe(readBytes);
      },
    );

    it<Context>(
      `Test using an ArrayBuffer.`,
      function () {
        const readBuffer = new ArrayBuffer(24);
        const readBytes = this.handle.read(readBuffer, { at: 0 });

        expect(0).toBe(readBytes);
      },
    );

    it<Context>(
      `Test writing and reading through a sync access handle.`,
      function () {
        const decoder = new TextDecoder();

        const text = "Hello Storage Foundation";
        const writeBuffer = new TextEncoder().encode(text);
        const writtenBytes = this.handle.write(writeBuffer, { at: 0 });

        expect(writeBuffer.byteLength).toBe(writtenBytes);
        let readBuffer = new Uint8Array(writtenBytes);
        let readBytes = this.handle.read(readBuffer, { at: 0 });

        expect(writtenBytes).toBe(readBytes);
        expect(text).toBe(decoder.decode(readBuffer));

        // Test a read of less bytes than available.
        const expected = "Storage";
        readBuffer = new Uint8Array(expected.length);
        readBytes = this.handle.read(readBuffer, {
          at: text.indexOf(expected),
        });
        expect(readBuffer.length).toBe(readBytes);
        const actual = decoder.decode(readBuffer);

        expect(expected).toBe(actual);
      },
    );

    it<Context>(
      `Test second write that is bigger than the first write`,
      function () {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        for (const text of ["Hello", "Longer Text"]) {
          const writeBuffer = encoder.encode(text);
          const writtenBytes = this.handle.write(writeBuffer, { at: 0 });

          expect(writeBuffer.byteLength).toBe(writtenBytes);
          const readBuffer = new Uint8Array(writtenBytes);
          const readBytes = this.handle.read(readBuffer, { at: 0 });
          expect(writtenBytes).toBe(readBytes);
          expect(text).toBe(decoder.decode(readBuffer));
        }
      },
    );

    it<Context>(
      `Test second write that is smaller than the first write`,
      function () {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        for (
          const tuple of [
            { input: "Hello World", expected: "Hello World" },
            { input: "foobar", expected: "foobarWorld" },
          ]
        ) {
          const text = tuple.input;
          const expected = tuple.expected;
          const writeBuffer = encoder.encode(text);
          const writtenBytes = this.handle.write(writeBuffer, { at: 0 });
          expect(writeBuffer.byteLength).toBe(writtenBytes);

          const readBuffer = new Uint8Array(expected.length);
          const readBytes = this.handle.read(readBuffer, { at: 0 });
          expect(expected.length).toBe(readBytes);
          expect(expected).toBe(decoder.decode(readBuffer));
        }
      },
    );

    it<Context>(
      `Test initial write with an offset`,
      function () {
        const expected = 17;
        const writeBuffer = new Uint8Array(1);
        writeBuffer[0] = expected;
        const offset = 5;
        const writtenBytes = this.handle.write(writeBuffer, { at: offset });
        expect(writeBuffer.byteLength).toBe(writtenBytes);

        const fileLength = writeBuffer.byteLength + offset;
        const readBuffer = new Uint8Array(fileLength);
        const readBytes = this.handle.read(readBuffer, { at: 0 });

        expect(fileLength).toBe(readBytes);

        for (let i = 0; i < offset; ++i) {
          expect(readBuffer[i]).toBe(0);
        }

        expect(readBuffer[offset]).toBe(expected);
      },
    );

    it<Context>(
      `Test overwriting the file at an offset`,
      function () {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        for (
          const tuple of [
            { input: "Hello World", expected: "Hello World", offset: 0 },
            { input: "foobar", expected: "Hello foobar", offset: 6 },
          ]
        ) {
          const text = tuple.input;
          const expected = tuple.expected;
          const offset = tuple.offset;
          const writeBuffer = encoder.encode(text);
          const writtenBytes = this.handle.write(writeBuffer, { at: offset });
          expect(writeBuffer.byteLength).toBe(writtenBytes);

          const readBuffer = new Uint8Array(expected.length);
          const readBytes = this.handle.read(readBuffer, { at: 0 });
          expect(expected.length).toBe(readBytes);

          const actual = decoder.decode(readBuffer);
          expect(expected).toBe(actual);
        }
      },
    );

    it<Context>(
      `Test read at an offset`,
      function () {
        const decoder = new TextDecoder();

        const text = "Hello Storage Foundation";
        const writeBuffer = new TextEncoder().encode(text);
        const writtenBytes = this.handle.write(writeBuffer, { at: 0 });
        expect(writeBuffer.byteLength).toBe(writtenBytes);

        const bufferLength = text.length;
        for (
          const tuple of [
            { offset: 0, expected: text },
            { offset: 6, expected: text.substring(6) },
          ]
        ) {
          const offset = tuple.offset;
          const expected = tuple.expected;

          const readBuffer = new Uint8Array(bufferLength);
          const readBytes = this.handle.read(readBuffer, { at: offset });
          expect(expected.length).toBe(readBytes);

          const actual = decoder.decode(readBuffer);
          expect(actual.startsWith(expected)).toBeTruthy();
        }

        const readBuffer = new Uint8Array(bufferLength);
        // Offset is greater than the file length.
        const readBytes = this.handle.read(readBuffer, {
          at: bufferLength + 1,
        });
        expect(readBytes).toBe(0);

        for (const value of readBuffer) expect(value).toBe(0);
      },
    );

    it<Context>(
      `Test read with default options`,
      function () {
        const expected = "Hello Storage Foundation";
        const writeBuffer = new TextEncoder().encode(expected);
        const writtenBytes = this.handle.write(writeBuffer, { at: 0 });
        expect(writeBuffer.byteLength).toBe(writtenBytes);

        const readBuffer = new Uint8Array(expected.length);
        // No options parameter provided, should read at offset 0.
        const readBytes = this.handle.read(readBuffer, { at: 0 });

        expect(expected.length).toBe(readBytes);
        const actual = new TextDecoder().decode(readBuffer);
        expect(expected).toBe(actual);
      },
    );

    it<Context>(
      `Test write with default options`,
      function () {
        const expected = "Hello Storage Foundation";
        const writeBuffer = new TextEncoder().encode(expected);
        // No options parameter provided, should write at offset 0.
        const writtenBytes = this.handle.write(writeBuffer);
        expect(writeBuffer.byteLength).toBe(writtenBytes);

        const readBuffer = new Uint8Array(expected.length);
        const readBytes = this.handle.read(readBuffer, { at: 0 });
        expect(expected.length).toBe(readBytes);

        const actual = new TextDecoder().decode(readBuffer);
        expect(expected).toBe(actual);
      },
    );

    it<Context>(
      `Test reading at a negative offset fails.`,
      function () {
        const readBuffer = new Uint8Array(24);
        expect(() => this.handle.read(readBuffer, { at: -1 })).toThrow(
          TypeError,
        );
      },
    );

    it<Context>(
      `Test writing at a negative offset fails.`,
      function () {
        const readBuffer = new Uint8Array(24);
        expect(() => this.handle.write(readBuffer, { at: -1 })).toThrow(
          TypeError,
        );

        const readBytes = this.handle.read(readBuffer, { at: 0 });

        expect(readBytes).toBe(0);
      },
    );

    it<Context>(
      `Test reading and writing a file using the cursor`,
      function () {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        let writeBuffer = encoder.encode("Hello ");
        let writtenBytes = this.handle.write(writeBuffer);
        writeBuffer = encoder.encode("World");
        writtenBytes += this.handle.write(writeBuffer);
        let readBuffer = new Uint8Array(256);
        let readBytes = this.handle.read(readBuffer, { at: 0 });

        expect(readBytes).toBe("Hello World".length);
        let actual = decoder.decode(readBuffer).substring(0, readBytes);
        expect(actual).toBe("Hello World");

        readBuffer = new Uint8Array(5);
        readBytes = this.handle.read(readBuffer, { at: 0 });
        expect(readBytes).toBe(5);

        actual = decoder.decode(readBuffer).substring(0, readBytes);
        expect(actual).toBe("Hello");

        readBuffer = new Uint8Array(256);
        readBytes = this.handle.read(readBuffer);
        expect(readBytes).toBe("Hello World".length - 5);

        actual = decoder.decode(readBuffer).substring(0, readBytes);
        expect(actual).toBe(" World");

        readBuffer = new Uint8Array(5);
        readBytes = this.handle.read(readBuffer, { at: 0 });
        expect(readBytes).toBe(5);

        actual = decoder.decode(readBuffer);
        expect(actual).toBe("Hello");

        writeBuffer = encoder.encode(" X");
        writtenBytes = this.handle.write(writeBuffer);
        expect(writtenBytes).toBe(2);

        readBuffer = new Uint8Array(256);
        readBytes = this.handle.read(readBuffer, { at: 0 });
        expect(readBytes).toBe("Hello Xorld".length);

        actual = decoder.decode(readBuffer).substring(0, readBytes);
        expect(actual).toBe("Hello Xorld");
      },
    );
  });

  describe("truncate", () => {
    it<Context>(
      `test SyncAccessHandle.truncate with different sizes`,
      function () {
        this.handle.truncate(4);
        expect(this.handle.getSize()).toBe(4);

        this.handle.truncate(2);
        expect(this.handle.getSize()).toBe(2);

        this.handle.truncate(7);
        expect(this.handle.getSize()).toBe(7);

        this.handle.truncate(0);
        expect(this.handle.getSize()).toBe(0);

        expect(() => this.handle.truncate(-4)).toThrow(TypeError);
      },
    );

    it<Context>(
      `test SyncAccessHandle.truncate after SyncAccessHandle.write`,
      function () {
        const writeBuffer = new Uint8Array(4);
        writeBuffer.set([96, 97, 98, 99]);
        this.handle.write(writeBuffer, { at: 0 });

        this.handle.truncate(2);
        const readBuffer = new Uint8Array(6);
        expect(this.handle.read(readBuffer, { at: 0 })).toBe(2);
        const expected = new Uint8Array(6);
        expected.set([96, 97, 0, 0, 0, 0]);
        expect(expected).toEqual(readBuffer);

        // Resize the file to 6, expect that everything beyond the old size is '0'.
        this.handle.truncate(6);
        expect(this.handle.read(readBuffer, { at: 0 })).toBe(6);
        expect(expected).toEqual(readBuffer);
      },
    );

    it<Context>(
      `Test truncate effect on cursor`,
      function () {
        const writeBuffer = new Uint8Array(4);
        writeBuffer.set([96, 97, 98, 99]);
        this.handle.write(writeBuffer, { at: 0 });

        // Moves cursor to 2
        this.handle.truncate(2);
        const readBuffer = new Uint8Array(256);
        expect(this.handle.read(readBuffer)).toBe(0);

        writeBuffer.set([100, 101, 102, 103]);
        this.handle.write(writeBuffer);

        expect(this.handle.read(readBuffer, { at: 0 })).toBe(6);

        let expected = new Uint8Array(256);
        expected.set([96, 97, 100, 101, 102, 103]);
        expect(readBuffer).toEqual(expected);

        // Resize the file to 10, expect that everything beyond the old size is '0'.
        this.handle.truncate(10); // file cursor should still be at 6
        // overwrite two bytes
        const writeBuffer2 = new Uint8Array(2);
        writeBuffer2.set([110, 111]);
        this.handle.write(writeBuffer2);
        expected = new Uint8Array(256);
        expected.set([96, 97, 100, 101, 102, 103, 110, 111, 0, 0]);
        expect(this.handle.read(readBuffer, { at: 0 })).toBe(10);
        expect(readBuffer).toEqual(expected);
      },
    );
  });
});
