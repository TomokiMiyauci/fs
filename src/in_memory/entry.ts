import type { FileSystem, FileSystemPath } from "../file_system.ts";
import type {
  DirectoryEntry as IDirectoryEntry,
  FileEntry as IFileEntry,
  FileSystemAccessResult,
  FileSystemEntry,
} from "../file_system_entry.ts";
import { isDirectoryEntry } from "../algorithm.ts";
import type {
  LockStatus,
  VirtualFileSystem as _VirtualFileSystem,
} from "./virtual.ts";
import { List, type Set } from "@miyauci/infra";

export class DirectoryEntry implements IDirectoryEntry {
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

export class FileEntry implements IFileEntry {
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
