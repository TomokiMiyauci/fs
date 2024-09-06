import { List, type Set } from "@miyauci/infra";
import type {
  FileSystemHandle,
  FileSystemHandleKind,
} from "./file_system_handle.ts";
import type { FileSystemObserver } from "./file_system_observer.ts";
import {
  createNewFileSystemChangeRecord,
  type FileSystemChangeRecord,
  type FileSystemChangeType,
} from "./file_system_change_record.ts";
import type { FileSystemEntry } from "./file_system_entry.ts";
import { createNewFileSystemHandle } from "./algorithm.ts";
import { getRelationship } from "./file_system_locator.ts";
import type { FileSystemFileHandle } from "./file_system_file_handle.ts";
import type { FileSystemDirectoryHandle } from "./file_system_directory_handle.ts";
import { userAgent } from "./implementation_defined.ts";

/** A list of one or more strings.
 *
 * [File System Standard](https://fs.spec.whatwg.org/#file-system-path)
 */
export type FileSystemPath = List<string>;

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-system)
 */
export interface FileSystem {
  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-root)
   */
  root: string;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-locate-an-entry)
   */
  locateEntry(path: FileSystemPath): FileSystemEntry | null;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-get-the-path)
   */
  getPath(entry: FileSystemEntry): FileSystemPath;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-observations)
   */
  observations: Set<FileSystemObservation>;
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-notify-observations)
 */
export function notifyObservations(
  fileSystem: FileSystem,
  events: List<FileSystemEvent>,
): void {
  // Enqueue the following steps to the file system queue:
  userAgent.fileSystemQueue.enqueue(() => {
    // For each observation of the fileSystem’s observations.
    for (const observation of fileSystem.observations) {
      // Notify observation of events from fileSystem.
      notify(observation, events, fileSystem);
    }
  });
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-send-an-error)
 */
export function sendError(
  observations: Set<FileSystemObservation>,
  _: FileSystem,
): void {
  // 1. Enqueue the following steps to the file system queue:
  userAgent.fileSystemQueue.enqueue(() => {
    // 1. Assert observations is a subset of fileSystem’s observations.

    // 2. For each observation of observations:
    for (const observation of observations) {
      // 1. Destroy observation observation.
      destroyObservation(observation);

      // 2. Let changedHandle be the observation’s root handle.
      const changedHandle = observation.rootHandle;

      // 3. Let record be the result of creating a new FileSystemChangeRecord for observation given changedHandle, "errored", and null.
      const record = createNewFileSystemChangeRecord(
        observation,
        changedHandle,
        "errored",
        null,
      );

      // 4. Invoke the callback of the observation with «record».
      invokeCallback(observation, new List([record]));
    }
  });
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-observation-create-an-observation)
 */
export function createObservation(
  observer: FileSystemObserver,
  rootHandle: FileSystemHandle,
  recursive: boolean,
): void {
  // Let observation be a file system observation whose observer is observer, root handle is rootHandle, and recursive is recursive.
  const observation = {
    observer,
    rootHandle,
    recursive,
  } satisfies FileSystemObservation;

  // Let observationLocator be rootHandle’s locator.
  const observationLocator = rootHandle["locator"];

  // Let observationsMap be observer’s observations.
  const observationsMap = observer["observations"];

  // Let fileSystem be the observationLocator’s file system.
  const fileSystem = observationLocator.fileSystem;

  // Append observation to the fileSystem’s observations.
  fileSystem.observations.append(observation);

  // set observationsMap[observationLocator] to observation.
  observationsMap.set(observationLocator, observation);
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-observation-destroy-observation)
 */
export function destroyObservation(observation: FileSystemObservation): void {
  // Let observer be observation’s observer.
  const observer = observation.observer;

  // Let rootHandle be observation’s root handle.
  const rootHandle = observation.rootHandle;

  // Let observationLocator be rootHandle’s locator.
  const observationLocator = rootHandle["locator"];

  // Let fileSystem be observationLocator’s file system.
  const fileSystem = observationLocator.fileSystem;

  // Remove observation from the fileSystem’s observations.
  fileSystem.observations.remove(observation);

  // Remove observationLocator from observer’s observations.
  observer["observations"].remove(observationLocator);
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-observation-notify)
 */
