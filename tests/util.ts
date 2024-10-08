import type { FileSystemFileHandle } from "../src/file_system_file_handle.ts";
import {
  createFileSystemDirectoryHandle,
  type FileSystemDirectoryHandle,
} from "../src/file_system_directory_handle.ts";
import type {
  DirectoryEntry,
  FileEntry,
  FileSystemEntry,
  FileSystemLocator,
  FileSystemWriteChunkType,
  PartialSet,
} from "../src/type.ts";
import { isDirectoryEntry } from "../src/algorithm.ts";
import { VirtualFileSystem } from "./virtual.ts";
import { UserAgent } from "../src/helper.ts";
import { extname } from "@std/path/extname";
import { typeByExtension } from "@std/media-types";
import { List } from "@miyauci/infra";

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
  const rootLocator = {
    root: "",
    path: new List([""]),
    kind: "directory",
  } satisfies FileSystemLocator;

  const vfs = new VirtualFileSystem();

  vfs.createDirectory([...rootLocator.path]);

  return createFileSystemDirectoryHandle(rootLocator.root, rootLocator.path, {
    locateEntry(locator) {
      const source = vfs.getSource([...locator.path]);

      if (!source) return null;

      if (source instanceof Map) return renderDirectory(locator, vfs);
      return createFileEntry(locator, vfs);
    },

    typeByEntry(entry) {
      return typeByExtension(extname(entry.name));
    },
    userAgent: new UserAgent(),
  });
}

function renderDirectory(
  locator: FileSystemLocator,
  vfs: VirtualFileSystem,
): DirectoryEntry {
  return {
    get children(): PartialSet<FileSystemEntry> {
      return {
        append(item) {
          const paths = [...locator.path].concat(item.name);

          if (isDirectoryEntry(item)) vfs.createDirectory(paths);
          else vfs.createFile(paths);
        },
        remove(item) {
          const paths = [...locator.path].concat(item.name);

          vfs.remove(paths);
        },

        get isEmpty(): boolean {
          for (const _ of this[Symbol.iterator]()) return false;

          return true;
        },

        *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
          for (const item of vfs.readDirectory([...locator.path])) {
            const path = locator.path.clone();
            path.append(item.name);

            if (item.isFile) {
              yield createFileEntry({
                kind: "file",
                root: locator.root,
                path,
              }, vfs);
            } else {
              yield renderDirectory({
                kind: "directory",
                root: locator.root,
                path,
              }, vfs);
            }
          }
        },
      };
    },
    name: locator.path[locator.path.size - 1],
    queryAccess() {
      return { permissionState: "granted", errorName: "" };
    },
    requestAccess() {
      return { permissionState: "granted", errorName: "" };
    },
  };
}

function createFileEntry(
  locator: FileSystemLocator,
  vfs: VirtualFileSystem,
): FileEntry {
  const paths = [...locator.path];

  return {
    get modificationTimestamp() {
      return vfs.stat(paths).lastModified;
    },

    name: locator.path[locator.path.size - 1],
    get binaryData() {
      return vfs.readFile(paths);
    },

    set binaryData(value: Uint8Array) {
      vfs.writeFile(paths, value);
    },

    lock: "open",
    queryAccess() {
      return { permissionState: "granted", errorName: "" };
    },
    requestAccess() {
      return { permissionState: "granted", errorName: "" };
    },
    sharedLockCount: 0,
  };
}
