import type { FileSystemFileHandle } from "../src/file_system_file_handle.ts";
import {
  createFileSystemDirectoryHandle,
  type FileSystemDirectoryHandle,
} from "../src/file_system_directory_handle.ts";
import type { FileSystemLocator } from "../src/file_system_locator.ts";
import { type FileSystem, notifyObservations } from "../src/file_system.ts";
import type {
  DirectoryEntry,
  FileEntry,
  FileSystemEntry,
  PartialSet,
} from "../src/file_system_entry.ts";
import type { FileSystemWriteChunkType } from "../src/file_system_writable_file_stream.ts";
import { isDirectoryEntry } from "../src/algorithm.ts";
import { VirtualFileSystem } from "./virtual.ts";
import type { FileSystemHandle } from "../src/file_system_handle.ts";
import { List, Set } from "@miyauci/infra";
import { assert, assertEquals } from "@std/assert";
import type { FileSystemChangeRecord } from "../src/file_system_change_record.ts";

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
  return handle.getFileHandle(name, { create: true });
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
  const fileSystem = {
    locateEntry(path) {
      const source = vfs.getSource([...path]);

      if (!source) return null;

      if (source instanceof Map) {
        return renderDirectory(
          { kind: "directory", path, fileSystem: this },
          vfs,
        );
      }
      return createFileEntry({ kind: "file", path, fileSystem: this }, vfs);
    },
    root: "",
    observations: new Set(),
  } satisfies FileSystem;

  const vfs = new VirtualFileSystem();

  vfs.addEventListener("disappeared", ({ detail }) => {
    notifyObservations(
      fileSystem,
      new List([{
        type: "disappeared",
        entryType: detail.type,
        fromPath: null,
        modifiedPath: new List(detail.path),
      }]),
    );
  });
  vfs.addEventListener("appeared", ({ detail }) => {
    notifyObservations(
      fileSystem,
      new List([{
        type: "appeared",
        entryType: detail.type,
        fromPath: null,
        modifiedPath: new List(detail.path),
      }]),
    );
  });
  vfs.addEventListener("modified", ({ detail }) => {
    notifyObservations(
      fileSystem,
      new List([{
        type: "modified",
        entryType: detail.type,
        fromPath: null,
        modifiedPath: new List(detail.path),
      }]),
    );
  });

  vfs.createDirectory([""]);

  return createFileSystemDirectoryHandle(fileSystem, new List([""]));
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
                fileSystem: locator.fileSystem,
                path,
              }, vfs);
            } else {
              yield renderDirectory({
                kind: "directory",
                fileSystem: locator.fileSystem,
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

export async function assertEqualRecords(
  root: FileSystemHandle,
  actual: FileSystemChangeRecord[],
  expected: FileSystemChangeRecord[],
): Promise<void> {
  assertEquals(
    actual.length,
    expected.length,
    "Received an unexpected number of events",
  );

  for (let i = 0; i < actual.length; i++) {
    const actual_record = actual[i];
    const expected_record = expected[i];

    assertEquals(
      actual_record.type,
      expected_record.type,
      "A record's type didn't match the expected type",
    );

    assertEquals(
      actual_record.relativePathComponents,
      expected_record.relativePathComponents,
      "A record's relativePathComponents didn't match the expected relativePathComponents",
    );

    if (expected_record.relativePathMovedFrom) {
      assertEquals(
        actual_record.relativePathMovedFrom,
        expected_record.relativePathMovedFrom,
        "A record's relativePathMovedFrom didn't match the expected relativePathMovedFrom",
      );
    } else {
      assertEquals(
        actual_record.relativePathMovedFrom,
        null,
        "A record's relativePathMovedFrom was set when it shouldn't be",
      );
    }

    assert(
      await actual_record.changedHandle.isSameEntry(
        expected_record.changedHandle,
      ),
      "A record's changedHandle didn't match the expected changedHandle",
    );
    assert(
      await actual_record.root.isSameEntry(root),
      "A record's root didn't match the expected root",
    );
  }
}
