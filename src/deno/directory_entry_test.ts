import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { DirectoryEntry, Effector } from "./directory_entry.ts";
import { FileSystem } from "./file_system.ts";
import { join } from "@std/path/join";

interface Context {
  root: string;
  fileSystem: FileSystem;
}

describe("DirectoryEntry", () => {
  beforeEach<Context>(async function () {
    const path = await Deno.makeTempDir();
    this.root = await Deno.realPath(path);
    this.fileSystem = new FileSystem(this.root);
  });

  afterEach<Context>(async function () {
    await Deno.remove(this.root, { recursive: true });
  });

  describe("parent", () => {
    it<Context>(
      "should return null if parent entry does not exist",
      function () {
        const entry = new DirectoryEntry(this.fileSystem, [
          "path",
          "not-found",
        ]);

        expect(entry.parent).toBe(null);
      },
    );

    it<Context>(
      "should return null if parent entry is not directory",
      async function () {
        await Deno.writeTextFile(join(this.root, "path"), "");

        const entry = new DirectoryEntry(this.fileSystem, [
          "path",
          "not-found",
        ]);

        expect(entry.parent).toBe(null);
      },
    );

    it<Context>(
      "should return parent directory if exists",
      async function () {
        await Deno.mkdir(join(this.root, "path"));

        const entry = new DirectoryEntry(this.fileSystem, [
          "path",
          "not-found",
        ]);

        expect(entry.parent).toBeTruthy();
        expect(entry.parent?.name).toBe("path");
      },
    );

    it<Context>(
      "should return null",
      function () {
        const entry = new DirectoryEntry(this.fileSystem, [
          "",
        ]);

        expect(entry.parent).toBe(null);
      },
    );
  });
});

describe("Effector", () => {
  beforeEach<Context>(async function () {
    this.root = await Deno.makeTempDir();
    this.fileSystem = new FileSystem(this.root);
  });

  afterEach<Context>(async function () {
    await Deno.remove(this.root);
  });

  describe("Symbol.iterator", () => {
    it<Context>("should return empty", function () {
      const effector = new Effector(this.fileSystem, []);

      expect([...effector]).toEqual([]);
    });
  });
});
