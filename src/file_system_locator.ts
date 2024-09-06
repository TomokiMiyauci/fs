import { List, range } from "@miyauci/infra";
import type { FileSystemEntry } from "./file_system_entry.ts";
import type { FileSystem, FileSystemPath } from "./file_system.ts";
import { isFileEntry } from "./algorithm.ts";

/**
 * [File System Standard](https://whatpr.org/fs/165.html#directory-locator)
 */
export interface DirectoryLocator {
  /**
   * [File System Standard](https://whatpr.org/fs/165.html#locator-path)
   */
  readonly path: FileSystemPath;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#locator-root)
   */
  readonly fileSystem: FileSystem;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemhandlekind-directory)
   */
  readonly kind: "directory";
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-locator)
 */
export interface FileLocator {
  /**
   * [File System Standard](https://whatpr.org/fs/165.html#locator-path)
   */
  readonly path: FileSystemPath;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#locator-root)
   */
  readonly fileSystem: FileSystem;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemhandlekind-file)
   */
  readonly kind: "file";
}

/** A potential location of a {@link FileSystemEntry file system entry}.
 *
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-locator)
 */
export type FileSystemLocator = FileLocator | DirectoryLocator;

/**
 * [File System Standard](https://whatpr.org/fs/165.html#locator-resolve)
 */
export function resolve(
  child: FileSystemLocator,
  root: FileSystemLocator,
): List<string> | null {
  // 1. Let relationship be the result of getting the relationship between root and child.
  const relationship = getRelationship(root, child);

  // 2. If relationship is equal to "other" or "ancestor", return null.
  if (relationship === "other" || relationship === "ancestor") return null;

  // 3. If relationship is equal to "self", return « ».
  if (relationship === "self") return new List();

  // 4. Let childPath be child’s path.
  const childPath = child.path;

  // 5. Let rootPath be root’s path.
  const rootPath = root.path;

  // 6. Let relativePath be « ».
  const relativePath = new List<string>();

  // 7. For each index of the range from rootPath’s size to childPath’s size, exclusive, append childPath[index] to relativePath.
  for (const index of range(rootPath.size, childPath.size, "exclusive")) {
    relativePath.append(childPath[index]);
  }

  // 8. Return relativePath.
  return relativePath;
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-locator-get-the-relationship)
 */
export function getRelationship(
  self: FileSystemLocator,
  related: FileSystemLocator,
):
  | "self"
  | "other"
  | "ancestor"
  | "direct child"
  | "descendant" {
  // 1. If self’s file system is not related’s file system, return "other".
  if (self.fileSystem !== related.fileSystem) return "other";

  // 2. Let selfPath be self’s path.
  const selfPath = self.path;

  // 3. Let relatedPath be related’s path.
  const relatedPath = related.path;

  // 4. Let selfPathSize be selfPath’s size.
  const selfPathSize = selfPath.size;

  // 5. Let relatedPathSize be relatedPath’s size.
  const relatedPathSize = relatedPath.size;

  // 6. For each index of selfPath’s indices:
  for (const index of selfPath.indices()) {
    // 1. If index is greater than or equal to relatedPathSize, return "ancestor".
    if (relatedPathSize <= index) return "ancestor";

    // 2. If selfPath[index] is not relatedPath[index], return "other".
    if (selfPath[index] !== relatedPath[index]) return "other";
  }

  // 7. If selfPathSize equals relatedPathSize, return "self".
  if (selfPathSize === relatedPathSize) return "self";

  // 8. If selfPathSize + 1 equals relatedPathSize, return "direct child".
  if (selfPathSize + 1 === relatedPathSize) return "direct child";

  // 9. Return "descendant".
  return "descendant";
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#locating-an-entry)
 */
export function locateEntry(
  locator: FileSystemLocator,
): FileSystemEntry | null {
  // 1. Let fileSystem be locator’s file system.
  const fileSystem = locator.fileSystem;

  // 2. Let path be locator’s path.
  const path = locator.path;

  // 3. Let entry be the result of running fileSystem’s locate an entry given path.
  const entry = fileSystem.locateEntry(path);

  // 4. If entry is null, return null.
  if (entry === null) return null;

  // 5. If locator is a file locator, Assert: entry is a file entry.
  // 6. If locator is a directory locator, Assert: entry is a directory entry.

  // 7. Return entry.
  return entry;
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#getting-the-locator)
 */
export function getLocator(entry: FileSystemEntry): FileSystemLocator {
  // 1. Let fileSystem be entry’s file system.
  const fileSystem = entry.fileSystem;

  // 2. Let path be the result of running fileSystem’s get the path given entry.
  const path = fileSystem.getPath(entry);

  // 4. If entry is a file entry, set locator’s kind to "file".
  // 5. If entry is a directory entry, set locator’s kind to "directory".
  const kind = isFileEntry(entry) ? "file" : "directory";

  // 3. Let locator be a file system locator whose path is path and whose file system is fileSystem.
  const locator = { path, fileSystem, kind } satisfies FileSystemLocator;

  // 6. Return entry.
  return locator;
}