export function notify(
  observation: FileSystemObservation,
  events: List<FileSystemEvent>,
  fileSystem: FileSystem,
): void {
  // 1. Let rootHandle be observation’s root handle.
  const rootHandle = observation.rootHandle;

  // 2. Let observationLocator be rootHandle’s locator.
  const observationLocator = rootHandle["locator"];

  // 3. Assert: observationLocator’s file system is equal to fileSystem.

  // 4. Let realm be rootHandle’s relevant realm.

  // 5. Let records be a list of FileSystemChangeRecord.
  const records = new List<FileSystemChangeRecord>();

  // 6. For each event of events:
  for (const event of events) {
    // 1. Let eventType be event’s type.
    let eventType = event.type;

    // 2. Assert eventType is not equal to "errored".

    // 3. Let eventEntryType be event’s entry type.
    let eventEntryType = event.entryType;

    // 4. If eventType is "modified" and eventEntryType is "directory" or null, continue.
    if (
      eventType === "modified" &&
      (eventEntryType === "directory" || eventEntryType === null)
    ) continue;

    // 5. If eventEntryType is null:
    if (eventEntryType === null) {
      // 1. Set eventEntryType to observationLocator’s kind.
      eventEntryType = observationLocator.kind;
    }

    // 6. Let modifiedPath be event’s modified path.
    const modifiedPath = event.modifiedPath;

    // 7. Let fromPath be event’s from path.
    let fromPath = event.fromPath;

    // 8. Let changedHandle be the result of creating a new FileSystemHandle given fileSystem, modifiedPath, and eventEntryType in realm.
    let changedHandle = createNewFileSystemHandle(
      fileSystem,
      modifiedPath,
      eventEntryType,
    );

    // 9. Let movedFromHandle be null.
    let movedFromHandle:
      | FileSystemFileHandle
      | FileSystemDirectoryHandle
      | null = null;

    // 10. Let modifiedPathInScope be equal to changedHandle is in scope of observation.
    const modifiedPathInScope = isInScope(changedHandle, observation);

    // 11. Let fromPathInScope be false.
    let fromPathInScope = false;

    // 12. If eventType is "moved":
    if (eventType === "moved") {
      // 1. Assert: fromPath is not null.
      assertNonNullable(fromPath);

      // 2. Set movedFromHandle to the result of creating a new FileSystemHandle given fileSystem, fromPath, and eventEntryType in realm.
      movedFromHandle = createNewFileSystemHandle(
        fileSystem,
        fromPath,
        eventEntryType,
      );

      // 3. Set fromPathInScope equal to movedFromHandle is in scope of observation.
      fromPathInScope = isInScope(movedFromHandle, observation);
    }

    // 13. If both modifiedPathInScope and fromPathInScope are false, continue.
    if (modifiedPathInScope === false && fromPathInScope === false) continue;

    // 14. If eventType is "moved":
    if (eventType === "moved") {
      // 1. If modifiedPathInScope is false:
      if (modifiedPathInScope === false) {
        // 1. Set eventType to "disappeared".
        eventType = "disappeared";

        // 2. Set changedHandle to movedFromHandle.
        changedHandle = movedFromHandle!;

        // 3. Set fromPath to null.
        fromPath = null;
      }

      // 2. If fromPathInScope is false:
      if (fromPathInScope === false) {
        // 1. Set eventType to "appeared".
        eventType = "appeared";

        // 2. Set fromPath to null.
        fromPath = null;
      }
    }

    // 15. Let record be the result of creating a new FileSystemChangeRecord for observation given changedHandle, eventType, and fromPath.
    // TODO: fromPath is maybe wrong
    const record = createNewFileSystemChangeRecord(
      observation,
      changedHandle,
      eventType,
      null, // fromPath,
    );

    // 16. Append record to records.
    records.append(record);

    // 17. If eventType is equal to "disappeared" and changedHandle’s locator is equal to observationLocator:
    if (
      eventType === "disappeared" &&
      changedHandle["locator"] === observationLocator
    ) {
      // 1. Set errorRecord to the result of creating a new FileSystemChangeRecord for observation given changedHandle, "errored", and null.
      const errorRecord = createNewFileSystemChangeRecord(
        observation,
        changedHandle,
        "errored",
        null,
      );

      // 2. Append errorRecord to records.
      records.append(errorRecord);

      // 3. Destroy observation observation.
      destroyObservation(observation);

      // 4. break.
      break;
    }
  }

  // 7. Invoke the callback of the observation with records.
  invokeCallback(observation, records);
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-observation-invoke-the-callback)
 */
export function invokeCallback(
  observation: FileSystemObservation,
  records: List<FileSystemChangeRecord>,
): void {
  // 1. Let observer be observation’s observer.
  const observer = observation.observer;

  // 2. Let global be observer’s relevant global object.

  // 3. Queue a storage task with global to run these steps:
  userAgent.storageTask.enqueue(() => {
    // 1. Invoke observer’s callback with records as the first argument and observer as the second argument.
    observer["callback"]([...records], observer);
  });
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-observation-is-in-scope)
 */
export function isInScope(
  handle: FileSystemHandle,
  observation: FileSystemObservation,
): boolean {
  // 1. Let observationLocator be observation’s root handle's locator.
  const observationLocator = observation.rootHandle["locator"];

  // 2. Let observationRecursive be observation’s recursive.
  const observationRecursive = observation.recursive;

  // 3. Let handleLocator be handle’s locator.
  const handleLocator = handle["locator"];

  // 4. Let pathRelation be the result of getting the relationship between observationLocator and handleLocator.
  const pathRelation = getRelationship(observationLocator, handleLocator);

  // 5. If pathRelation is "other" or "ancestor", return true.
  // TODO: if other, return false?
  if (pathRelation === "other") return false;
  if (pathRelation === "ancestor") return true;

  // 6. If pathRelation is "descendant" and observationRecursive is false, return false.
  if (pathRelation === "descendant" && observationRecursive === false) {
    return false;
  }

  // 7. Return true.
  return true;
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-observation)
 */
export interface FileSystemObservation {
  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-observation-observer)
   */
  observer: FileSystemObserver;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-observation-root-handle)
   */
  rootHandle: FileSystemHandle;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-observation-recursive)
   */
  recursive: boolean;
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#file-system-file-system-event)
 */
export interface FileSystemEvent {
  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-file-system-event-type)
   */
  type: FileSystemChangeType;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-file-system-event-entry-type)
   */
  entryType: FileSystemHandleKind | null;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-file-system-event-modified-path)
   */
  modifiedPath: FileSystemPath;

  /**
   * [File System Standard](https://whatpr.org/fs/165.html#file-system-file-system-event-from-path)
   */
  fromPath: FileSystemPath | null;
}

function assertNonNullable<T>(
  _: T,
): asserts _ is NonNullable<T> {}
