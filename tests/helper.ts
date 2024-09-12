import { List, Set } from "@miyauci/infra";
import type {
  DirectoryEntry as IDirectoryEntry,
  FileEntry as IFileEntry,
  FileSystemAccessResult,
  FileSystemEntry,
} from "../src/file_system_entry.ts";
import type {
  FileSystem as IFileSystem,
  FileSystemObservation as IFileSystemObservation,
  FileSystemPath,
} from "../src/file_system.ts";
import type { FileSystemHandle } from "../src/file_system_handle.ts";
import { FileSystemObserver } from "../src/file_system_observer.ts";

export class FileEntry implements IFileEntry {
  constructor(public fileSystem: FileSystem) {}
  name: string = "";

  binaryData: Uint8Array = new Uint8Array();

  parent: null | DirectoryEntry = null;

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

export class DirectoryEntry implements IDirectoryEntry {
  constructor(public fileSystem: FileSystem) {}
  name: string = "";

  parent: null = null;

  children: Pick<
    Set<FileSystemEntry>,
    "append" | "remove" | "isEmpty" | typeof Symbol.iterator
  > = new Set();

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

export class FileSystemObservation implements IFileSystemObservation {
  constructor(handle: FileSystemHandle) {
    this.rootHandle = handle;
  }
  recursive: boolean = false;
  observer: FileSystemObserver = new FileSystemObserver(() => {});
  rootHandle: FileSystemHandle;
}
