import { typeByExtension } from "@std/media-types";
import { extname } from "@std/path/extname";
import type { FileEntry } from "./file_system_entry.ts";

class UserAgent {
  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-queue)
   */
  fileSystemQueue: ParallelQueue = new ParallelQueue();

  storageTask: ParallelQueue = new ParallelQueue();
}

class ParallelQueue {
  enqueue(fn: VoidFunction): void {
    queueMicrotask(fn);
  }
}

export const userAgent = /* @__PURE__ */ new UserAgent();

/** Specify the content type from the entry. */
export function typeByEntry(entry: FileEntry): string | undefined {
  return typeByExtension(extname(entry.name));
}
