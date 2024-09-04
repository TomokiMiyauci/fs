/** File system related modules for Node.js runtime.
 *
 * @example Basic
 * ```ts
 * import { LocalFileSystem } from "@miyauci/fs/node";
 * const fs = new LocalFileSystem();
 * const handle = await fs.getDirectory();
 * const fileHandle = await handle.getFileHandle("file.txt", { create: true });
 * const file = await fileHandle.getFile();
 * const contents = await file.text();
 * ```
 *
 * @example With FileSystemObserver
 * ```ts
 * import {
 *   FileSystemObserver,
 *   type FileSystemObserverCallback,
 * } from "@miyauci/fs";
 * import { LocalFileSystem } from "@miyauci/fs/node";
 * declare const callback: FileSystemObserverCallback;
 * const fs = new LocalFileSystem();
 * const handle = await fs.getDirectory();
 * const observer = new FileSystemObserver(callback);
 * fs.watch();
 * await observer.observe(handle);
 * ```
 *
 * @module
 */

export { FileSystem, LocalFileSystem } from "./file_system.ts";
