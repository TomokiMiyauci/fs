import { List, Set } from "@miyauci/infra";
import { join } from "@std/path/join";
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

      if (stat.isFile) return new FileEntry(this.root, [...path]);
      if (stat.isDirectory) return new DirectoryEntry(this.root, [...path]);

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
    const rootPath = resolve(root);

    super(rootPath);

    this.#listener = (ev: CustomEvent<Deno.FsEvent>): void => {
      const events = FsEventConverter.toFileSystemEvents(rootPath, ev.detail);

      notifyObservations(this, new List(events));
    };

    this.#watcher = new Watcher(rootPath, { recursive: true });
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
