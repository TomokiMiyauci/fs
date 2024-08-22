import { runFileSystemFileHandleTest } from "@test/file_system_file_handle.ts";
import { StorageManager } from "./storage_manager.ts";
import { VirtualFileSystem } from "@test/util.ts";

runFileSystemFileHandleTest(async () => {
  const storage = new StorageManager(new VirtualFileSystem());

  return {
    root: await storage.getDirectory(),
  };
});
