import { statSync } from "node:fs";
import { join, parse, resolve } from "node:path";
import { type FSWatcher, watch } from "chokidar";
import {
  createNewFileSystemDirectoryHandle,
  type FileSystem as IFileSystem,
  type FileSystemDirectoryHandle,
  type FileSystemEntry,
  type FileSystemObservation,
  type FileSystemPath,
  notifyObservations,
} from "@miyauci/fs";
import { List, Set } from "@miyauci/infra";
import { DirectoryEntry, FileEntry } from "./entry.ts";
import { createEvent } from "./util.ts";
import { Msg } from "../constant.ts";
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
        return new DirectoryEntry(this, [...path]);
      } else if (stat.isFile()) {
        return new FileEntry(this, [...path]);
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
  #base: string;

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
    const fullPath = resolve(root);
    const { dir: rootPath, base } = parse(fullPath);

    super(rootPath);

    this.#base = base;
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
