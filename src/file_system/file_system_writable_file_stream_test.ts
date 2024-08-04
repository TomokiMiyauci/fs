/**
 * @see https://github.com/web-platform-tests/wpt/blob/master/fs/script-tests/FileSystemWritableFileStream.js
 * @see https://github.com/web-platform-tests/wpt/blob/master/fs/script-tests/FileSystemWritableFileStream-write.js
 */

import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { FileSystemDirectoryHandle } from "./file_system_directory_handle.ts";
import {
  createDirectory,
  createEmptyFile,
  createFileWithContents,
  getDirectory,
  getFileSize,
} from "@test";
import { getFileContents } from "@test";

interface Context {
  root: FileSystemDirectoryHandle;
}

describe("FileSystemWritableFileStream", () => {
  beforeEach<Context>(function () {
    this.root = getDirectory();
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

    it<Context>(
      "createWritable() fails when parent directory is removed",
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

  describe("write", () => {
    it<Context>(
      "write() with an empty blob to an empty file",
      async function () {
        const handle = await createEmptyFile(this.root, "empty_blob");
        const stream = await handle.createWritable();

        await stream.write(new Blob([]));
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("");
        await expect(getFileSize(handle)).resolves.toBe(0);
      },
    );

    it<Context>(
      "write() a blob to an empty file",
      async function () {
        const handle = await createEmptyFile(this.root, "valid_blob");
        const stream = await handle.createWritable();

        await stream.write(new Blob(["1234567890"]));
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("1234567890");
        await expect(getFileSize(handle)).resolves.toBe(10);
      },
    );

    it<Context>(
      "write() with WriteParams without position to an empty file",
      async function () {
        const handle = await createEmptyFile(this.root, "write_param_empty");
        const stream = await handle.createWritable();

        await stream.write({ type: "write", data: "1234567890" });
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("1234567890");
        await expect(getFileSize(handle)).resolves.toBe(10);
      },
    );

    it<Context>(
      "write() a string to an empty file with zero offset",
      async function () {
        const handle = await createEmptyFile(this.root, "string_zero_offset");
        const stream = await handle.createWritable();

        await stream.write({ type: "write", position: 0, data: "1234567890" });
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("1234567890");
        await expect(getFileSize(handle)).resolves.toBe(10);
      },
    );

    it<Context>(
      "write() a blob to an empty file with zero offset",
      async function () {
        const handle = await createEmptyFile(this.root, "blob_zero_offset");
        const stream = await handle.createWritable();

        await stream.write({
          type: "write",
          position: 0,
          data: new Blob(["1234567890"]),
        });
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("1234567890");
        await expect(getFileSize(handle)).resolves.toBe(10);
      },
    );

    it<Context>(
      "write() called consecutively appends",
      async function () {
        const handle = await createEmptyFile(this.root, "write_appends");
        const stream = await handle.createWritable();

        await stream.write("12345");
        await stream.write("67890");
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("1234567890");
        await expect(getFileSize(handle)).resolves.toBe(10);
      },
    );

    it<Context>(
      "write() WriteParams without position and string appends",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "write_appends_object_string",
        );
        const stream = await handle.createWritable();

        await stream.write("12345");
        await stream.write({ type: "write", data: "67890" });
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("1234567890");
        await expect(getFileSize(handle)).resolves.toBe(10);
      },
    );

    it<Context>(
      "write() WriteParams without position and blob appends",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "write_appends_object_blob",
        );
        const stream = await handle.createWritable();

        await stream.write("12345");
        await stream.write({ type: "write", data: new Blob(["67890"]) });
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("1234567890");
        await expect(getFileSize(handle)).resolves.toBe(10);
      },
    );

    it<Context>(
      "write() called with a string and a valid offset",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "string_with_offset",
        );
        const stream = await handle.createWritable();

        await stream.write("1234567890");
        await stream.write({ type: "write", position: 4, data: "abc" });
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("1234abc890");
        await expect(getFileSize(handle)).resolves.toBe(10);
      },
    );

    it<Context>(
      "write() called with a string and a valid offset after seek",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "write_string_with_offset_after_seek",
        );
        const stream = await handle.createWritable();

        await stream.write("1234567890");
        await stream.write({ type: "seek", position: 0 });
        await stream.write({ type: "write", position: 4, data: "abc" });
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("1234abc890");
        await expect(getFileSize(handle)).resolves.toBe(10);
      },
    );

    it<Context>(
      "write() called with a blob and a valid offset",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "blob_with_offset",
        );
        const stream = await handle.createWritable();

        await stream.write("1234567890");
        await stream.write({
          type: "write",
          position: 4,
          data: new Blob(["abc"]),
        });
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("1234abc890");
        await expect(getFileSize(handle)).resolves.toBe(10);
      },
    );

    it<Context>(
      "write() called with an offset beyond the end of the file",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "bad_offset",
        );
        const stream = await handle.createWritable();

        await stream.write({
          type: "write",
          position: 4,
          data: new Blob(["abc"]),
        });
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("\0\0\0\0abc");
        await expect(getFileSize(handle)).resolves.toBe(7);
      },
    );

    it<Context>(
      "write() with an empty string to an empty file",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "empty_string",
        );
        const stream = await handle.createWritable();

        await stream.write("");
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("");
        await expect(getFileSize(handle)).resolves.toBe(0);
      },
    );

    it<Context>(
      "write() with a valid utf-8 string",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "valid_utf8_string",
        );
        const stream = await handle.createWritable();

        await stream.write("foo🤘");
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("foo🤘");
        await expect(getFileSize(handle)).resolves.toBe(7);
      },
    );

    it<Context>(
      "write() with a string with unix line ending preserved",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "string_with_unix_line_ending",
        );
        const stream = await handle.createWritable();

        await stream.write("foo\n");
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("foo\n");
        await expect(getFileSize(handle)).resolves.toBe(4);
      },
    );

    it<Context>(
      "write() with a string with windows line ending preserved",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "string_with_windows_line_ending",
        );
        const stream = await handle.createWritable();

        await stream.write("foo\r\n");
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("foo\r\n");
        await expect(getFileSize(handle)).resolves.toBe(5);
      },
    );

    it<Context>(
      "write() with an empty array buffer to an empty file",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "empty_array_buffer",
        );
        const stream = await handle.createWritable();
        const buf = new ArrayBuffer(0);
        await stream.write(buf);
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("");
        await expect(getFileSize(handle)).resolves.toBe(0);
      },
    );

    it<Context>(
      "write() with an empty array buffer to an empty file",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "valid_string_typed_byte_array",
        );
        const stream = await handle.createWritable();
        const buf = new ArrayBuffer(3);
        const intView = new Uint8Array(buf);
        intView[0] = 0x66;
        intView[1] = 0x6f;
        intView[2] = 0x6f;
        await stream.write(buf);
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("foo");
        await expect(getFileSize(handle)).resolves.toBe(3);
      },
    );

    it<Context>(
      "atomic writes: writable file streams make atomic changes on close",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "atomic_writes.txt",
        );
        const stream = await handle.createWritable();

        await stream.write("foox");

        const stream2 = await handle.createWritable();
        await stream2.write("bar");

        await stream2.close();

        await expect(getFileContents(handle)).resolves.toBe("bar");
        await expect(getFileSize(handle)).resolves.toBe(3);

        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("foox");
        await expect(getFileSize(handle)).resolves.toBe(4);
      },
    );

    it<Context>(
      "atomic writes: write() after close() fails",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "atomic_write_after_close.txt",
        );
        const stream = await handle.createWritable();

        await stream.write("foo");
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("foo");
        await expect(getFileSize(handle)).resolves.toBe(3);

        await expect(stream.write("abc")).rejects.toThrow(TypeError);
      },
    );

    it<Context>(
      "atomic writes: truncate() after close() fails",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "atomic_truncate_after_close.txt",
        );
        const stream = await handle.createWritable();

        await stream.write("foo");
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("foo");
        await expect(getFileSize(handle)).resolves.toBe(3);

        await expect(stream.truncate(0)).rejects.toThrow(TypeError);
      },
    );

    it<Context>(
      "atomic writes: close() after close() fails",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "atomic_close_after_close.txt",
        );
        const stream = await handle.createWritable();

        await stream.write("foo");
        await stream.close();

        await expect(getFileContents(handle)).resolves.toBe("foo");
        await expect(getFileSize(handle)).resolves.toBe(3);

        await expect(stream.close()).rejects.toThrow(TypeError);
      },
    );

    it<Context>(
      "atomic writes: only one close() operation may succeed",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "there_can_be_only_one.txt",
        );
        const stream = await handle.createWritable();

        await stream.write("foo");

        const success_promises = [...Array(100)].map(() =>
          stream.close().then(() => 1).catch(() => 0)
        );
        const close_attempts = await Promise.all(success_promises);
        const success_count = close_attempts.reduce((x, y) => x + y);

        expect(success_count).toBe(1);
      },
    );

    it<Context>(
      "getWriter() can be used",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "writer_written",
        );
        const stream = await handle.createWritable();

        expect(stream.locked).toBeFalsy();
        const writer = stream.getWriter();
        expect(stream.locked).toBeTruthy();

        await writer.write("foo");
        await writer.write(new Blob(["bar"]));
        await writer.write({ type: "seek", position: 0 });
        await writer.write({ type: "write", data: "baz" });
        await writer.close();

        await expect(getFileContents(handle)).resolves.toBe("bazbar");
        await expect(getFileSize(handle)).resolves.toBe(6);
      },
    );

    it<Context>(
      "WriteParams: truncate missing size param",
      async function () {
        const handle = await createFileWithContents(
          this.root,
          "content.txt",
          "very long string",
        );
        const stream = await handle.createWritable();

        await expect(stream.write({ type: "truncate" })).rejects.toThrow(
          TypeError,
        );
      },
    );

    it<Context>(
      "WriteParams: write missing data param",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "content.txt",
        );
        const stream = await handle.createWritable();

        await expect(stream.write({ type: "write" })).rejects.toThrow(
          TypeError,
        );
      },
    );

    it<Context>(
      "WriteParams: write null data param",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "content.txt",
        );
        const stream = await handle.createWritable();

        await expect(stream.write({ type: "write", data: null })).rejects
          .toThrow(
            TypeError,
          );
      },
    );

    it<Context>(
      "WriteParams: seek missing position param",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "content.txt",
        );
        const stream = await handle.createWritable();

        await expect(stream.write({ type: "seek" })).rejects
          .toThrow(
            TypeError,
          );
      },
    );

    // not match specification
    it<Context>(
      "write() with an invalid blob to an empty file should reject",
      { ignore: true },
      async function () {
        const source_file = await createFileWithContents(
          this.root,
          "content.txt",
          "source data",
        );
        const source_blob = await source_file.getFile();
        await this.root.removeEntry(source_file.name);

        const handle = await createEmptyFile(this.root, "invalid_blob_test");
        const stream = await handle.createWritable();

        // The specification does not raise NotFoundError on write and writeChunk calls.
        await expect(stream.write(source_blob)).rejects.toThrow(DOMException);
        await expect(stream.close()).rejects.toThrow(TypeError);

        await expect(getFileContents(handle)).resolves.toBe("bazbar");
        await expect(getFileSize(handle)).resolves.toBe(6);
      },
    );

    // TODO: mode
    // it<Context>(
    //   "an errored writable stream releases its lock",
    //   async function () {
    //     const handle = await createFileWithContents(
    //       this.root,
    //       "file.txt",
    //       "contents",
    //     );
    //     const stream = await handle.createWritable({ mode: "exclusive" });

    //     await stream.write("12345");

    //     await expect(stream.write({ type: "write", data: null })).rejects
    //       .toThrow(TypeError);

    //     await expect(getFileContents(handle)).resolves.toBe("contents");

    //     // The file's lock was released.
    //     const newStream = await handle.createWritable({ mode: "exclusive" });
    //     await newStream.close();
    //   },
    // );

    // TODO: mode
    // it<Context>(
    //   "an errored writable stream should reject the next write call",
    //   async function () {
    //     const handle = await createFileWithContents(
    //       this.root,
    //       "file.txt",
    //       "contents",
    //     );
    //     const stream = await handle.createWritable({ mode: "exclusive" });
    //     const writer = stream.getWriter();

    //     await stream.write("12345");

    //     await expect(writer.write("foo")).rejects
    //       .toThrow(TypeError);
    //   },
    // );
  });

  describe("piped", () => {
    it<Context>("can be piped to with a string", async function () {
      const handle = await createEmptyFile(this.root, "foo_string.txt");
      const wfs = await handle.createWritable();

      const rs = new ReadableStream({
        start(controller) {
          controller.enqueue("foo_string");
          controller.close();
        },
      });

      await rs.pipeTo(wfs, { preventCancel: true });

      await expect(getFileContents(handle)).resolves.toBe("foo_string");
      await expect(getFileSize(handle)).resolves.toBe(10);
    });

    it<Context>("can be piped to with an ArrayBuffer", async function () {
      const handle = await createEmptyFile(this.root, "foo_arraybuf.txt");
      const wfs = await handle.createWritable();
      const buf = new ArrayBuffer(3);
      const intView = new Uint8Array(buf);
      intView[0] = 0x66;
      intView[1] = 0x6f;
      intView[2] = 0x6f;

      const rs = new ReadableStream({
        start(controller) {
          controller.enqueue(buf);
          controller.close();
        },
      });

      await rs.pipeTo(wfs, { preventCancel: true });

      await expect(getFileContents(handle)).resolves.toBe("foo");
      await expect(getFileSize(handle)).resolves.toBe(3);
    });

    it<Context>("can be piped to with a Blob", async function () {
      const handle = await createEmptyFile(this.root, "foo_blob.txt");
      const wfs = await handle.createWritable();

      const rs = new ReadableStream({
        start(controller) {
          controller.enqueue(new Blob(["foo"]));
          controller.close();
        },
      });

      await rs.pipeTo(wfs, { preventCancel: true });

      await expect(getFileContents(handle)).resolves.toBe("foo");
      await expect(getFileSize(handle)).resolves.toBe(3);
    });

    it<Context>(
      "can be piped to with a param object with write command",
      async function () {
        const handle = await createEmptyFile(this.root, "foo_write_param.txt");
        const wfs = await handle.createWritable();

        const rs = new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "write", data: "foobar" });
            controller.close();
          },
        });

        await rs.pipeTo(wfs, { preventCancel: true });

        await expect(getFileContents(handle)).resolves.toBe("foobar");
        await expect(getFileSize(handle)).resolves.toBe(6);
      },
    );

    it<Context>(
      "can be piped to with a param object with multiple commands",
      async function () {
        const handle = await createEmptyFile(this.root, "foo_write_param.txt");
        const wfs = await handle.createWritable();

        const rs = new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "write", data: "foobar" });
            controller.enqueue({ type: "truncate", size: 10 });
            controller.enqueue({ type: "write", position: 0, data: "baz" });
            controller.close();
          },
        });

        await rs.pipeTo(wfs, { preventCancel: true });

        await expect(getFileContents(handle)).resolves.toBe("bazbar\0\0\0\0");
        await expect(getFileSize(handle)).resolves.toBe(10);
      },
    );

    it<Context>(
      "multiple operations can be queued",
      async function () {
        const handle = await createEmptyFile(this.root, "foo_write_queued.txt");
        const wfs = await handle.createWritable();

        const rs = new ReadableStream({
          start(controller) {
            controller.enqueue("foo");
            controller.enqueue("bar");
            controller.enqueue("baz");
            controller.close();
          },
        });

        await rs.pipeTo(wfs, { preventCancel: true });

        await expect(getFileContents(handle)).resolves.toBe("foobarbaz");
        await expect(getFileSize(handle)).resolves.toBe(9);
      },
    );

    // TODO:(miyauci) Possible bug in Deno's WritableStream
    it<Context>(
      "plays well with fetch",
      { ignore: true },
      async function () {
        const handle = await createEmptyFile(this.root, "fetched.txt");
        const wfs = await handle.createWritable();

        const response = await fetch("data:text/plain,fetched from far");
        const body = response.body!;

        await body.pipeTo(wfs, { preventCancel: true });

        await expect(getFileContents(handle)).resolves.toBe("fetched from far");
        await expect(getFileSize(handle)).resolves.toBe(16);
      },
    );

    it<Context>(
      "abort() aborts write",
      async function () {
        const handle = await createEmptyFile(
          this.root,
          "aborted should_be_empty.txt",
        );
        const wfs = await handle.createWritable();

        const response = await fetch("data:text/plain,fetched from far");
        const body = response.body!;

        const abortController = new AbortController();
        const signal = abortController.signal;

        const promise = body.pipeTo(wfs, { signal });
        abortController.abort();

        await expect(promise).rejects.toThrow(DOMException);
        await expect(wfs.close()).rejects.toThrow(TypeError);

        await expect(getFileContents(handle)).resolves.toBe("");
        await expect(getFileSize(handle)).resolves.toBe(0);
      },
    );
  });
});
