import type { FileSystemFileHandle } from "../src/file_system_file_handle.ts";
import type {
  FileSystemDirectoryHandle,
} from "../src/file_system_directory_handle.ts";
import type {
  DirectoryLocator,
  FileLocator,
  FileSystemLocator,
} from "../src/file_system_locator.ts";
import {
  type FileSystem,
  type FileSystemObservation,
  type FileSystemPath,
  notifyObservations,
} from "../src/file_system.ts";
import type {
  DirectoryEntry as _DirectoryEntry,
  FileEntry as _FileEntry,
  FileSystemAccessResult,
  FileSystemEntry,
  PartialSet,
} from "../src/file_system_entry.ts";
import type { FileSystemWriteChunkType } from "../src/file_system_writable_file_stream.ts";
import { isDirectoryEntry } from "../src/algorithm.ts";
import {
  type LockStatus,
  VirtualFileSystem as _VirtualFileSystem,
} from "./virtual.ts";
import type { FileSystemHandle } from "../src/file_system_handle.ts";
import { List, Set } from "@miyauci/infra";
import { assert, assertEquals } from "@std/assert";
import type { FileSystemChangeRecord } from "../src/file_system_change_record.ts";

export interface ProvideContext {
  root: FileSystemDirectoryHandle;
  onAfterEach?(): void;
}

export interface Provider {
  (): ProvideContext | Promise<ProvideContext>;
}

export interface Context {
  root: FileSystemDirectoryHandle;
  onAfterEach?: VoidFunction;
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

export class VirtualFileSystem implements FileSystem {
  private vfs: _VirtualFileSystem;

  constructor() {
    const vfs = new _VirtualFileSystem();
    vfs.createDirectory([""]);

    this.vfs = vfs;
  }

  locateEntry(path: FileSystemPath): FileSystemEntry | null {
    const source = this.vfs.getSource([...path]);

    if (!source) return null;

    if (source instanceof Map) {
      return new DirectoryEntry(
        { kind: "directory", path, fileSystem: this },
        this.vfs,
      );
    }

    return new FileEntry({ kind: "file", path, fileSystem: this }, this.vfs);
  }

  root: string = "";
  observations: Set<FileSystemObservation> = new Set();

  exists(): boolean {
    return true;
  }

  watch(): void {
    this.vfs.addEventListener("disappeared", ({ detail }) => {
      notifyObservations(
        this,
        new List([{
          type: "disappeared",
          entryType: detail.type,
          fromPath: null,
          modifiedPath: new List(detail.path),
        }]),
      );
    });
    this.vfs.addEventListener("appeared", ({ detail }) => {
      notifyObservations(
        this,
        new List([{
          type: "appeared",
          entryType: detail.type,
          fromPath: null,
          modifiedPath: new List(detail.path),
        }]),
      );
    });
    this.vfs.addEventListener("modified", ({ detail }) => {
      notifyObservations(
        this,
        new List([{
          type: "modified",
          entryType: detail.type,
          fromPath: null,
          modifiedPath: new List(detail.path),
        }]),
      );
    });
  }
}

class DirectoryEntry implements _DirectoryEntry {
  protected vfs: _VirtualFileSystem;
  protected locator: DirectoryLocator;
  constructor(locator: DirectoryLocator, vfs: _VirtualFileSystem) {
    this.vfs = vfs;
    this.locator = locator;
  }
  get children(): PartialSet<FileSystemEntry> {
    return new Effector(this.locator, this.vfs);
  }

  get name(): string {
    return this.locator.path[this.locator.path.size - 1];
  }

  get parent(): DirectoryEntry | null {
    const head = [...this.locator.path].slice(0, -1);

    return head.length
      ? new DirectoryEntry({
        kind: "directory",
        path: new List(head),
        fileSystem: this.locator.fileSystem,
      }, this.vfs)
      : null;
  }

  queryAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
  requestAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
}

class Effector implements PartialSet<FileSystemEntry> {
  protected vfs: _VirtualFileSystem;
  protected locator: FileSystemLocator;

  constructor(locator: FileSystemLocator, vfs: _VirtualFileSystem) {
    this.vfs = vfs;
    this.locator = locator;
  }

  append(item: FileSystemEntry) {
    const paths = [...this.locator.path].concat(item.name);

    if (isDirectoryEntry(item)) this.vfs.createDirectory(paths);
    else this.vfs.createFile(paths);
  }

  remove(item: FileSystemEntry) {
    const paths = [...this.locator.path].concat(item.name);

    this.vfs.remove(paths);
  }

  get isEmpty(): boolean {
    for (const _ of this[Symbol.iterator]()) return false;

    return true;
  }

  *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
    for (const item of this.vfs.readDirectory([...this.locator.path])) {
      const path = this.locator.path.clone();
      path.append(item.name);

      if (item.isFile) {
        yield new FileEntry({
          kind: "file",
          fileSystem: this.locator.fileSystem,
          path,
        }, this.vfs);
      } else {
        yield new DirectoryEntry({
          kind: "directory",
          fileSystem: this.locator.fileSystem,
          path,
        }, this.vfs);
      }
    }
  }
}

class FileEntry implements _FileEntry {
  constructor(
    protected locator: FileLocator,
    protected vfs: _VirtualFileSystem,
  ) {}

  get paths(): string[] {
    return [...this.locator.path];
  }

  get modificationTimestamp() {
    return this.vfs.stat(this.paths).lastModified;
  }

  get name(): string {
    return this.locator.path[this.locator.path.size - 1];
  }

  get parent(): DirectoryEntry | null {
    const head = this.paths.slice(0, -1);

    return head.length
      ? new DirectoryEntry({
        kind: "directory",
        path: new List(head),
        fileSystem: this.locator.fileSystem,
      }, this.vfs)
      : null;
  }

  get binaryData() {
    return this.vfs.readFile(this.paths);
  }
  set binaryData(value: Uint8Array) {
    this.vfs.writeFile(this.paths, value);
  }

  get lock(): Lock {
    const file = this.vfs.getFile(this.paths);
    const status = file.lock;

    return LockConverter.to(status);
  }
  set lock(value: Lock) {
    const status = LockConverter.from(value);

    const file = this.vfs.getFile(this.paths);
    file.lock = status;
  }

  get sharedLockCount(): number {
    return this.vfs.getFile(this.paths).sharedLock;
  }
  set sharedLockCount(value: number) {
    this.vfs.getFile(this.paths).sharedLock = value;
  }

  queryAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
  requestAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
}

type Lock = "open" | "taken-exclusive" | "taken-shared";

class LockConverter {
  static from(lock: Lock): LockStatus {
    switch (lock) {
      case "open":
        return "open";
      case "taken-exclusive":
        return "exclusive";
      case "taken-shared":
        return "shared";
    }
  }

  static to(status: LockStatus): Lock {
    switch (status) {
      case "open":
        return "open";
      case "shared":
        return "taken-shared";
      case "exclusive":
        return "taken-exclusive";
    }
  }
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
