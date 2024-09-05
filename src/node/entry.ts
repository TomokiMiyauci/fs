import {
  closeSync,
  futimesSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { join } from "node:path";
import type {
  DirectoryEntry as IDirectoryEntry,
  FileEntry as IFileEntry,
  FileSystem,
  FileSystemAccessResult,
  FileSystemEntry,
} from "@miyauci/fs";
import type { Set } from "@miyauci/infra";
import { isDirectoryEntry } from "../algorithm.ts";

class BaseEntry {
  constructor(fileSystem: FileSystem, protected path: string[]) {
    this.fileSystem = fileSystem;
  }

  get name(): string {
    return this.path[this.path.length - 1];
  }

  get parent(): DirectoryEntry | null {
    const head = this.path.slice(0, -1);

    return head.length ? new DirectoryEntry(this.fileSystem, head) : null;
  }

  readonly fileSystem: FileSystem;

  requestAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }

  queryAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
}

export class FileEntry extends BaseEntry implements IFileEntry {
  constructor(fileSystem: FileSystem, path: string[]) {
    super(fileSystem, path);
  }

  get #path(): string {
    return join(this.fileSystem.root, ...this.path);
  }

  get binaryData(): Uint8Array {
    return readFileSync(this.#path);
  }
  set binaryData(value: Uint8Array) {
    writeFileSync(this.#path, value);
  }

  get modificationTimestamp(): number {
    return statSync(this.#path).mtime?.getTime() ?? Date.now(); // mtime may not be defined for some OS.
  }

  lock: "open" = "open";

  sharedLockCount: number = 0;
}

export class DirectoryEntry extends BaseEntry implements IDirectoryEntry {
  constructor(fileSystem: FileSystem, path: string[]) {
    super(fileSystem, path);
  }

  get children(): Effector {
    return new Effector(this.fileSystem, this.path);
  }
}

class Effector implements
  Pick<
    Set<FileSystemEntry>,
    "append" | "remove" | "isEmpty" | typeof Symbol.iterator
  > {
  constructor(private fileSystem: FileSystem, private path: string[]) {}

  append(entry: FileSystemEntry): void {
    const fullPath = join(this.fileSystem.root, ...this.path, entry.name);

    if (isDirectoryEntry(entry)) {
      mkdirSync(fullPath);
    } else {
      const fd = openSync(fullPath, "wx");

      writeSync(fd, entry.binaryData);
      futimesSync(fd, entry.modificationTimestamp, entry.modificationTimestamp);
      closeSync(fd);
    }
  }

  remove(entry: FileSystemEntry): void {
    const fullPath = join(this.fileSystem.root, ...this.path, entry.name);

    rmSync(fullPath, { recursive: true });
  }

  get isEmpty(): boolean {
    return isEmpty(this[Symbol.iterator]());
  }

  *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
    const fullPath = join(this.fileSystem.root, ...this.path);
    const iter = readdirSync(fullPath, { withFileTypes: true });

    for (const dirent of iter) {
      const name = dirent.name;
      const path = this.path.concat(name);

      if (dirent.isDirectory()) {
        yield new DirectoryEntry(this.fileSystem, path);
      } else if (dirent.isFile()) {
        yield new FileEntry(this.fileSystem, path);
      }
    }
  }
}

function isEmpty(iter: Iterable<unknown>): boolean {
  for (const _ of iter) {
    return false;
  }

  return true;
}
