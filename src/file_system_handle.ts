import { isSameLocator } from "./file_system_entry.ts";
import type { FileSystemLocator } from "./file_system_locator.ts";
import { userAgent } from "./implementation_defined.ts";

/**
 * [File System Standard](https://whatpr.org/fs/165.html#enumdef-filesystemhandlekind)
 */
export type FileSystemHandleKind = "directory" | "file";

/**
 * [File System Standard](https://whatpr.org/fs/165.html#filesystemhandle)
 */
export class FileSystemHandle {
  protected constructor() {}

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#filesystemhandle-locator)
   *
   * @internal
   */
  protected locator!: FileSystemLocator;

  /** Returns "file" if handle is a {@link FileSystemFileHandle}, or "directory" if handle is a {@link FileSystemDirectoryHandle}.
   *
   * This can be used to distinguish files from directories when iterating over the contents of a directory.
   *
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemhandle-kind)
   */
  get kind(): FileSystemHandleKind {
    // steps are to return this's locator's kind.
    return this.locator.kind;
  }

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemhandle-name)
   */
  get name(): string {
    // steps are to return the last item (a string) of this's locator's path.
    return this.locator.path[this.locator.path.size - 1];
  }

  /** Returns true if this handle and {@link other} represent the same file or directory.
   *
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemhandle-issameentry)
   */
  isSameEntry(other: FileSystemHandle): Promise<boolean> {
    // 1. Let realm be this's relevant Realm.

    // 2. Let p be a new promise in realm.
    const { promise, resolve } = Promise.withResolvers<boolean>();

    // 3. Enqueue the following steps to the file system queue:
    userAgent.fileSystemQueue.enqueue(() => {
      // 1. If this's locator is the same locator as other’s locator, resolve p with true.
      if (isSameLocator(this.locator, other.locator)) resolve(true);
      // 2. Otherwise resolve p with false.
      else resolve(false);
    });

    // 4. Return p.
    return promise;
  }
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#filesystemhandle-is-in-a-bucket-file-system)
 */
export function isInBucketFileSystem(handle: FileSystemHandle): boolean {
  return handle["locator"].path[0] === "";
}
