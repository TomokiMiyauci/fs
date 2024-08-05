/**
 * @see https://github.com/whatwg/fs/blob/main/proposals/FileSystemObserver.md
 */

import type { List, OrderedSet, Queue } from "@miyauci/infra";
import type { FileSystemHandle } from "./file_system_handle.ts";
import { resolveLocator } from "./algorithm.ts";
import { callback, locator, recordQueue } from "./symbol.ts";

export interface FileSystemObserverCallback {
  (records: FileSystemChangeRecord[], observer: FileSystemObserver): void;
}

export interface FileSystemChangeRecord {
  readonly root: FileSystemHandle;

  /** The handle affected by the file system change */
  readonly changedHandle: FileSystemHandle;

  /** The path of `changedHandle` relative to `root` */
  readonly relativePathComponents: readonly string[];

  /** The type of change */
  readonly type: FileSystemChangeType;
}

export type FileSystemChangeType =
  | "appeared"
  | "disappeared"
  | "modified"
  | "moved"
  /** Change types are not known */
  | "unknown"
  /** This observation is no longer valid */
  | "errored";

export interface FileSystemObserverObserveOptions {
  recursive?: boolean;
}

export interface RegisteredObserver {
  observer: FileSystemObserver;
  options: FileSystemObserverObserveOptions;
}

export interface FileSystemObserver {
  observe(
    handle: FileSystemHandle,
    options?: FileSystemObserverObserveOptions,
  ): Promise<void>;
  unobserve(handle: FileSystemHandle): void;
  disconnect(): void;

  [recordQueue]: Queue<FileSystemChangeRecord>;
  [callback]: FileSystemObserverCallback;
}

export async function queueRecord(
  registeredList: List<RegisteredObserver>,
  handle: FileSystemHandle,
  type: FileSystemChangeType,
  root: FileSystemHandle,
  agent: Agent,
): Promise<void> {
  const interestedObservers = new Set<FileSystemObserver>();
  const relativePathComponents =
    (await resolveLocator(handle[locator], root[locator])) ?? [];

  for (const registered of registeredList) {
    // TODO: treat options.recursive
    // const options = registered.options;

    interestedObservers.add(registered.observer);
  }

  for (const observer of interestedObservers) {
    const record = {
      type,
      changedHandle: handle,
      root,
      relativePathComponents,
    } satisfies FileSystemChangeRecord;

    observer[recordQueue].enqueue(record);

    agent.pendingFileSystemObservers.append(observer);
  }

  // queue
  queue(agent);
}

export function queue(agent: Agent): void {
  if (agent.fileSystemObserverMicrotaskQueued) return;

  agent.fileSystemObserverMicrotaskQueued = true;

  queueMicrotask(() => notify(agent));
}

function notify(agent: Agent): void {
  agent.fileSystemObserverMicrotaskQueued = false;

  const notifySet = agent.pendingFileSystemObservers.clone();

  agent.pendingFileSystemObservers.empty();

  for (const fso of notifySet) {
    const records = fso[recordQueue].clone();

    fso[recordQueue].empty();

    if (!records.isEmpty) {
      try {
        fso[callback]([...records], fso);
      } catch (e) {
        throw e;
      }
    }
  }
}

/**
 * Reference @see https://dom.spec.whatwg.org/#mutation-observers
 */
export interface Agent {
  /**
   * @default false
   */
  fileSystemObserverMicrotaskQueued: boolean;

  /** A [set](https://infra.spec.whatwg.org/#ordered-set) of zero or more {@link FileSystemObserver} objects.
   * @default new OrderedSet()
   */
  pendingFileSystemObservers: OrderedSet<FileSystemObserver>;
}
