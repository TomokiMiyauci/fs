import type { FileSystemFileHandle } from "../src/file_system_file_handle.ts";
import {
  createNewFileSystemDirectoryHandle,
  type FileSystemDirectoryHandle,
} from "../src/file_system_directory_handle.ts";
import {
  type FileSystem,
  type FileSystemObservation,
  type FileSystemPath,
  notifyObservations,
} from "../src/file_system.ts";
import type {
  DirectoryEntry as IDirectoryEntry,
  FileEntry as IFileEntry,
  FileSystemAccessResult,
  FileSystemEntry,
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

    if (source instanceof Map) return new DirectoryEntry(this, path, this.vfs);

    return new FileEntry(this, path, this.vfs);
  }

  root: string = "";
  observations: Set<FileSystemObservation> = new Set();

  getDirectory(): Promise<FileSystemDirectoryHandle> {
    return Promise.resolve(
      createNewFileSystemDirectoryHandle(this, new List([""])),
    );
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

class DirectoryEntry implements IDirectoryEntry {
  protected vfs: _VirtualFileSystem;
  protected path: FileSystemPath;
  constructor(
    fileSystem: FileSystem,
    path: FileSystemPath,
    vfs: _VirtualFileSystem,
  ) {
    this.vfs = vfs;
    this.path = path;
    this.fileSystem = fileSystem;
  }
  get children(): Effector {
    return new Effector(this.fileSystem, this.path, this.vfs);
  }

  get name(): string {
    return this.path[this.path.size - 1];
  }

  get parent(): DirectoryEntry | null {
    const head = [...this.path].slice(0, -1);

    return head.length
      ? new DirectoryEntry(this.fileSystem, new List(head), this.vfs)
      : null;
  }

  readonly fileSystem: FileSystem;

  queryAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
  requestAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
}

class Effector implements
  Pick<
    Set<FileSystemEntry>,
    "append" | "remove" | "isEmpty" | typeof Symbol.iterator
  > {
  protected fileSystem: FileSystem;
  protected vfs: _VirtualFileSystem;
  protected path: FileSystemPath;

  constructor(
    fileSystem: FileSystem,
    path: FileSystemPath,
    vfs: _VirtualFileSystem,
  ) {
    this.vfs = vfs;
    this.path = path;
    this.fileSystem = fileSystem;
  }

  append(item: FileSystemEntry) {
    const paths = [...this.path].concat(item.name);

    if (isDirectoryEntry(item)) this.vfs.createDirectory(paths);
    else this.vfs.createFile(paths);
  }

  remove(item: FileSystemEntry) {
    const paths = [...this.path].concat(item.name);

    this.vfs.remove(paths);
  }

  get isEmpty(): boolean {
    for (const _ of this[Symbol.iterator]()) return false;

    return true;
  }

  *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
    for (const item of this.vfs.readDirectory([...this.path])) {
      const path = this.path.clone();
      path.append(item.name);

      if (item.isFile) {
        yield new FileEntry(this.fileSystem, path, this.vfs);
      } else {
        yield new DirectoryEntry(this.fileSystem, path, this.vfs);
      }
    }
  }
}

class FileEntry implements IFileEntry {
  constructor(
    fileSystem: FileSystem,
    protected path: FileSystemPath,
    protected vfs: _VirtualFileSystem,
  ) {
    this.fileSystem = fileSystem;
  }

  get paths(): string[] {
    return [...this.path];
  }

  get modificationTimestamp() {
    return this.vfs.stat(this.paths).lastModified;
  }

  get name(): string {
    return this.path[this.path.size - 1];
  }

  readonly fileSystem: FileSystem;

  get parent(): DirectoryEntry | null {
    const head = this.paths.slice(0, -1);

    return head.length
      ? new DirectoryEntry(this.fileSystem, new List(head), this.vfs)
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
