import { runFileSystemSyncAccessHandleTest } from "@test/file_system_sync_access_handle.ts";
import { VirtualFileSystem } from "@test/util.ts";

runFileSystemSyncAccessHandleTest(async () => {
  const fs = new VirtualFileSystem();

  return {
    root: await fs.getDirectory(),
  };
});
