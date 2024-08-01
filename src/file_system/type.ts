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
  name: string;

  /**
   * @see https://fs.spec.whatwg.org/#entry-query-access
   */
  queryAccess(
    mode: AccessMode,
  ): FileSystemAccessResult | Promise<FileSystemAccessResult>;

  /**
   * @see https://fs.spec.whatwg.org/#entry-request-access
   */
  requestAccess(
    mode: AccessMode,
  ): FileSystemAccessResult | Promise<FileSystemAccessResult>;
}

export type AccessMode = "read" | "readwrite";

export interface FileEntry extends BaseEntry {
  /**
   * @see https://fs.spec.whatwg.org/#file-entry-binary-data
   */
  binaryData: Uint8Array;

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
  children: FileSystemEntry[];
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
  permissionState: PermissionState;

  /** A string which must be the empty string if {@link permissionState permission state} is "granted"; otherwise an name listed in the DOMException names table. It is expected that in most cases when {@link permissionState permission state} is not "granted", this should be "NotAllowedError".
   * @see https://fs.spec.whatwg.org/#file-system-access-result-error-name
   */
  errorName: string;
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
  path: string[];

  /**
   * @see https://fs.spec.whatwg.org/#locator-kind
   */
  kind: FileSystemHandleKind;

  /**
   * @see https://fs.spec.whatwg.org/#locator-root
   */
  root: string;
}

/**
 * @see https://fs.spec.whatwg.org/#directory-locator
 */
export interface DirectoryLocator extends BaseLocator {
  /**
   * @see https://fs.spec.whatwg.org/#locator-kind
   */
  kind: "directory";
}

/**
 * @see https://fs.spec.whatwg.org/#file-locator
 */
export interface FileLocator extends BaseLocator {
  /**
   * @see https://fs.spec.whatwg.org/#locator-kind
   */
  kind: "file";
}

export interface UnderlyingFileSystem {
  create(entry: FileSystemEntry, locator: FileSystemLocator): void;
  remove(entry: FileSystemEntry, locator: FileSystemLocator): void;
  stream(
    entry: FileEntry,
    locator: FileSystemLocator,
  ): ReadableStream<Uint8Array>;
  write(locator: FileLocator, data: Uint8Array): void;
}

export interface IO {
  binaryData(locator: FileSystemLocator): Uint8Array;
  modificationTimestamp(locator: FileSystemLocator): number;
  queryAccess(
    locator: FileSystemLocator,
    mode: AccessMode,
  ): FileSystemAccessResult | Promise<FileSystemAccessResult>;
  requestAccess(
    locator: FileSystemLocator,
    mode: AccessMode,
  ): FileSystemAccessResult | Promise<FileSystemAccessResult>;
  children(locator: FileSystemLocator): FileSystemLocator[];
}
