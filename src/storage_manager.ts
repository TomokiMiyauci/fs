import { List } from "@miyauci/infra";
import {
  createFileSystemDirectoryHandle,
  type FileSystemDirectoryHandle,
} from "./file_system_directory_handle.ts";
import { UserAgent } from "./helper.ts";
import { typeByExtension } from "@std/media-types";
import { extname } from "@std/path/extname";
import type { StorageManagerContext } from "./type.ts";

export class StorageManager {
  constructor(private context: StorageManagerContext) {}

  /** Returns the root directory of the bucket file system.
   *
   * [File System Standard](https://fs.spec.whatwg.org/#dom-storagemanager-getdirectory)
   */
  getDirectory(): Promise<FileSystemDirectoryHandle> {
    // 4. Let root be an implementation-defined opaque string.
    const root = this.context.root;

    // 5. Let path be « the empty string ».
    const path = new List<string>([""]);

    // 6. Let handle be the result of creating a new FileSystemDirectoryHandle. given root and path in the current realm.
    const handle = createFileSystemDirectoryHandle(root, path, {
      typeByEntry: (entry) => {
        return typeByExtension(extname(entry.name));
      },
      userAgent: new UserAgent(),
      locateEntry: this.context.locateEntry.bind(this.context),
    });

    return Promise.resolve(handle);
  }
}
