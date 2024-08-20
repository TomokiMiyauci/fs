import { List } from "@miyauci/infra";
import {
  createFileSystemDirectoryHandle,
  type FileSystemDirectoryHandle,
} from "./file_system_directory_handle.ts";
import type { FileSystem } from "./file_system.ts";

export class StorageManager {
  constructor(private fileSystem: FileSystem) {}

  /** Returns the root directory of the bucket file system.
   *
   * [File System Standard](https://fs.spec.whatwg.org/#dom-storagemanager-getdirectory)
   */
  getDirectory(): Promise<FileSystemDirectoryHandle> {
    // 4. Let fileSystem be bucket file system's root.
    const root = this.fileSystem;

    // 5. Let path be « the empty string ».
    const path = new List<string>([""]);

    // 6. Let handle be the result of creating a new FileSystemDirectoryHandle. given root and path in the current realm.
    const handle = createFileSystemDirectoryHandle(root, path);

    return Promise.resolve(handle);
  }
}
