import { runFileSystemObserverTest } from "@test/file_system_observer.ts";
import { VirtualFileSystem } from "@test/util.ts";
import { StorageManager } from "./storage_manager.ts";

runFileSystemObserverTest(async () => {
  const fileSystem = new VirtualFileSystem();
  const storage = new StorageManager(fileSystem);

  fileSystem.watch();

  return {
    root: await storage.getDirectory(),
  };
});
