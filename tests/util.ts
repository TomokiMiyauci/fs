import { FileSystemFileHandle } from "../src/file_system/file_system_file_handle.ts";
import {
  createFileSystemDirectoryHandle,
  FileSystemDirectoryHandle,
} from "../src/file_system/file_system_directory_handle.ts";
import {
  type DirectoryEntry,
  type FileSystemEntry,
  type FileSystemLocator,
  type FileSystemWriteChunkType,
  ParallelQueue,
} from "../src/file_system/type.ts";
import { OrderedSet } from "../src/infra/mod.ts";

export interface Context {
  root: FileSystemDirectoryHandle;
}

export async function createFileWithContents(
  handle: FileSystemDirectoryHandle,
  name: string,
  data: FileSystemWriteChunkType,
): Promise<FileSystemFileHandle> {
  const file = await handle.getFileHandle(name, { create: true });
  const writable = await file.createWritable();

  await writable.write(data);
  await writable.close();

  return file;
}

export function createEmptyFile(
  handle: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemFileHandle> {
  return createFileWithContents(handle, name, "");
}

export async function getFileContents(
  handle: FileSystemFileHandle,
): Promise<string> {
  const file = await handle.getFile();

  return file.text();
}

export async function getFileSize(
  handle: FileSystemFileHandle,
): Promise<number> {
  const file = await handle.getFile();

  return file.size;
}

export function createDirectory(
  handle: FileSystemDirectoryHandle,
  name: string,
) {
  return handle.getDirectoryHandle(name, { create: true });
}

export const pathSeparators = ["/", "\\"];

export function getDirectory(): FileSystemDirectoryHandle {
  const directory = {
    children: [],
    name: "",
    queryAccess: () => ({ permissionState: "granted", errorName: "" }),
    requestAccess: () => ({ permissionState: "granted", errorName: "" }),
  } satisfies DirectoryEntry;

  const rootLocator = {
    root: "",
    path: [""],
    kind: "directory",
  } satisfies FileSystemLocator;

  const locatorEntry = new LocatorEntry();
  locatorEntry.set(rootLocator, directory);

  return createFileSystemDirectoryHandle(rootLocator.root, rootLocator.path, {
    definition: {
      locateEntry(locator) {
        return locatorEntry.get(locator);
      },
      agent: {
        pendingFileSystemObservers: new OrderedSet(),
        fileSystemObserverMicrotaskQueued: false,
      },
    },
    fs: {
      create(locator, entry) {
        locatorEntry.set(locator, entry);
      },
      remove(locator) {
        locatorEntry.delete(locator);
      },

      write() {},
    },
    userAgent: {
      fileSystemQueue: new ParallelQueue(),
      storageTask: new ParallelQueue(),
    },
  });
}

interface MappedEntry {
  child: LocatorEntry;
  entry: FileSystemEntry;
}

class LocatorEntry {
  #map: Map<string, MappedEntry> = new Map();
  get(locator: FileSystemLocator): FileSystemEntry | null {
    const [first, ...rest] = locator.path;

    if (this.#map.has(first)) {
      const { entry, child } = this.#map.get(first)!;

      if (!rest.length) return entry;

      return child.get({ ...locator, path: rest });
    }

    return null;
  }

  set(locator: FileSystemLocator, entry: FileSystemEntry): void {
    const [first, ...rest] = locator.path;
    const result = this.#map.get(first);

    if (result) {
      if (rest.length) {
        result.child.set({ ...locator, path: rest }, entry);
      } else {
        result.entry = entry;
      }

      return;
    }

    if (rest.length) throw new Error();

    this.#map.set(first, { entry, child: new LocatorEntry() });
  }

  delete(locator: FileSystemLocator): void {
    const [first, ...rest] = locator.path;

    const result = this.#map.get(first);

    if (result) {
      if (rest.length) {
        result.child.delete({ ...locator, path: rest });
      } else {
        this.#map.delete(first);
      }

      return;
    }

    throw new Error();
  }
}
