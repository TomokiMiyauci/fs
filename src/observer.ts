/**
 * @see https://github.com/whatwg/fs/blob/main/proposals/FileSystemObserver.md
 */

import { List, Queue, Set } from "@miyauci/infra";
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
  userAgent: UserAgent,
): Promise<void> {
  const interestedObservers = new Set<FileSystemObserver>();
  const relativePathComponents =
    (await resolveLocator(handle[locator], root[locator], userAgent)) ??
      new List();

  for (const registered of registeredList) {
    // TODO: treat options.recursive
    // const options = registered.options;

    interestedObservers.append(registered.observer);
  }

  for (const observer of interestedObservers) {
    const record = {
      type,
      changedHandle: handle,
      root,
      relativePathComponents: [...relativePathComponents],
    } satisfies FileSystemChangeRecord;

    observer[recordQueue].enqueue(record);

    userAgent.pendingFileSystemObservers.append(observer);
  }

  // queue
  queue(userAgent);
}

export function queue(agent: WindowAgent): void {
  if (agent.fileSystemObserverMicrotaskQueued) return;

  agent.fileSystemObserverMicrotaskQueued = true;

  queueMicrotask(() => notify(agent));
}

function notify(agent: WindowAgent): void {
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
export interface WindowAgent {
  /**
   * @default false
   */
  fileSystemObserverMicrotaskQueued: boolean;

  /** A [set](https://infra.spec.whatwg.org/#ordered-set) of zero or more {@link FileSystemObserver} objects.
   * @default new Set()
   */
  pendingFileSystemObservers: Set<FileSystemObserver>;
}

export interface UserAgent extends WindowAgent {
  fileSystemQueue: ParallelQueue;
  storageTask: ParallelQueue;
}

export interface ParallelQueue {
  enqueue(algorithm: () => void): void;
}
