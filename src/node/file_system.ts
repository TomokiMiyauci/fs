import { List, Set } from "@miyauci/infra";
import {
  closeSync,
  existsSync,
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
  type FileSystemEvent,
  type FileSystemObservation,
  type FileSystemPath,
  notifyObservations,
} from "../file_system.ts";
import type {
  DirectoryEntry as _DirectoryEntry,
  FileEntry as _FileEntry,
  FileSystemAccessResult,
  FileSystemEntry,
  PartialSet,
} from "../file_system_entry.ts";
import { isDirectoryEntry } from "../algorithm.ts";
import type { BucketFileSystem as _BucketFileSystem } from "../storage_manager.ts";

export class BucketFileSystem implements _BucketFileSystem {
  constructor(root: string = "") {
    this.root = resolve(root);
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

  exists(): boolean {
    return existsSync(this.root);
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

class FileEntry implements _FileEntry {
  constructor(private root: string, private path: string[]) {
    this.name = path[path.length - 1];
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

  readonly name: string;

  lock: "open" = "open";

  sharedLockCount: number = 0;

  requestAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }

  queryAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
}

class DirectoryEntry implements _DirectoryEntry {
  constructor(private root: string, private path: string[]) {
    this.name = path[path.length - 1];
  }

  readonly name: string;

  get children(): PartialSet<FileSystemEntry> {
    return new Effector(this.root, this.path);
  }

  requestAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }

  queryAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
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
