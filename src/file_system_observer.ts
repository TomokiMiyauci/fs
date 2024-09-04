/**
 * @see https://github.com/whatwg/fs/blob/main/proposals/FileSystemObserver.md
 */

import { Map } from "@miyauci/infra";
import type { FileSystemHandle } from "./file_system_handle.ts";
import { Msg } from "./constant.ts";
import {
  createObservation,
  destroyObservation,
  type FileSystemObservation,
} from "./file_system.ts";
import { type FileSystemLocator, locateEntry } from "./file_system_locator.ts";
import type { FileSystemChangeRecord } from "./file_system_change_record.ts";
import { userAgent } from "./implementation_defined.ts";

/**
 * [File System Standard](https://whatpr.org/fs/165.html#callbackdef-filesystemobservercallback)
 */
export interface FileSystemObserverCallback {
  (
    /**
     * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemobservercallback-records)
     */
    records: FileSystemChangeRecord[],
    /**
     * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemobservercallback-observer)
     */
    observer: FileSystemObserver,
  ): void;
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#dictdef-filesystemobserverobserveoptions)
 */
export interface FileSystemObserverObserveOptions {
  /**
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemobserverobserveoptions-recursive)
   */
  recursive?: boolean;
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#filesystemobserver)
 */
export class FileSystemObserver {
  /**
   * [File System Standard](https://whatpr.org/fs/165.html#filesystemobserver-callback)
   *
   * @ignore
   */
  protected callback: FileSystemObserverCallback;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#filesystemobserver-observations)
   *
   * @ignore
   */
  protected observations: Map<FileSystemLocator, FileSystemObservation>;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemobserver-filesystemobserver)
   */
  constructor(
    callback: FileSystemObserverCallback,
  ) {
    // 2. Set this's callback to callback.
    this["callback"] = callback;

    // 3. Set this's observations be the empty map.
    this.observations = new Map();
  }

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemobserver-observe)
   *
   * @throws {DOMException}
   * - If permission is not 'granted'.
   * - If located entry is `null`.
   */
  observe(
    handle: FileSystemHandle,
    options?: FileSystemObserverObserveOptions,
  ): Promise<void> {
    // 1. Let result be a new promise.
    const { promise, reject, resolve } = Promise.withResolvers<void>();

    // 2. Let recursive be options["recursive"].
    const recursive = options?.recursive ?? false;

    // 3. Let observationsMap be this's observations.
    const observationMap = this.observations;

    // 4. Let locator be handle’s locator.
    const locator = handle["locator"];

    // 5. Let global be this's relevant global object.

    // 6. Enqueue the following steps to the file system queue:
    userAgent.fileSystemQueue.enqueue(() => {
      // 1. If observationsMap[locator] exists, abort these steps.
      if (observationMap.exists(locator)) return resolve();

      // 2. Let entry be the result of locating an entry given locator.
      const entry = locateEntry(locator);

      // 3. Let accessResult be the result of running entry’s query access given "read".
      const accessResult = entry?.queryAccess("read");

      // 4. Queue a storage task with global to run these steps:
      userAgent.storageTask.enqueue(() => {
        // 1. If accessResult’s permission state is not "granted", reject result with a DOMException of accessResult’s error name and abort these steps.
        if (accessResult && accessResult.permissionState !== "granted") {
          return reject(new DOMException(accessResult.errorName));
        }

        // 2. If entry is null, reject result with a "NotFoundError" DOMException and abort these steps.
        if (!entry) {
          return reject(new DOMException(Msg.NotFound, "NotFoundError"));
        }

        // 3. Assert: entry is a file entry.

        // 4. Enqueue the following steps to the file system queue:
        userAgent.fileSystemQueue.enqueue(() => {
          // 1. Create an observation for this on handle with recursive.
          createObservation(this, handle, recursive);
        });

        // 5. Resolve result with null.
        resolve();
      });
    });

    return promise;
  }

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemobserver-unobserve)
   */
  unobserve(handle: FileSystemHandle): void {
    // 1. Let locator be handle’s locator.
    const locator = handle["locator"];

    // 2. Let observationsMap be this's observations.
    const observationMap = this.observations;

    // 3. Enqueue the following steps to the file system queue:
    userAgent.fileSystemQueue.enqueue(() => {
      // 1. If observationsMap[locator] does not exist, abort these steps.
      if (!observationMap.exists(locator)) return;

      // 2. Destroy observation observationsMap[locator].
      destroyObservation(observationMap.get(locator)!);
    });
  }

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemobserver-disconnect)
   */
  disconnect(): void {
    // 1. Let observationsMap be this's observations.
    const observationMap = this.observations;

    // 2. Enqueue the following steps to the file system queue:
    userAgent.fileSystemQueue.enqueue(() => {
      // 1. Let observations be the result of getting the values of observationsMap.
      const observations = observationMap.values();

      // 2. For each observation in observations:
      for (const observation of observations) {
        // 1. Destroy observation observation.
        destroyObservation(observation);
      }
    });
  }
}
