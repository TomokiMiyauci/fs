import { runFileSystemHandleTest } from "@test/file_system_handle.ts";
import { FileSystem } from "./adaptor.ts";
import { StorageManager } from "../storage_manager.ts";

runFileSystemHandleTest(async () => {
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
});
