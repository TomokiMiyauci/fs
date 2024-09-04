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
  type DirectoryEntry as IDirectoryEntry,
  type FileEntry as IFileEntry,
  type FileSystem as IFileSystem,
  type FileSystemAccessResult,
  type FileSystemDirectoryHandle,
  type FileSystemEntry,
  type FileSystemEvent,
  type FileSystemObservation,
  type FileSystemPath,
  List,
  notifyObservations,
  Set,
} from "@miyauci/fs";
import { isDirectoryEntry } from "../algorithm.ts";

/** {@link IFileSystem File system} for Node.js runtime. */
export class FileSystem implements IFileSystem {
  /**
   * Construct {@link FileSystem}.
   *
   * @param root Absolute path.
   *
   * @example Basic
   * ```ts
   * import { FileSystem } from "@miyauci/fs/node";
   * const fs = new FileSystem("/path/to/dir");
   * ```
   */
  constructor(root: string) {
    this.root = root;
  }

  /** Root directory path. */
  root: string;

  /**
   * Locale {@link FileSystemEntry entry} from {@link FileSystemPath path}.
   */
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

  /** Set of observing {@link FileSystemObservation}. */
  observations: Set<FileSystemObservation> = new Set();
}

/**
 * Local file system manager.
 *
 * @example Basic
 * ```ts
 * import { LocalFileSystem } from "@miyauci/fs/node";
 *
 * const fs = new LocalFileSystem();
 * const handle = await fs.getDirectory();
 * ```
 *
 * @example Watching directory changes
 * ```ts
 * import { LocalFileSystem } from "@miyauci/fs/node";
 * const fs = new LocalFileSystem();
 *
 * fs.watch();
 * ```
 */
export class LocalFileSystem extends FileSystem {
  /**
   * If {@link root} is not specified, root becomes the current working directory.
   *
   * @example Absolute path
   * ```ts
   * import { LocalFileSystem } from "@miyauci/fs/node";
   *
   * const fs = new LocalFileSystem("/path/to/dir");
   * ```
   *
   * @example Relative path
   * ```ts
   * import { LocalFileSystem } from "@miyauci/fs/node";
   *
   * const fs = new LocalFileSystem("../");
   * ```
   */
  constructor(root: string = "") {
    super(resolve(root));
  }

  /**
   * Returns the root directory of the local file system.
   */
  getDirectory(): Promise<FileSystemDirectoryHandle> {
    return Promise.resolve(
      createNewFileSystemDirectoryHandle(this, new List([""])),
    );
  }

  /** Start to watch {@link root} directory.
   *
   * If {@link watch} has already been called, nothing is done.
   */
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

  /** End to watch {@link root} directory.
   *
   * If {@link watch} is not called, nothing is done.
   */
  async unwatch(): Promise<void> {
    if (this.#watcher) {
      await this.#watcher.close();
      this.#watcher = undefined;
    }
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

class FileEntry extends BaseEntry implements IFileEntry {
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

class DirectoryEntry extends BaseEntry implements IDirectoryEntry {
  constructor(root: string, path: string[]) {
    super(root, path);
  }

  get children(): Effector {
    return new Effector(this.root, this.path);
  }
}

class Effector implements
  Pick<
    Set<FileSystemEntry>,
    "append" | "remove" | "isEmpty" | typeof Symbol.iterator
  > {
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
