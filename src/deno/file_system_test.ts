import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { runFileSystemHandleTest } from "@test/file_system_handle.ts";
import { runFileSystemFileHandleTest } from "@test/file_system_file_handle.ts";
import { runFileSystemDirectoryHandleTest } from "@test/file_system_directory_handle.ts";
import { runFileSystemWritableFileStreamTest } from "@test/file_system_writable_file_stream.ts";
import { LocalFileSystem } from "./file_system.ts";
import { parse } from "@std/path/parse";
import { join } from "@std/path/join";

async function provide() {
  const rootPath = await Deno.makeTempDir();
  const fs = new LocalFileSystem(rootPath);
  const root = await fs.getDirectory();

  return {
    root,
    onAfterEach() {
      return Deno.remove(rootPath, { recursive: true });
    },
  };
}

runFileSystemHandleTest(provide, true);
runFileSystemFileHandleTest(provide);
runFileSystemDirectoryHandleTest(provide);
runFileSystemWritableFileStreamTest(provide);

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

// TODO: Investigate how the file watcher sometimes dispatch 'created' or 'modified' events when a file is removed.
// runFileSystemObserverTest(async () => {
//   const rootPath = await Deno.makeTempDir();
//   const realPath = await Deno.realPath(rootPath);
//   const fileSystem = new FileSystem(realPath);
//   const storage = new StorageManager(fileSystem);

//   fileSystem.watch();

//   const root = await storage.getDirectory();

//   return {
//     root,
//     onAfterEach() {
//       fileSystem.unwatch();
//       return Deno.remove(realPath, { recursive: true });
//     },
//   };
// });

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
