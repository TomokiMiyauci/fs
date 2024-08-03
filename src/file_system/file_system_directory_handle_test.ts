// from @see https://github.com/web-platform-tests/wpt/blob/master/fs/script-tests/FileSystemDirectoryHandle-getDirectoryHandle.js

import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { FileSystemDirectoryHandle } from "./file_system_directory_handle.ts";
import { define } from "./helper.ts";
import type { FileSystemWriteChunkType } from "./type.ts";
import { FileSystemFileHandle } from "./file_system_file_handle.ts";

interface Context {
  root: FileSystemDirectoryHandle;
}

describe("FileSystemDirectoryHandle", () => {
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

  describe("isSameEntry", () => {
    it<Context>(
      "isSameEntry for identical directory handles returns true",
      async function () {
        await expect(this.root.isSameEntry(this.root)).resolves.toBeTruthy();

        const subDir = await this.root.getDirectoryHandle("subdir-name", {
          create: true,
        });

        await expect(subDir.isSameEntry(subDir)).resolves.toBeTruthy();
      },
    );

    it<Context>(
      "isSameEntry for different directories returns false",
      async function () {
        const subDir = await this.root.getDirectoryHandle("subdir-name", {
          create: true,
        });

        await expect(this.root.isSameEntry(subDir)).resolves.toBeFalsy();
        await expect(subDir.isSameEntry(this.root)).resolves.toBeFalsy();
      },
    );

    it<Context>(
      "isSameEntry for different handles for the same directory",
      async function () {
        const subDir = await this.root.getDirectoryHandle("subdir-name", {
          create: true,
        });
        const subDir2 = await this.root.getDirectoryHandle("subdir-name", {
          create: true,
        });

        await expect(subDir.isSameEntry(subDir2)).resolves.toBeTruthy();
        await expect(subDir2.isSameEntry(subDir)).resolves.toBeTruthy();
      },
    );
  });

  describe("getDirectoryHandle", () => {
    it<Context>(
      "getDirectoryHandle(create=false) rejects for non-existing directories",
      async function () {
        await expect(this.root.getDirectoryHandle("non-existing-dir")).rejects
          .toThrow(DOMException);
      },
    );

    it<Context>(
      "getDirectoryHandle(create=true) creates an empty directory",
      async function () {
        const handle = await this.root.getDirectoryHandle("non-existing-dir", {
          create: true,
        });

        expect(handle.kind).toBe("directory");
        expect(handle.name).toBe("non-existing-dir");
        await expect(getDirectoryEntryCount(handle)).resolves.toBe(0);
        await expect(getSortedDirectoryEntries(this.root)).resolves.toEqual([
          "non-existing-dir/",
        ]);
      },
    );

    it<Context>(
      "getDirectoryHandle(create=false) returns existing directories",
      async function () {
        const dirHandle = await this.root.getDirectoryHandle(
          "dir-with-contents",
          { create: true },
        );
        await dirHandle.getFileHandle("test-file", { create: true });
        const handle = await this.root.getDirectoryHandle("dir-with-contents", {
          create: false,
        });

        expect(handle.kind).toBe("directory");
        expect(handle.name).toBe("dir-with-contents");
        await expect(getSortedDirectoryEntries(handle)).resolves.toEqual([
          "test-file",
        ]);
      },
    );

    it<Context>(
      "getDirectoryHandle(create=true) returns existing directories without erasing",
      async function () {
        const dirHandle = await this.root.getDirectoryHandle(
          "dir-with-contents",
          { create: true },
        );

        await dirHandle.getFileHandle("test-file", {
          create: true,
        });

        const handle = await this.root.getDirectoryHandle("dir-with-contents", {
          create: true,
        });

        expect(handle.kind).toBe("directory");
        expect(handle.name).toBe("dir-with-contents");
        await expect(getSortedDirectoryEntries(handle)).resolves.toEqual([
          "test-file",
        ]);
      },
    );

    it<Context>(
      "getDirectoryHandle() when a file already exists with the same name",
      async function () {
        await this.root.getFileHandle("file-name", { create: true });

        await expect(this.root.getDirectoryHandle("file-name")).rejects
          .toThrow(DOMException);
        await expect(
          this.root.getDirectoryHandle("file-name", { create: true }),
        ).rejects.toThrow(DOMException);
        await expect(
          this.root.getDirectoryHandle("file-name", { create: false }),
        ).rejects.toThrow(DOMException);
      },
    );

    it<Context>(
      "getDirectoryHandle() with empty name",
      async function () {
        await expect(this.root.getFileHandle("")).rejects
          .toThrow(TypeError);
        await expect(this.root.getFileHandle("", { create: true })).rejects
          .toThrow(TypeError);
      },
    );

    it<Context>(
      "getDirectoryHandle() with `.` name",
      async function () {
        await expect(this.root.getFileHandle(".")).rejects
          .toThrow(TypeError);
        await expect(this.root.getFileHandle(".", { create: true })).rejects
          .toThrow(TypeError);
      },
    );

    it<Context>(
      "getDirectoryHandle() with `.` name",
      async function () {
        await expect(this.root.getFileHandle(".")).rejects
          .toThrow(TypeError);
        await expect(this.root.getFileHandle(".", { create: true })).rejects
          .toThrow(TypeError);
      },
    );

    it<Context>(
      "getDirectoryHandle() with `..` name",
      async function () {
        await expect(this.root.getFileHandle("..")).rejects
          .toThrow(TypeError);
        await expect(this.root.getFileHandle("..", { create: true })).rejects
          .toThrow(TypeError);
      },
    );

    it<Context>(
      "getDirectoryHandle(create=false) with a path separator when the directory exists",
      async function () {
        const first_subdir_name = "first-subdir-name";
        const first_subdir = await this.root.getDirectoryHandle(
          first_subdir_name,
          { create: true },
        );

        const second_subdir_name = "second-subdir-name";
        await first_subdir.getDirectoryHandle(
          second_subdir_name,
          { create: true },
        );

        for (const separator of pathSeparators) {
          const path_with_separator =
            `${first_subdir_name}${separator}${second_subdir_name}`;

          await expect(this.root.getDirectoryHandle(path_with_separator))
            .rejects
            .toThrow(TypeError);
        }
      },
    );

    it<Context>(
      "getDirectoryHandle(create=true) with a path separator",
      async function () {
        const subdir_name = "subdir-name";
        await this.root.getDirectoryHandle(subdir_name, {
          create: true,
        });

        for (const separator of pathSeparators) {
          const path_with_separator = `${subdir_name}${separator}file_name`;

          await expect(
            this.root.getDirectoryHandle(path_with_separator, { create: true }),
          )
            .rejects
            .toThrow(TypeError);
        }
      },
    );
  });

  describe("getFileHandle", () => {
    it<Context>(
      "getFileHandle(create=false) rejects for non-existing files",
      async function () {
        await expect(this.root.getFileHandle("non-existing-file")).rejects
          .toThrow(DOMException);
      },
    );

    it<Context>(
      "getFileHandle(create=true) creates an empty file for non-existing files",
      async function () {
        const handle = await this.root.getFileHandle("non-existing-file", {
          create: true,
        });

        expect(handle.kind).toBe("file");
        expect(handle.name).toBe("non-existing-file");
        await expect(getFileSize(handle)).resolves.toBe(0);
        await expect(getFileContents(handle)).resolves.toBe("");
      },
    );

    it<Context>(
      "getFileHandle(create=true) creates an empty file with all valid ASCII characters in the name",
      async function () {
        const name = getAscii();

        const handle = await this.root.getFileHandle(name, {
          create: true,
        });

        expect(handle.kind).toBe("file");
        expect(handle.name).toBe(name);
        await expect(getFileSize(handle)).resolves.toBe(0);
        await expect(getFileContents(handle)).resolves.toBe("");
      },
    );

    it<Context>(
      "getFileHandle(create=true) creates an empty file with non-ASCII characters in the name",
      async function () {
        const name = "Funny cat \u{1F639}";

        const handle = await this.root.getFileHandle(name, {
          create: true,
        });

        expect(handle.kind).toBe("file");
        expect(handle.name).toBe(name);
        await expect(getFileSize(handle)).resolves.toBe(0);
        await expect(getFileContents(handle)).resolves.toBe("");
      },
    );

    it<Context>(
      "getFileHandle(create=false) returns existing files",
      async function () {
        const name = "existing-file";
        const handle = await this.root.getFileHandle(name, {
          create: true,
        });

        const contents = "1234567890";
        const writable = await handle.createWritable();
        await writable.write(contents);
        await writable.close();

        expect(handle.kind).toBe("file");
        expect(handle.name).toBe(name);
        await expect(getFileSize(handle)).resolves.toBe(contents.length);
        await expect(getFileContents(handle)).resolves.toBe(contents);
      },
    );

    it<Context>(
      "getFileHandle(create=true) returns existing files without erasing",
      async function () {
        const name = "existing-file";
        const fileHandle = await this.root.getFileHandle(name, {
          create: true,
        });
        const contents = "1234567890";
        const writable = await fileHandle.createWritable();
        await writable.write(contents);
        await writable.close();

        const handle = await this.root.getFileHandle(name, {
          create: true,
        });

        expect(handle.kind).toBe("file");
        expect(handle.name).toBe(name);
        await expect(getFileSize(handle)).resolves.toBe(contents.length);
        await expect(getFileContents(handle)).resolves.toBe(contents);
      },
    );

    it<Context>(
      "getFileHandle(create=false) when a directory already exists with the same name",
      async function () {
        const name = "dir-name";
        await this.root.getDirectoryHandle(name, { create: true });

        await expect(this.root.getFileHandle(name)).rejects.toThrow(
          DOMException,
        );
      },
    );

    it<Context>(
      "getFileHandle(create=true) when a directory already exists with the same name",
      async function () {
        const name = "dir-name";
        await this.root.getDirectoryHandle(name, { create: true });

        await expect(this.root.getFileHandle(name, { create: true })).rejects
          .toThrow(
            DOMException,
          );
      },
    );

    it<Context>(
      "getFileHandle() with empty name",
      async function () {
        await expect(this.root.getFileHandle("", { create: true })).rejects
          .toThrow(TypeError);
        await expect(this.root.getFileHandle("", { create: false })).rejects
          .toThrow(TypeError);
      },
    );

    it<Context>(
      "getFileHandle() with `.` name",
      async function () {
        await expect(this.root.getFileHandle(".", { create: true })).rejects
          .toThrow(TypeError);
        await expect(this.root.getFileHandle(".", { create: false })).rejects
          .toThrow(TypeError);
      },
    );

    it<Context>(
      "getFileHandle() with `..` name",
      async function () {
        await expect(this.root.getFileHandle("..", { create: true })).rejects
          .toThrow(TypeError);
        await expect(this.root.getFileHandle("..", { create: false })).rejects
          .toThrow(TypeError);
      },
    );

    it<Context>(
      "getFileHandle(create=false) with a path separator when the file exists.",
      async function () {
        const subdir_name = "subdir-name";
        const subdir = await this.root.getDirectoryHandle(subdir_name, {
          create: true,
        });
        const file_name = "file-name";
        await subdir.getDirectoryHandle(file_name, { create: true });

        for (const pathSegment of pathSeparators) {
          const path_with_separator =
            `${subdir_name}${pathSegment}${file_name}`;

          await expect(this.root.getFileHandle(path_with_separator)).rejects
            .toThrow(TypeError);
        }
      },
    );

    it<Context>(
      "getFileHandle(create=true) with a path separator",
      async function () {
        const subdir_name = "subdir-name";
        await this.root.getDirectoryHandle(subdir_name, {
          create: true,
        });

        for (const pathSegment of pathSeparators) {
          const path_with_separator = `${subdir_name}${pathSegment}file_name`;

          await expect(
            this.root.getFileHandle(path_with_separator, { create: true }),
          ).rejects
            .toThrow(TypeError);
        }
      },
    );
  });

  describe("iteration", () => {
    it<Context>(
      "returning early from an iteration doesn't crash",
      async function () {
        const file_name1 = "foo1.txt";
        const file_name2 = "foo2.txt";

        const handle1 = await this.root.getFileHandle(file_name1, {
          create: true,
        });
        const handle2 = await this.root.getFileHandle(file_name2, {
          create: true,
        });

        await write(handle1, "contents");
        await write(handle2, "contents");

        for await (const _ of this.root) {
          break;
        }
      },
    );

    it<Context>(
      "@@asyncIterator: full iteration works",
      async function () {
        const file_name1 = "foo1.txt";
        const file_name2 = "foo2.txt";

        const handle1 = await this.root.getFileHandle(file_name1, {
          create: true,
        });
        const handle2 = await this.root.getFileHandle(file_name2, {
          create: true,
        });

        await write(handle1, "contents");
        await write(handle2, "contents");

        const names: string[] = [];

        for await (const entry of this.root) {
          expect(Array.isArray(entry)).toBeTruthy();
          expect(entry.length).toBe(2);
          expect(typeof entry[0]).toBe("string");
          expect(entry[1] instanceof FileSystemFileHandle).toBeTruthy();
          expect(entry[0]).toBe(entry[1].name);

          names.push(entry[0]);
        }

        names.sort();

        expect(names).toEqual([file_name1, file_name2]);
      },
    );

    it<Context>(
      "entries: full iteration works",
      async function () {
        const file_name1 = "foo1.txt";
        const file_name2 = "foo2.txt";

        const handle1 = await this.root.getFileHandle(file_name1, {
          create: true,
        });
        const handle2 = await this.root.getFileHandle(file_name2, {
          create: true,
        });

        await write(handle1, "contents");
        await write(handle2, "contents");

        const names: string[] = [];

        for await (const entry of this.root.entries()) {
          expect(Array.isArray(entry)).toBeTruthy();
          expect(entry.length).toBe(2);
          expect(typeof entry[0]).toBe("string");
          expect(entry[1] instanceof FileSystemFileHandle).toBeTruthy();
          expect(entry[0]).toBe(entry[1].name);

          names.push(entry[0]);
        }

        names.sort();

        expect(names).toEqual([file_name1, file_name2]);
      },
    );
  });
});

