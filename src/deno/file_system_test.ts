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

// TODO: Investigate how the file watcher sometimes dispatch 'created' or 'modified' events when a file is removed.
// runFileSystemObserverTest(async () => {
//   const rootPath = await Deno.makeTempDir();
//   const realPath = await Deno.realPath(rootPath);
//   const fileSystem = new FileSystem(realPath);
//   const storage = new StorageManager(fileSystem);

//   fileSystem.watch();

//   const root = await storage.getDirectory();

//   return {
//     root,
//     onAfterEach() {
//       fileSystem.unwatch();
//       return Deno.remove(realPath, { recursive: true });
//     },
//   };
// });
