import { runFileSystemSyncAccessHandleTest } from "@test/file_system_sync_access_handle.ts";
import { StorageManager } from "../src/storage_manager.ts";
import { VirtualFileSystem } from "@test/util.ts";

runFileSystemSyncAccessHandleTest(async () => {
  const storage = new StorageManager(new VirtualFileSystem());

  return {
    root: await storage.getDirectory(),
  };
});