function getAscii(): string {
  let name = "";
  // test the ascii characters -- start after the non-character ASCII values, exclude DEL
  for (let i = 32; i < 127; i++) {
    // Path separators are disallowed
    let disallow = false;
    for (let j = 0; j < pathSeparators.length; ++j) {
      if (String.fromCharCode(i) == pathSeparators[j]) {
        disallow = true;
      }
    }
    if (!disallow) {
      name += String.fromCharCode(i);
    }
  }
  // Add in CR, LF, FF, Tab, Vertical Tab
  for (let i = 9; i < 14; i++) {
    name += String.fromCharCode(i);
  }

  return name;
}

const pathSeparators = ["/", "\\"];

async function getDirectoryEntryCount(
  handle: FileSystemDirectoryHandle,
): Promise<number> {
  return (await Array.fromAsync(handle)).length;
}

async function getSortedDirectoryEntries(
  handle: FileSystemDirectoryHandle,
): Promise<string[]> {
  const result: string[] = [];

  for await (const entry of handle.values()) {
    if (entry.kind === "directory") {
      result.push(entry.name + "/");
    } else {
      result.push(entry.name);
    }
  }

  result.sort();
  return result;
}

async function getFileSize(handle: FileSystemFileHandle): Promise<number> {
  const file = await handle.getFile();

  return file.size;
}

async function getFileContents(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();

  return file.text();
}

async function write(
  handle: FileSystemFileHandle,
  data: FileSystemWriteChunkType,
): Promise<void> {
  const writable = await handle.createWritable();

  await writable.write(data);

  await writable.close();
}
