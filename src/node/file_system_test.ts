import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import type { FileSystemFileHandle } from "@miyauci/fs";
import { LocalFileSystem } from "./file_system.ts";
import { join } from "@std/path/join";
import { parse } from "@std/path/parse";

describe("FileSystemFileHandle", () => {
  describe("createSyncAccessHandle", () => {
    interface Context {
      handle: FileSystemFileHandle;
      root: string;
    }

    beforeEach<Context>(async function () {
      const root = await Deno.makeTempDir();
      const fs = new LocalFileSystem(root);
      const dir = await fs.getDirectory();
      const handle = await dir.getFileHandle("file.txt", { create: true });

      this.root = root;
      this.handle = handle;
    });

    afterEach<Context>(async function () {
      await Deno.remove(this.root, { recursive: true });
    });

    it<Context>("should always throw error", async function () {
      await expect(this.handle.createSyncAccessHandle()).rejects.toThrow(
        DOMException,
      );
    });
  });
});

describe("LocalFileSystem", () => {
  describe("getDirectory", () => {
    interface Context {
      root: string;
    }

    beforeEach<Context>(async function () {
      const root = await Deno.makeTempDir();

      this.root = root;
    });

    afterEach<Context>(async function () {
      await Deno.remove(this.root, { recursive: true });
    });

    it<Context>(
      "should throw error if the root does not exist",
      async function () {
        const fs = new LocalFileSystem(join(this.root, "not-found"));

        await expect(fs.getDirectory()).rejects.toThrow(DOMException);
      },
    );

    it<Context>(
      "should throw error if the root is not directory",
      async function () {
        const root = join(this.root, "not-found");
        await Deno.writeTextFile(root, "");

        const fs = new LocalFileSystem(root);

        await expect(fs.getDirectory()).rejects.toThrow(DOMException);
      },
    );

    it<Context>(
      "should return directory handle",
      async function () {
        const fs = new LocalFileSystem(this.root);

        const handle = await fs.getDirectory();

        expect(handle.name).toBe(parse(this.root).base);
      },
    );
  });
});
