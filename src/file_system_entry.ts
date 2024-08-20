import type { FileSystemLocator } from "./file_system_locator.ts";
import type { List, Set } from "@miyauci/infra";

interface BaseEntry {
  /**
   * @see https://fs.spec.whatwg.org/#entry-name
   */
  readonly name: string;

  /**
   * @see https://fs.spec.whatwg.org/#entry-query-access
   */
  queryAccess(mode: AccessMode): FileSystemAccessResult;

  /**
   * @see https://fs.spec.whatwg.org/#entry-request-access
   */
  requestAccess(mode: AccessMode): FileSystemAccessResult;
}

export type AccessMode = "read" | "readwrite";

export interface FileEntry extends BaseEntry {
  /**
   * @see https://fs.spec.whatwg.org/#file-entry-binary-data
   */
  get binaryData(): Uint8Array;
  set binaryData(value: Uint8Array);

  /** A number representing the number of milliseconds since the Unix Epoch.
   * @see https://fs.spec.whatwg.org/#file-entry-modification-timestamp
   */
  modificationTimestamp: number;

  /**
   * @see https://fs.spec.whatwg.org/#file-entry-lock
   */
  lock: "open" | "taken-exclusive" | "taken-shared";

  /** A number representing the number shared locks that are taken at a given point in time
   * @see https://fs.spec.whatwg.org/#file-entry-shared-lock-count
   */
  sharedLockCount: number;
}

export interface DirectoryEntry extends BaseEntry {
  /** File system entries.
   * @see https://fs.spec.whatwg.org/#directory-entry-children
   */
  readonly children: PartialSet<FileSystemEntry>;
}

export type PartialSet<T> = Pick<
  Set<T>,
  "append" | "isEmpty" | "remove" | typeof Symbol.iterator
>;

/**
 * @see https://fs.spec.whatwg.org/#entry
 */
export type FileSystemEntry = FileEntry | DirectoryEntry;

/** Struct encapsulating the result of {@link BaseEntry.queryAccess querying} or {@link BaseEntry.requestAccess requesting} access to the file system.
 * @see https://fs.spec.whatwg.org/#file-system-access-result
 */
export interface FileSystemAccessResult {
  /**
   * @see https://fs.spec.whatwg.org/#file-system-access-result-permission-state
   */
  readonly permissionState: PermissionState;

  /** A string which must be the empty string if {@link permissionState permission state} is "granted"; otherwise an name listed in the DOMException names table. It is expected that in most cases when {@link permissionState permission state} is not "granted", this should be "NotAllowedError".
   * @see https://fs.spec.whatwg.org/#file-system-access-result-error-name
   */
  readonly errorName: string;
}

/**
 * [Permissions](https://w3c.github.io/permissions/#dom-permissionstate)
 */
export type PermissionState = "denied" | "granted" | "prompt";

/**
 * @see https://fs.spec.whatwg.org/#valid-file-name
 */
export function isValidFileName(fileName: string): boolean {
  // a string that is not an empty string, is not equal to "." or "..", and does not contain '/' or any other character used as path separator on the underlying platform.
  if (!fileName) return false;

  if (fileName === "." || fileName === "..") return false;

  if (fileName.includes("/") || fileName.includes("\\")) return false;

  return true;
}

/**
 * @see https://fs.spec.whatwg.org/#file-entry-lock-take
 */
export function takeLock(
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
 * @see https://fs.spec.whatwg.org/#file-entry-lock-release
 */
export function releaseLock(file: FileEntry): void {
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
 * @see https://fs.spec.whatwg.org/#file-system-path-the-same-path-as
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
 * @see https://fs.spec.whatwg.org/#file-system-locator-the-same-locator-as
 */
export function isSameLocator(
  a: FileSystemLocator,
  b: FileSystemLocator,
): boolean {
  // if a’s kind is b’s kind, a’s root is b’s root, and a’s path is the same path as b’s path.
  return a.kind === b.kind && a.fileSystem === b.fileSystem &&
    isSamePath(a.path, b.path);
}
