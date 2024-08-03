import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";
// import { FileSystemFileHandle } from "./file_system_writable_file_stream.ts";
import { FileSystemDirectoryHandle } from "./file_system_directory_handle.ts";
import { define } from "./helper.ts";
import {
  createDirectory,
  createEmptyFile,
  createFileWithContents,
  getFileSize,
} from "@test";
import { getFileContents } from "@test";

interface Context {
  root: FileSystemDirectoryHandle;
}

const definition = define({
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
    return { permissionState: "granted", errorName: "" } as const;
  },
  requestAccess() {
    return { permissionState: "granted", errorName: "" } as const;
  },
});

describe("FileSystemWritableFileStream", () => {
  beforeEach<Context>(function () {
    this.root = new FileSystemDirectoryHandle(
      { kind: "directory", path: [""], root: "" },
      definition,
    );
  });

  describe("integration", () => {
    it<Context>(
      "truncate() to shrink a file",
      async function () {
        const handle = await createEmptyFile(this.root, "trunc_shrink");
        const stream = await handle.createWritable();

        await stream.write("1234567890");
        await stream.truncate(5);
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("12345");
        await expect(getFileSize(handle)).resolves.toBe(5);
      },
    );

    it<Context>(
      "truncate() to grow a file",
      async function () {
        const handle = await createEmptyFile(this.root, "trunc_grow");
        const stream = await handle.createWritable();

        await stream.write("abc");
        await stream.truncate(5);
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("abc\0\0");
        await expect(getFileSize(handle)).resolves.toBe(5);
      },
    );

    // TODO
    it<Context>(
      "createWritable() fails when parent directory is removed",
      { ignore: true },
      async function () {
        const dir = await createDirectory(this.root, "parent_dir");
        const file_name = "create_writable_fails_when_dir_removed.txt";
        const handle = await createEmptyFile(dir, file_name);

        await this.root.removeEntry("parent_dir", { recursive: true });

        await expect(handle.createWritable()).rejects.toThrow();
      },
    );

    it<Context>(
      "createWritable({keepExistingData: true}): atomic writable file stream initialized with source contents",
      async function () {
        const handle = await createFileWithContents(
          this.root,
          "atomic_file_is_copied.txt",
          "fooks",
        );
        const stream = await handle.createWritable({ keepExistingData: true });

        await stream.write("bar");
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("barks");
        await expect(getFileSize(handle)).resolves.toBe(5);
      },
    );

    it<Context>(
      "createWritable({keepExistingData: false}): atomic writable file stream initialized with empty file",
      async function () {
        const handle = await createFileWithContents(
          this.root,
          "atomic_file_is_not_copied.txt",
          "very long string",
        );
        const stream = await handle.createWritable({ keepExistingData: false });

        await stream.write("bar");
        await expect(getFileContents(handle)).resolves.toBe("very long string");
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("bar");
        await expect(getFileSize(handle)).resolves.toBe(3);
      },
    );

    it<Context>(
      "cursor position: truncate size > offset",
      async function () {
        const handle = await createFileWithContents(
          this.root,
          "trunc_smaller_offset.txt",
          "1234567890",
        );
        const stream = await handle.createWritable({ keepExistingData: true });

        await stream.truncate(5);
        await stream.write("abc");
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("abc45");
        await expect(getFileSize(handle)).resolves.toBe(5);
      },
    );

    it<Context>(
      "commands are queued, stream is unlocked after each operation",
      async function () {
        const handle = await createEmptyFile(this.root, "contents");
        const stream = await handle.createWritable();

        expect(stream.locked).toBeFalsy();

        stream.write("abc");
        expect(stream.locked).toBeFalsy();
        stream.write("def");
        expect(stream.locked).toBeFalsy();
        stream.truncate(9);
        expect(stream.locked).toBeFalsy();
        stream.seek(0);
        expect(stream.locked).toBeFalsy();
        stream.write("xyz");
        expect(stream.locked).toBeFalsy();

        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("xyzdef\0\0\0");
        await expect(getFileSize(handle)).resolves.toBe(9);
      },
    );
  });
});
