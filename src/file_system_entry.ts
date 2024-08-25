import type { FileSystemLocator } from "./file_system_locator.ts";
import type { List, Set } from "@miyauci/infra";

interface BaseEntry {
  /**
   * [File System Standard](https://whatpr.org/fs/165.html#entry-name)
   */
  readonly name: string;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#entry-query-access)
   */
  queryAccess(mode: AccessMode): FileSystemAccessResult;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#entry-request-access)
   */
  requestAccess(mode: AccessMode): FileSystemAccessResult;
}

export type AccessMode = "read" | "readwrite";

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file)
 */
export interface FileEntry extends BaseEntry {
  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-entry-binary-data)
   */
  get binaryData(): Uint8Array;
  set binaryData(value: Uint8Array);

  /** A number representing the number of milliseconds since the Unix Epoch.
   *
   * [File System Standard](https://whatpr.org/fs/165.html#file-entry-modification-timestamp)
   */

  readonly modificationTimestamp: number;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-entry-lock)
   */
  get lock(): "open" | "taken-exclusive" | "taken-shared";
  set lock(value: "open" | "taken-exclusive" | "taken-shared");

  /** A number representing the number shared locks that are taken at a given point in time
   *
   * [File System Standard](https://whatpr.org/fs/165.html#file-entry-shared-lock-count)
   */
  get sharedLockCount(): number;
  set sharedLockCount(value: number);
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#directory)
 */
export interface DirectoryEntry extends BaseEntry {
  /** File system entries.
   *
   * [File System Standard](https://whatpr.org/fs/165.html#directory-entry-children)
   */
  readonly children: PartialSet<FileSystemEntry>;
}

export type PartialSet<T> = Pick<
  Set<T>,
  "append" | "isEmpty" | "remove" | typeof Symbol.iterator
>;

/**
 * [File System Standard](https://whatpr.org/fs/165.html#entry)
 */
export type FileSystemEntry = FileEntry | DirectoryEntry;

/** Struct encapsulating the result of {@link BaseEntry.queryAccess querying} or {@link BaseEntry.requestAccess requesting} access to the file system.
 *
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-access-result)
 */
export interface FileSystemAccessResult {
  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-access-result-permission-state)
   */
  readonly permissionState: PermissionState;

  /** A string which must be the empty string if {@link permissionState permission state} is "granted"; otherwise an name listed in the DOMException names table. It is expected that in most cases when {@link permissionState permission state} is not "granted", this should be "NotAllowedError".
   *
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-access-result-error-name)
   */
  readonly errorName: string;
}

/**
 * [Permissions](https://w3c.github.io/permissions/#dom-permissionstate)
 */
export type PermissionState = "denied" | "granted" | "prompt";

/**
 * [File System Standard](https://whatpr.org/fs/165.html#valid-file-name)
 */
export function isValidFileName(fileName: string): boolean {
  // a string that is not an empty string, is not equal to "." or "..", and does not contain '/' or any other character used as path separator on the underlying platform.
  if (!fileName) return false;

  if (fileName === "." || fileName === "..") return false;

  if (fileName.includes("/") || fileName.includes("\\")) return false;

  return true;
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-entry-lock-take)
 */
export function take(
  value: "exclusive" | "shared",
  file: FileEntry,
): "success" | "failure" {
  // 1. Let lock be the file’s lock.
  const lock = file.lock;

  // 2. Let count be the file’s shared lock count.

  // 3. If value is "exclusive":
  if (value === "exclusive") {
    // 1. If lock is "open":
    if (lock === "open") {
      // 1. Set lock to "taken-exclusive".
      file.lock = "taken-exclusive";

      // 2. Return "success".
      return "success";
    }
  }

  // 4. If value is "shared":
  if (value === "shared") {
    // 1. If lock is "open":
    if (lock === "open") {
      // 1. Set lock to "taken-shared".
      file.lock = "taken-shared";

      // 2. Set count to 1.
      file.sharedLockCount = 1;

      // 3. Return "success".
      return "success";

      // 2. Otherwise, if lock is "taken-shared":
    } else if (lock === "taken-shared") {
      // 1. Increase count by 1.
      file.sharedLockCount++;

      // 2. Return "success".
      return "success";
    }
  }

  // 5. Return "failure".
  return "failure";
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-entry-lock-release)
 */
export function release(file: FileEntry): void {
  // 1. Let lock be the file’s associated lock.
  // 2. Let count be the file’s shared lock count.

  // 3. If lock is "taken-shared":
  if (file.lock === "taken-shared") {
    // 1. Decrease count by 1.
    file.sharedLockCount--;

    // 2. If count is 0, set lock to "open".
    if (file.sharedLockCount === 0) file.lock = "open";
  } // 4. Otherwise, set lock to "open".
  else file.lock = "open";
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-entry-the-same-entry-as)
 */
export function isSamePath(a: List<string>, b: List<string>): boolean {
  // if a’s size is the same as b’s size and for each index of a’s indices a.\[[index]] is b.\[[index]].
  if (a.size !== b.size) return false;

  for (const index of a.indices()) {
    if (a[index] !== b[index]) return false;
  }

  return true;
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-locator-the-same-locator-as)
 */
export function isSameLocator(
  a: FileSystemLocator,
  b: FileSystemLocator,
): boolean {
  // if a’s kind is b’s kind, a’s root is b’s root, and a’s path is the same path as b’s path.
  return a.kind === b.kind && a.fileSystem === b.fileSystem &&
    isSamePath(a.path, b.path);
}
