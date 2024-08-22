import { runFileSystemHandleTest } from "@test/file_system_handle.ts";
import { runFileSystemFileHandleTest } from "@test/file_system_file_handle.ts";
import { runFileSystemDirectoryHandleTest } from "@test/file_system_directory_handle.ts";
import { FileSystem } from "./file_system.ts";
import { StorageManager } from "../storage_manager.ts";

runFileSystemHandleTest(async () => {
  const rootPath = await Deno.makeTempDir();
  const fileSystem = new FileSystem(rootPath);
  const storage = new StorageManager(fileSystem);

  const root = await storage.getDirectory();

  return {
    root,
    onAfterEach() {
      return Deno.remove(rootPath, { recursive: true });
    },
  };
});

runFileSystemFileHandleTest(async () => {
  const rootPath = await Deno.makeTempDir();
  const fileSystem = new FileSystem(rootPath);
  const storage = new StorageManager(fileSystem);

  const root = await storage.getDirectory();

  return {
    root,
    onAfterEach() {
      return Deno.remove(rootPath, { recursive: true });
    },
  };
});

runFileSystemDirectoryHandleTest(async () => {
  const rootPath = await Deno.makeTempDir();
  const fileSystem = new FileSystem(rootPath);
  const storage = new StorageManager(fileSystem);

  const root = await storage.getDirectory();

  return {
    root,
    onAfterEach() {
      return Deno.remove(rootPath, { recursive: true });
    },
  };
});
