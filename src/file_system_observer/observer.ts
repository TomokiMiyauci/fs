import {
  callback as $callback,
  FileSystemChangeRecord,
  FileSystemHandle,
  FileSystemObserver as _FileSystemObserver,
  FileSystemObserverCallback,
  FileSystemObserverObserveOptions,
  recordQueue as $recordQueue,
  registeredObserverList,
} from "@miyauci/file-system";
import { List, Queue } from "@miyauci/infra";
import { fileSystemHandleList as $fileSystemHandleList } from "./symbol.ts";

export class FileSystemObserver implements _FileSystemObserver {
  [$fileSystemHandleList]: List<WeakRef<FileSystemHandle>> = new List();

  [$callback]: FileSystemObserverCallback;
  [$recordQueue]: Queue<FileSystemChangeRecord> = new Queue();

  constructor(callback: FileSystemObserverCallback) {
    this[$callback] = callback;
  }

  observe(
    handle: FileSystemHandle,
    options?: FileSystemObserverObserveOptions,
  ): Promise<void> {
    options ??= {};

    for (const registered of handle[registeredObserverList]) {
      if (registered.observer === this) registered.options = options;
    }

    if (handle[registeredObserverList].isEmpty) {
      handle[registeredObserverList].append({ observer: this, options });
      this[$fileSystemHandleList].append(new WeakRef(handle));
    }

    return Promise.resolve();
  }

  unobserve(handle: FileSystemHandle): void {
    handle[registeredObserverList].remove((registered) => {
      return registered.observer === this;
    });
    this[$fileSystemHandleList].remove((ref) => {
      return ref.deref() === handle;
    });
  }

  disconnect(): void {
    for (const ref of this[$fileSystemHandleList]) {
      const handle = ref.deref();

      if (handle) {
        handle[registeredObserverList].remove((registered) =>
          registered.observer === this
        );
      }
    }

    this[$recordQueue].empty();
  }
}
