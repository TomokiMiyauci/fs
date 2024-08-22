import { runFileSystemWritableFileStreamTest } from "@test/file_system_writable_file_stream.ts";
import { StorageManager } from "../src/storage_manager.ts";
import { VirtualFileSystem } from "@test/util.ts";

runFileSystemWritableFileStreamTest(async () => {
  const storage = new StorageManager(new VirtualFileSystem());

  return {
    root: await storage.getDirectory(),
  };
});
