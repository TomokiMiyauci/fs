import { runFileSystemHandleTest } from "@test/file_system_handle.ts";
import { runFileSystemFileHandleTest } from "@test/file_system_file_handle.ts";
import { runFileSystemDirectoryHandleTest } from "@test/file_system_directory_handle.ts";
import { runFileSystemSyncAccessHandleTest } from "@test/file_system_sync_access_handle.ts";
import { runFileSystemWritableFileStreamTest } from "@test/file_system_writable_file_stream.ts";
import { FileSystem } from "./file_system.ts";
import { StorageManager } from "../storage_manager.ts";

async function provide() {
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
}

runFileSystemHandleTest(provide);
runFileSystemFileHandleTest(provide);
runFileSystemDirectoryHandleTest(provide);
runFileSystemSyncAccessHandleTest(provide);
runFileSystemWritableFileStreamTest(provide);
