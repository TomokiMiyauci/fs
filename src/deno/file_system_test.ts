import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { FileSystem, LocalFileSystem } from "./file_system.ts";
import { parse } from "@std/path/parse";
import { join } from "@std/path/join";
import { List } from "@miyauci/infra";

describe("FileSystem", () => {
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

  describe("locateEntry", () => {
    it<Context>("should return directory entry", function () {
      const fileSystem = new FileSystem(this.root);

      const entry = fileSystem.locateEntry(new List([""]));
      expect(entry?.name).toBe("");
      expect(entry?.fileSystem).toBe(fileSystem);
      expect(entry?.parent).toBe(null);
    });

    it<Context>("should return null if entry does not exist", function () {
      const fileSystem = new FileSystem(this.root);

      expect(fileSystem.locateEntry(new List(["not-found"]))).toBe(null);
    });
  });

  describe("getPath", () => {
    it<Context>("should return directory entry", function () {
      const fileSystem = new FileSystem(this.root);

      const entry = fileSystem.locateEntry(new List([""]))!;

      const path = fileSystem.getPath(entry);
      expect(path.size).toBe(1);
      expect(path[0]).toBe("");
    });
  });
});

describe("FileSystemHandle", () => {
  it("should return end of root segment", async function () {
    const rootPath = await Deno.makeTempDir();
    const fs = new LocalFileSystem(rootPath);
    const root = await fs.getDirectory();
    const { base } = parse(rootPath);

    expect(root.name).toBe(base);

    await Deno.remove(rootPath);
  });
});

describe("FileSystemDirectoryHandle", () => {
  describe("createSyncAccessHandle", () => {
    it("should throw error if it is not in bucket file system", async () => {
      const rootPath = await Deno.makeTempDir();
      const fs = new LocalFileSystem(rootPath);
      const root = await fs.getDirectory();
      const fileHandle = await root.getFileHandle("file.txt", { create: true });

      await expect(fileHandle.createSyncAccessHandle()).rejects.toThrow(
        DOMException,
      );

      await Deno.remove(rootPath, { recursive: true });
    });
  });
});

describe("LocalFileSystem", () => {
  describe("getDirectory", () => {
    it("should throw error if the root does not exist", async () => {
      const path = await Deno.makeTempDir();
      const fullPath = join(path, "not-found");
      const fs = new LocalFileSystem(fullPath);

      await expect(fs.getDirectory()).rejects.toThrow(DOMException);

      await Deno.remove(path);
    });

    it("should throw error if the root is not directory", async () => {
      const path = await Deno.makeTempDir();
      const fullPath = join(path, "not-found");

      await Deno.writeTextFile(fullPath, "");

      const fs = new LocalFileSystem(fullPath);

      await expect(fs.getDirectory()).rejects.toThrow(DOMException);

      await Deno.remove(path, { recursive: true });
    });

    it("should return file directory", async () => {
      const path = await Deno.makeTempDir();

      const fs = new LocalFileSystem(path);

      await expect(fs.getDirectory()).resolves.toBeTruthy();

      await Deno.remove(path);
    });
  });

  describe("unwatch", () => {
    it("should do nothing if before watch", async () => {
      const path = await Deno.makeTempDir();
      const fs = new LocalFileSystem(path);

      fs.unwatch();

      await Deno.remove(path);
    });
  });
});
