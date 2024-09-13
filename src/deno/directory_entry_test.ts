import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { DirectoryEntry } from "./directory_entry.ts";
import { FileSystem } from "./file_system.ts";

interface Context {
  root: string;
  fileSystem: FileSystem;
}

describe("DirectoryEntry", () => {
  beforeEach<Context>(async function () {
    this.root = await Deno.makeTempDir();
    this.fileSystem = new FileSystem(this.root);
  });

  afterEach<Context>(async function () {
    await Deno.remove(this.root);
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
      "should return root",
      function () {
        const entry = new DirectoryEntry(this.fileSystem, [
          "",
        ]);

        expect(entry.parent).toBeTruthy();
      },
    );
  });
});
