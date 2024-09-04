/**
 * Provides JavaScript modules compliant with the [File System Standard](https://whatpr.org/fs/165.html)'s WebIDL and algorithms.
 *
 * @example WebIDL
 * ```ts
 * import {
 *   FileSystemObserver,
 *   type FileSystemObserverCallback,
 * } from "@miyauci/fs";
 *
 * declare const callback: FileSystemObserverCallback;
 * const observer = new FileSystemObserver(callback);
 * ```
 *
 * @example [Algorithm](https://infra.spec.whatwg.org/#algorithms)
 * ```ts
 * import {
 *   createNewFileSystemDirectoryHandle,
 *   type FileSystem,
 *   type FileSystemLocator,
 *   type FileSystemPath,
 *   locateEntry,
 * } from "@miyauci/fs";
 * declare const fileSystem: FileSystem;
 * declare const path: FileSystemPath;
 * const handle = createNewFileSystemDirectoryHandle(fileSystem, path);
 *
 * declare const locator: FileSystemLocator;
 * const entry = locateEntry(locator);
 * ```
 *
 * @module
 */

export { createNewFileSystemHandle } from "./algorithm.ts";
export * from "./file_system_directory_handle.ts";
export * from "./file_system_file_handle.ts";
export * from "./file_system_handle.ts";
export * from "./file_system_observer.ts";
export * from "./file_system.ts";
export * from "./file_system_change_record.ts";
export * from "./file_system_entry.ts";
export * from "./file_system_locator.ts";
export * from "./file_system_sync_access_handle.ts";
export * from "./file_system_writable_file_stream.ts";
export * from "./storage_manager.ts";

// Re-export related modules
export type { PermissionState } from "@miyauci/permissions";
export type { AllowSharedBufferSource } from "@miyauci/webidl";

// External package
export type { List, Set } from "@miyauci/infra";
