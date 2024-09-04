import type {
  FileSystemDirectoryHandle,
} from "./file_system_directory_handle.ts";

/**
 * [File System Standard](https://storage.spec.whatwg.org/#storagemanager)
 */
export interface StorageManager {
  /** Returns the root directory of the bucket file system.
   *
   * [File System Standard](https://fs.spec.whatwg.org/#dom-storagemanager-getdirectory)
   */
  getDirectory(): Promise<FileSystemDirectoryHandle>;
}
