import type {
  DirectoryEntry,
  FileEntry,
  FileSystemEntry,
  FileSystemLocator,
} from "./type.ts";
import type { UserAgent } from "./observer.ts";
import { List, range } from "@miyauci/infra";

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

export function isDirectoryEntry(
  entry: FileSystemEntry,
): entry is DirectoryEntry {
  return "children" in entry;
}

export function isFileEntry(
  entry: FileSystemEntry,
): entry is FileEntry {
  return "binaryData" in entry;
}

/**
 * @see https://fs.spec.whatwg.org/#locator-resolve
 */
export function resolveLocator(
  child: FileSystemLocator,
  root: FileSystemLocator,
  userAgent: UserAgent,
): Promise<List<string> | null> {
  // 1. Let result be a new promise.
  const { promise, resolve } = Promise.withResolvers<List<string> | null>();

  // 2. Enqueue the following steps to the file system queue:
  userAgent.fileSystemQueue.enqueue(() => {
    // 1. If child’s locator's root is not root’s locator's root, resolve result with null, and abort these steps. // maybe type miss
    // 1. If child’s root is not root’s root, resolve result with null, and abort these steps.
    if (child.root !== root.root) return resolve(null);

    // 2. Let childPath be child’s path.
    const childPath = child.path;

    // 3. Let rootPath be root’s path.
    const rootPath = root.path;

    // 4. If childPath is the same path as rootPath, resolve result with « », and abort these steps.
    if (isSamePath(childPath, rootPath)) return resolve(new List());

    // 5. If rootPath’s size is greater than childPath’s size, resolve result with null, and abort these steps.
    if (rootPath.size > childPath.size) return resolve(null);

    // 6. For each index of rootPath’s indices:
    for (const index of rootPath.indices()) {
      // 1. If rootPath.\[[index]] is not childPath.\[[index]], then resolve result with null, and abort these steps.
      if (rootPath[index] !== childPath[index]) return resolve(null);
    }

    // 7. Let relativePath be « ».
    const relativePath = new List<string>();

    // 8. For each index of the range from rootPath’s size to rootPath’s size, exclusive, append childPath.\[[index]] to relativePath.
    for (const index of range(rootPath.size, childPath.size, "exclusive")) {
      relativePath.append(childPath[index]);
    }

    // 9. Resolve result with relativePath.
    resolve(relativePath);
  });

  // 3. Return result.
  return promise;
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
  return a.kind === b.kind && a.root === b.root && isSamePath(a.path, b.path);
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
