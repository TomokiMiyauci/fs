import { StorageManager } from "./storage_manager.ts";
import { VirtualFileSystem } from "@test/util.ts";
import { runFileSystemDirectoryHandleTest } from "@test/file_system_directory_handle.ts";

runFileSystemDirectoryHandleTest(async () => {
  const storage = new StorageManager(new VirtualFileSystem());

  return {
    root: await storage.getDirectory(),
  };
});
