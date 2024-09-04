import { runFileSystemWritableFileStreamTest } from "@test/file_system_writable_file_stream.ts";
import { VirtualFileSystem } from "@test/util.ts";

runFileSystemWritableFileStreamTest(async () => {
  const fs = new VirtualFileSystem();

  return {
    root: await fs.getDirectory(),
  };
});
