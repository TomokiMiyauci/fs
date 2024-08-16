import { Set } from "@miyauci/infra";
import type {
  FileSystemObserver,
  ParallelQueue as _ParallelQueue,
  UserAgent as _UserAgent,
} from "./observer.ts";

export class UserAgent implements _UserAgent {
  pendingFileSystemObservers: Set<FileSystemObserver> = new Set();
  fileSystemObserverMicrotaskQueued: boolean = false;
  fileSystemQueue: ParallelQueue = new ParallelQueue();
  storageTask: ParallelQueue = new ParallelQueue();
}

export class ParallelQueue implements _ParallelQueue {
  enqueue(algorithm: () => void): void {
    queueMicrotask(algorithm);
  }
}
