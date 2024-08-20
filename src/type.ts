import type { FileSystemLocator } from "./file_system_locator.ts";

export interface UserAgent {
  fileSystemQueue: ParallelQueue;
  storageTask: ParallelQueue;
}

export interface ParallelQueue {
  enqueue(algorithm: () => void): void;
}

export type AllowSharedBufferSource = ArrayBuffer | ArrayBufferView;

export interface FileSystemHandleContext {
  locator: FileSystemLocator;
}

export interface FileSystemFileOrDirectoryHandleContext
  extends FileSystemHandleContext {
  // /** Specify the content type from the entry.
  //  *
  //  * Used for File API.
  //  */
  // typeByEntry(entry: FileEntry): string | undefined;
}
