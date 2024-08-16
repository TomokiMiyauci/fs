import { OrderedSet } from "@miyauci/infra";
import {
  FileSystemObserver,
  ParallelQueue as _ParallelQueue,
  UserAgent as _UserAgent,
} from "./observer.ts";

export class UserAgent implements _UserAgent {
  pendingFileSystemObservers: OrderedSet<FileSystemObserver> = new OrderedSet();
  fileSystemObserverMicrotaskQueued: boolean = false;
  fileSystemQueue: ParallelQueue = new ParallelQueue();
  storageTask: ParallelQueue = new ParallelQueue();
}

export class ParallelQueue implements _ParallelQueue {
  enqueue(algorithm: () => void): void {
    queueMicrotask(algorithm);
  }
}
