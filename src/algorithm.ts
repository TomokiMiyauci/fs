import type { FileSystemHandleKind } from "./file_system_handle.ts";
import type { FileSystem, FileSystemPath } from "./file_system.ts";
import {
  createNewFileSystemFileHandle,
  type FileSystemFileHandle,
} from "./file_system_file_handle.ts";
import {
  createNewFileSystemDirectoryHandle,
  type FileSystemDirectoryHandle,
} from "./file_system_directory_handle.ts";
import type {
  DirectoryEntry,
  FileEntry,
  FileSystemEntry,
  ValidFileName,
} from "./file_system_entry.ts";

export function isDirectoryEntry(
  entry: FileSystemEntry,
): entry is DirectoryEntry {
  return "children" in entry;
}

export function isFileEntry(
  entry: FileSystemEntry,
): entry is FileEntry {
  return "binaryData" in entry;
}

export function isValidFileName(fileName: string): fileName is ValidFileName {
  // a string that is not an empty string, is not equal to "." or "..", and does not contain '/' or any other character used as path separator on the underlying platform.
  if (!fileName) return false;

  if (fileName === "." || fileName === "..") return false;

  if (fileName.includes("/") || fileName.includes("\\")) return false;

  return true;
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#creating-a-new-filesystemhandle)
 */
export function createNewFileSystemHandle(
  fileSystem: FileSystem,
  path: FileSystemPath,
  kind: FileSystemHandleKind,
): FileSystemFileHandle | FileSystemDirectoryHandle {
  // 1. If kind is "file":
  if (kind === "file") {
    // 2. Set changedHandle to the result of creating a new FileSystemFileHandle given fileSystem and path in realm.
    return createNewFileSystemFileHandle(fileSystem, path);

    // 2. Otherwise:
  } else {
    // 1. Set changedHandle to the result of creating a new FileSystemDirectoryHandle given fileSystem and path in realm.
    return createNewFileSystemDirectoryHandle(fileSystem, path);
  }
}
