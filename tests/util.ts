import { FileSystemFileHandle } from "../src/file_system/file_system_file_handle.ts";
import {
  createFileSystemDirectoryHandle,
  FileSystemDirectoryHandle,
} from "../src/file_system/file_system_directory_handle.ts";
import type {
  DirectoryEntry,
  FileSystemEntry,
  FileSystemLocator,
  FileSystemWriteChunkType,
} from "../src/file_system/type.ts";
import { isDirectoryEntry } from "../src/file_system/algorithm.ts";

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

  const entry = {
    root: "",
    path: [""],
    kind: "directory",
  } satisfies FileSystemLocator;

  const map = new Map<
    string,
    { entry: FileSystemEntry; child: StorageStructure }
  >();

  map.set(entry.path[entry.path.length - 1], {
    entry: directory,
    child: new Map(),
  });

  return createFileSystemDirectoryHandle(entry.root, entry.path, {
    definition: {
      locateEntry(locator) {
        return get(locator, map);
      },
    },
    fs: {
      create(entry, locator) {
        const newLocator: FileSystemLocator = isDirectoryEntry(entry)
          ? {
            ...locator,
            path: locator.path.concat(entry.name),
            kind: "directory",
          }
          : {
            ...locator,
            path: locator.path.concat(entry.name),
            kind: "file",
          };

        set(newLocator, entry, map);
      },
      remove(entry, locator) {
        const newLocator: FileSystemLocator = isDirectoryEntry(entry)
          ? {
            ...locator,
            path: locator.path.concat(entry.name),
            kind: "directory",
          }
          : {
            ...locator,
            path: locator.path.concat(entry.name),
            kind: "file",
          };

        remove(newLocator, map);
      },

      write() {},
    },
  });
}

type StorageStructure = Map<
  string,
  { entry: FileSystemEntry; child: StorageStructure }
>;

function get(
  locator: FileSystemLocator,
  map: StorageStructure,
): FileSystemEntry | null {
  const [first, ...rest] = locator.path;

  if (map.has(first)) {
    const { entry, child } = map.get(first)!;
    if (!rest.length) return entry;

    return get({ ...locator, path: rest }, child);
  }

  return null;
}

function set(
  locator: FileSystemLocator,
  entry: FileSystemEntry,
  map: StorageStructure,
) {
  const [first, ...rest] = locator.path;

  const result = map.get(first);

  if (result) {
    if (rest.length) {
      set({ ...locator, path: rest }, entry, result.child);
    } else {
      result.entry = entry;
    }

    return;
  }

  if (rest.length) throw new Error();

  map.set(first, { entry, child: new Map() });
}

function remove(locator: FileSystemLocator, map: StorageStructure) {
  const [first, ...rest] = locator.path;

  const result = map.get(first);

  if (result) {
    if (rest.length) {
      remove({ ...locator, path: rest }, result.child);
    } else {
      map.delete(first);
    }

    return;
  }

  throw new Error();
}
