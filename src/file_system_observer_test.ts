import { runFileSystemObserverTest } from "@test/file_system_observer.ts";
import { VirtualFileSystem } from "@test/util.ts";

runFileSystemObserverTest(async () => {
  const fs = new VirtualFileSystem();

  fs.watch();

  return {
    root: await fs.getDirectory(),
  };
});
