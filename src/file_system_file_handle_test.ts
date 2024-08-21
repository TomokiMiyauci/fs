import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";
import type { FileSystemDirectoryHandle } from "./file_system_directory_handle.ts";
import { createDirectory, createEmptyFile, VirtualFileSystem } from "@test";
import { StorageManager } from "./storage_manager.ts";

interface Context {
  root: FileSystemDirectoryHandle;
}

describe("FileSystemFileHandle", () => {
  beforeEach<Context>(async function () {
    const storage = new StorageManager(new VirtualFileSystem());
    this.root = await storage.getDirectory();
  });

  describe("isSameEntry", () => {
    it<Context>(
      "isSameEntry for identical file handles returns true",
      async function () {
        const handle = await this.root.getFileHandle("mtime.txt", {
          create: true,
        });

        await expect(handle.isSameEntry(handle)).resolves.toBeTruthy();
      },
    );

    it<Context>(
      "isSameEntry for different files returns false",
      async function () {
        const handle1 = await this.root.getFileHandle("mtime.txt", {
          create: true,
        });
        const handle2 = await this.root.getFileHandle("foo.txt", {
          create: true,
        });

        await expect(handle1.isSameEntry(handle2)).resolves.toBeFalsy();
        await expect(handle2.isSameEntry(handle1)).resolves.toBeFalsy();
      },
    );

    it<Context>(
      "isSameEntry for different handles for the same file",
      async function () {
        const handle1 = await this.root.getFileHandle("mtime.txt", {
          create: true,
        });
        const handle2 = await this.root.getFileHandle("mtime.txt", {
          create: true,
        });

        await expect(handle1.isSameEntry(handle2)).resolves.toBeTruthy();
        await expect(handle2.isSameEntry(handle1)).resolves.toBeTruthy();
      },
    );

    it<Context>(
      "isSameEntry comparing a file to a file in a different directory returns false",
      async function () {
        const handle1 = await this.root.getFileHandle("mtime.txt", {
          create: true,
        });
        const subDir = await this.root.getDirectoryHandle("subDir-name", {
          create: true,
        });
        const handle2 = await subDir.getFileHandle("mtime.txt", {
          create: true,
        });

        await expect(handle1.isSameEntry(handle2)).resolves.toBeFalsy();
        await expect(handle2.isSameEntry(handle1)).resolves.toBeFalsy();
      },
    );

    it<Context>(
      "isSameEntry comparing a file to a directory returns false",
      async function () {
        const handle = await this.root.getFileHandle("mtime.txt", {
          create: true,
        });
        const subDir = await this.root.getDirectoryHandle("subDir-name", {
          create: true,
        });

        await expect(handle.isSameEntry(subDir)).resolves.toBeFalsy();
        await expect(subDir.isSameEntry(handle)).resolves.toBeFalsy();
      },
    );

    it<Context>(
      "isSameEntry comparing two files pointing to the same path returns true",
      async function () {
        const fileName = "foo";

        const handle1 = await createEmptyFile(this.root, fileName);

        await this.root.removeEntry(fileName);

        const handle2 = await createEmptyFile(this.root, fileName);

        await expect(handle1.isSameEntry(handle2)).resolves.toBeTruthy();
        await expect(handle2.isSameEntry(handle1)).resolves.toBeTruthy();
      },
    );

    it<Context>(
      "isSameEntry comparing two directories pointing to the same path returns true",
      async function () {
        const fileName = "foo";

        const handle1 = await createDirectory(this.root, fileName);

        await this.root.removeEntry(fileName);

        const handle2 = await createDirectory(this.root, fileName);

        await expect(handle1.isSameEntry(handle2)).resolves.toBeTruthy();
        await expect(handle2.isSameEntry(handle1)).resolves.toBeTruthy();
      },
    );

    it<Context>(
      "isSameEntry comparing a file to a directory of the same path returns false",
      async function () {
        const fileName = "foo";

        const handle1 = await createDirectory(this.root, fileName);

        await this.root.removeEntry(fileName);

        const handle2 = await createEmptyFile(this.root, fileName);

        await expect(handle1.isSameEntry(handle2)).resolves.toBeFalsy();
        await expect(handle2.isSameEntry(handle1)).resolves.toBeFalsy();
      },
    );
  });
});
