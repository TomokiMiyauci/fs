import type {
  DirectoryEntry as IDirectoryEntry,
  FileEntry as IFileEntry,
  FileSystemAccessResult,
  FileSystemEntry,
} from "../src/file_system_entry.ts";
import type {
  FileSystem as IFileSystem,
  FileSystemObservation,
  FileSystemPath,
} from "../src/file_system.ts";
import { List, Set } from "@miyauci/infra";

export class FileEntry implements IFileEntry {
  constructor(public fileSystem: FileSystem) {}
  name: string = "";

  binaryData: Uint8Array = new Uint8Array();

  parent: null = null;

  modificationTimestamp: number = Date.now();

  lock: "open" | "taken-exclusive" | "taken-shared" = "open";

  sharedLockCount: number = 0;
  requestAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }

  queryAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
}

export class FileSystem implements IFileSystem {
  root: string = "";
  observations: Set<FileSystemObservation> = new Set();
  getPath(entry: FileSystemEntry): List<string> {
    const path = new List([entry.name]);
    let parent = entry.parent;

    while (parent) {
      path.prepend(parent.name);

      parent = parent.parent;
    }

    return path;
  }
  locateEntry(_: FileSystemPath): FileSystemEntry | null {
    return null;
  }
}
