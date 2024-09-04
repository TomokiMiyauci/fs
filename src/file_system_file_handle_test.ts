import { runFileSystemFileHandleTest } from "@test/file_system_file_handle.ts";
import { VirtualFileSystem } from "@test/util.ts";

runFileSystemFileHandleTest(async () => {
  const fs = new VirtualFileSystem();
  const root = await fs.getDirectory();

  return {
    root,
  };
});
