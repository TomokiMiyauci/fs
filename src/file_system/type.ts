import { List, OrderedSet } from "@miyauci/infra";
import type { Agent } from "./observer.ts";

export interface FileSystemGetFileOptions {
  create?: boolean;
}

export interface FileSystemGetDirectoryOptions {
  create?: boolean;
}

export interface FileSystemRemoveOptions {
  recursive?: boolean;
}

export interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean;
}

/**
 * @see https://fs.spec.whatwg.org/#enumdef-filesystemhandlekind
 */
export type FileSystemHandleKind = "directory" | "file";

export type AllowSharedBufferSource = ArrayBuffer | ArrayBufferView;

export interface FileSystemReadWriteOptions {
  at?: number;
}

export type FileSystemWriteChunkType =
  | BufferSource
  | Blob
  | string
  | WriteParams;

export interface WriteParams {
  data?: BufferSource | Blob | string | null;
  position?: number | null;
  size?: number | null;
  type: WriteCommandType;
}

export type WriteCommandType = "seek" | "truncate" | "write";

export type PermissionState = "denied" | "granted" | "prompt";

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

export type PartialOrderedSet<T> = Pick<
  OrderedSet<T>,
  "append" | "isEmpty" | "remove" | typeof Symbol.iterator
>;

export interface DirectoryEntry extends BaseEntry {
  /** File system entries.
   * @see https://fs.spec.whatwg.org/#directory-entry-children
   */
  readonly children: PartialOrderedSet<FileSystemEntry>;
}

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

/** A potential location of a {@link FileSystemEntry file system entry}.
 *
 * @see https://fs.spec.whatwg.org/#file-system-locator
 */
export type FileSystemLocator = FileLocator | DirectoryLocator;

interface BaseLocator {
  /**
   * @see https://fs.spec.whatwg.org/#locator-path
   */
  readonly path: FileSystemPath;

  /**
   * @see https://fs.spec.whatwg.org/#locator-kind
   */
  readonly kind: FileSystemHandleKind;

  /**
   * @see https://fs.spec.whatwg.org/#locator-root
   */
  readonly root: FileSystemRoot;
}

/** A list of one or more strings.
 * @see https://fs.spec.whatwg.org/#file-system-path
 */
export type FileSystemPath = List<string>;

/** An opaque string whose value is implementation-defined.
 * @see https://fs.spec.whatwg.org/#file-system-root
 */
export type FileSystemRoot = string;

/**
 * @see https://fs.spec.whatwg.org/#directory-locator
 */
export interface DirectoryLocator extends BaseLocator {
  /**
   * @see https://fs.spec.whatwg.org/#locator-kind
   */
  readonly kind: "directory";
}

/**
 * @see https://fs.spec.whatwg.org/#file-locator
 */
export interface FileLocator extends BaseLocator {
  /**
   * @see https://fs.spec.whatwg.org/#locator-kind
   */
  readonly kind: "file";
}

export interface Definition {
  locateEntry(locator: FileSystemLocator): FileSystemEntry | null;

  agent: Agent;
}

export interface UserAgent {
  fileSystemQueue: ParallelQueue;
  storageTask: ParallelQueue;
}

export class ParallelQueue {
  enqueue(algorithm: () => void): void {
    queueMicrotask(algorithm);
  }
}
