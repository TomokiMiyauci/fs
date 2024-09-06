import { List, Set } from "@miyauci/infra";
import { join } from "@std/path/join";
import { parse } from "@std/path/parse";
import { resolve } from "@std/path/resolve";
import {
  createNewFileSystemDirectoryHandle,
  type FileSystem as IFileSystem,
  type FileSystemDirectoryHandle,
  type FileSystemEntry,
  type FileSystemObservation,
  type FileSystemPath,
  notifyObservations,
} from "@miyauci/fs";
import { Watcher } from "./watcher.ts";
import { FileEntry } from "./file_entry.ts";
import { DirectoryEntry } from "./directory_entry.ts";
import { FsEventConverter } from "./util.ts";
import { allEvents } from "./constant.ts";
import { Msg } from "../constant.ts";
import { isDirectoryEntry } from "../algorithm.ts";

/** {@link IFileSystem File system} for Deno runtime. */
export class FileSystem implements IFileSystem {
  /**
   * Construct {@link FileSystem}.
   *
   * @param root Absolute path.
   *
   * @example Basic
   * ```ts
   * import { FileSystem } from "@miyauci/fs/deno";
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
   *
   * Required `allow-read` permission.
   */
  locateEntry(path: FileSystemPath): FileSystemEntry | null {
    const fullPath = join(this.root, ...path);

    try {
      const stat = Deno.statSync(fullPath);

      if (stat.isFile) return new FileEntry(this, [...path]);
      if (stat.isDirectory) return new DirectoryEntry(this, [...path]);

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Return {@link FileSystemPath path} from {@link FileSystemEntry entry}.
   */
  getPath(entry: FileSystemEntry): FileSystemPath {
    const path = new List([entry.name]);
    let parent = entry.parent;

    while (parent) {
      path.prepend(parent.name);

      parent = parent.parent;
    }

    return path;
  }

  /** Set of observing {@link FileSystemObservation}. */
  observations: Set<FileSystemObservation> = new Set();
}

/**
 * Local file system manager.
 *
 * @example Basic
 * ```ts
 * import { LocalFileSystem } from "@miyauci/fs/deno";
 *
 * const fs = new LocalFileSystem();
 * const handle = await fs.getDirectory();
 * ```
 *
 * @example Watching directory changes
 * ```ts
 * import { LocalFileSystem } from "@miyauci/fs/deno";
 * const fs = new LocalFileSystem();
 *
 * fs.watch();
 * ```
 */
export class LocalFileSystem extends FileSystem {
  #listener: FsCallback;
  #watcher: Watcher;
  #base: string;

  /**
   * If {@link root} is not specified, root becomes the current working directory.
   *
   * @example Absolute path
   * ```ts
   * import { LocalFileSystem } from "@miyauci/fs/deno";
   *
   * const fs = new LocalFileSystem("/path/to/dir");
   * ```
   *
   * @example Relative path
   * ```ts
   * import { LocalFileSystem } from "@miyauci/fs/deno";
   *
   * const fs = new LocalFileSystem("../");
   * ```
   */
  constructor(root: string = "") {
    const fullPath = resolve(root);
    const { dir: rootPath, base } = parse(fullPath);

    super(rootPath);

    this.#base = base;
    this.#listener = (ev: CustomEvent<Deno.FsEvent>): void => {
      const events = FsEventConverter.toFileSystemEvents(fullPath, ev.detail);

      notifyObservations(this, new List(events));
    };

    this.#watcher = new Watcher(fullPath, { recursive: true });
  }

  /**
   * Returns the root directory of the local file system.
   *
   * @throws {DOMException}
   * - If the entry of {@link root} does not exist.
   * - If the entry of {@link root} is not directory.
   */
  getDirectory(): Promise<FileSystemDirectoryHandle> {
    const path = new List([this.#base]);
    const entry = this.locateEntry(path);

    if (!entry) {
      return Promise.reject(new DOMException(Msg.NotFound, "NotFound"));
    }

    if (!isDirectoryEntry(entry)) {
      return Promise.reject(
        new DOMException(Msg.Mismatch, "TypeMismatchError"),
      );
    }

    return Promise.resolve(
      createNewFileSystemDirectoryHandle(this, path),
    );
  }

  /** Start to watch {@link root} directory.
   *
   * If {@link watch} has already been called, nothing is done.
   */
  watch(): void {
    for (const eventType of allEvents) {
      this.#watcher.addEventListener(eventType, this.#listener);
    }

    this.#watcher.watch();
  }

  /** End to watch {@link root} directory.
   *
   * If {@link watch} is not called, nothing is done.
   */
  unwatch(): void {
    for (const eventType of allEvents) {
      this.#watcher.removeEventListener(eventType, this.#listener);
    }

    this.#watcher.unwatch();
  }
}

interface FsCallback {
  (event: CustomEvent<Deno.FsEvent>): void;
}
