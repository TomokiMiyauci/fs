import { List, Set } from "@miyauci/infra";
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
import { join, resolve } from "node:path";
import { type FSWatcher, watch } from "chokidar";
import {
  createNewFileSystemDirectoryHandle,
  type DirectoryEntry as _DirectoryEntry,
  type FileEntry as _FileEntry,
  type FileSystem as IFileSystem,
  type FileSystemAccessResult,
  type FileSystemDirectoryHandle,
  type FileSystemEntry,
  type FileSystemEvent,
  type FileSystemObservation,
  type FileSystemPath,
  notifyObservations,
  type PartialSet,
} from "@miyauci/fs";
import { isDirectoryEntry } from "../algorithm.ts";

export class FileSystem implements IFileSystem {
  constructor(root: string) {
    this.root = root;
  }

  root: string;

  locateEntry(path: FileSystemPath): FileSystemEntry | null {
    const fullPath = join(this.root, ...path);

    try {
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        return new DirectoryEntry(this.root, [...path]);
      } else if (stat.isFile()) {
        return new FileEntry(this.root, [...path]);
      }

      return null;
    } catch {
      return null;
    }
  }

  observations: Set<FileSystemObservation> = new Set();
}

export class LocalFileSystem extends FileSystem {
  constructor(root: string = "") {
    super(resolve(root));
  }

  getDirectory(): Promise<FileSystemDirectoryHandle> {
    return Promise.resolve(
      createNewFileSystemDirectoryHandle(this, new List([""])),
    );
  }

  watch(): void {
    if (this.#watcher) return;

    const watcher = watch(this.root, { persistent: true, ignoreInitial: true });

    watcher.on("all", (eventName, path) => {
      const event = createEvent(eventName, path, this.root);

      notifyObservations(this, new List([event]));
    });

    this.#watcher = watcher;
  }

  #watcher: FSWatcher | undefined;

  async unwatch(): Promise<void> {
    if (this.#watcher) {
      await this.#watcher.close();
      this.#watcher = undefined;
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.unwatch();
  }
}

function createEvent(
  eventName: "add" | "addDir" | "change" | "unlink" | "unlinkDir",
  path: string,
  root: string,
): FileSystemEvent {
  const relativePath = path.replace(root, "");
  const segments = relativePath.split("/");
  const modifiedPath = new List(segments);
  const baseEvent = { fromPath: null, modifiedPath };

  switch (eventName) {
    case "add":
      return { ...baseEvent, entryType: "file", type: "appeared" };

    case "addDir":
      return { ...baseEvent, entryType: "directory", type: "appeared" };

    case "change":
      return { ...baseEvent, entryType: "file", type: "modified" };

    case "unlink":
      return { ...baseEvent, entryType: "file", type: "disappeared" };

    case "unlinkDir":
      return { ...baseEvent, entryType: "directory", type: "disappeared" };
  }
}

class BaseEntry {
  constructor(protected root: string, protected path: string[]) {}

  get name(): string {
    return this.path[this.path.length - 1];
  }

  get parent(): DirectoryEntry | null {
    const head = this.path.slice(0, -1);

    return head.length ? new DirectoryEntry(this.root, head) : null;
  }

  requestAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }

  queryAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
}

class FileEntry extends BaseEntry implements _FileEntry {
  constructor(root: string, path: string[]) {
    super(root, path);
  }

  get #path(): string {
    return join(this.root, ...this.path);
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

class DirectoryEntry extends BaseEntry implements _DirectoryEntry {
  constructor(root: string, path: string[]) {
    super(root, path);
  }

  get children(): PartialSet<FileSystemEntry> {
    return new Effector(this.root, this.path);
  }
}

class Effector implements PartialSet<FileSystemEntry> {
  constructor(private root: string, private path: string[]) {}

  append(entry: FileSystemEntry): void {
    const fullPath = join(this.root, ...this.path, entry.name);

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
    const fullPath = join(this.root, ...this.path, entry.name);

    rmSync(fullPath, { recursive: true });
  }

  get isEmpty(): boolean {
    return isEmpty(this[Symbol.iterator]());
  }

  *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
    const fullPath = join(this.root, ...this.path);
    const iter = readdirSync(fullPath, { withFileTypes: true });

    for (const dirent of iter) {
      const name = dirent.name;
      const path = this.path.concat(name);

      if (dirent.isDirectory()) {
        yield new DirectoryEntry(this.root, path);
      } else if (dirent.isFile()) {
        yield new FileEntry(this.root, path);
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
