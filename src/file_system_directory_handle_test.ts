import { VirtualFileSystem } from "@test/util.ts";
import { runFileSystemDirectoryHandleTest } from "@test/file_system_directory_handle.ts";

runFileSystemDirectoryHandleTest(async () => {
  const fs = new VirtualFileSystem();
  const root = await fs.getDirectory();

  return {
    root,
  };
});
