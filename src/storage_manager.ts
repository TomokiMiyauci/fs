import { List } from "@miyauci/infra";
import {
  createNewFileSystemDirectoryHandle,
  type FileSystemDirectoryHandle,
} from "./file_system_directory_handle.ts";
import type { FileSystem } from "./file_system.ts";
import { Msg } from "./constant.ts";

export interface BucketFileSystem extends FileSystem {
  /** Whether underlying file system exists or not. */
  exists(): boolean;
}

/**
 * [File System Standard](https://storage.spec.whatwg.org/#storagemanager)
 */
export class StorageManager {
  constructor(private fileSystem: BucketFileSystem) {}

  /** Returns the root directory of the bucket file system.
   *
   * @throws {DOMException}
   * - If file system root does not exist.
   *
   * [File System Standard](https://fs.spec.whatwg.org/#dom-storagemanager-getdirectory)
   */
  getDirectory(): Promise<FileSystemDirectoryHandle> {
    const exists = this.fileSystem.exists();

    if (!exists) {
      return Promise.reject(new DOMException(Msg.Insecure, "SecurityError"));
    }

    // 4. Let fileSystem be bucket file system's root.
    const root = this.fileSystem;

    // 5. Let path be « the empty string ».
    const path = new List<string>([""]);

    // 6. Let handle be the result of creating a new FileSystemDirectoryHandle. given root and path in the current realm.
    const handle = createNewFileSystemDirectoryHandle(root, path);

    return Promise.resolve(handle);
  }
}
