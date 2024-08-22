import { runFileSystemHandleTest } from "@test/file_system_handle.ts";
import { StorageManager } from "../src/storage_manager.ts";
import { VirtualFileSystem } from "@test/util.ts";

runFileSystemHandleTest(async () => {
  const storage = new StorageManager(new VirtualFileSystem());

  return {
    root: await storage.getDirectory(),
  };
});
