import type { FileSystemObservation } from "./file_system.ts";
import type { FileSystemHandle } from "./file_system_handle.ts";
import * as $ from "./symbol.ts";
import { type FileSystemLocator, resolve } from "./file_system_locator.ts";
import type { List } from "@miyauci/infra";

export type FileSystemChangeType =
  | "appeared"
  | "disappeared"
  | "modified"
  | "moved"
  /** Change types are not known */
  | "unknown"
  /** This observation is no longer valid */
  | "errored";

export interface FileSystemChangeRecord {
  readonly root: FileSystemHandle;

  /** The handle affected by the file system change */
  readonly changedHandle: FileSystemHandle;

  /** The path of `changedHandle` relative to `root` */
  readonly relativePathComponents: readonly string[];

  /** The type of change */
  readonly type: FileSystemChangeType;

  readonly relativePathMovedFrom: readonly string[] | null;
}

export function createFileSystemChangeRecord(
  observation: FileSystemObservation,
  changedHandle: FileSystemHandle,
  type: FileSystemChangeType,
  movedFromPath: FileSystemLocator | null,
): FileSystemChangeRecord {
  // 1. Let root be observation’s root handle.
  const root = observation.rootHandle;

  // 2. Let rootLocator be root’s locator.
  const rootLocator = root[$.locator];

  // 3. Let changedHandleLocator be changedHandle’s locator.
  const changedHandleLocator = changedHandle[$.locator];

  // 4. Let relativePathComponents be the result of resolving changedHandleLocator relative to rootLocator.
  const relativePathComponents = resolve(
    changedHandleLocator,
    rootLocator,
  );

  // 5. Let relativePathMovedFrom be null.
  let relativePathMovedFrom: List<string> | null = null;

  // 6. If movedFromPath was given, set relativePathMovedFrom to the result of resolving movedFromPath relative to rootLocator.
  if (movedFromPath) {
    relativePathMovedFrom = resolve(movedFromPath, rootLocator);
  }

  // 7. Let realm be changedHandle’s relevant realm.

  // 8. Let record be a new FileSystemChangeRecord in realm.
  const record = {
    // 9. Set record’s root to root.
    root,
    // 10. Set record’s changedHandle to changedHandle.
    changedHandle,
    // 11. Set record’s relativePathComponents to relativePathComponents.
    relativePathComponents: [...relativePathComponents ?? []],
    // 12. Set record’s type to type.
    type,
    // 13. Set record’s relativePathMovedFrom to relativePathMovedFrom.
    relativePathMovedFrom: relativePathMovedFrom
      ? [...relativePathMovedFrom]
      : null,
  } satisfies FileSystemChangeRecord;

  // 14. Return record.
  return record;
}
