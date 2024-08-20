import type { FileEntry } from "./file_system_entry.ts";
import { typeByExtension } from "@std/media-types";
import { extname } from "@std/path/extname";

class UserAgent {
  fileSystemQueue: ParallelQueue = new ParallelQueue();
  storageTask: ParallelQueue = new ParallelQueue();
}

class ParallelQueue {
  enqueue(fn: VoidFunction) {
    queueMicrotask(fn);
  }
}

export const userAgent = new UserAgent();

export function typeByEntry(entry: FileEntry): string | undefined {
  return typeByExtension(extname(entry.name));
}
