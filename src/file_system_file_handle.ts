import {
  FileSystemHandle,
  isInBucketFileSystem,
} from "./file_system_handle.ts";
import { type FileSystemLocator, locateEntry } from "./file_system_locator.ts";
import type { FileSystem, FileSystemPath } from "./file_system.ts";
import {
  createNewFileSystemSyncAccessHandle,
  type FileSystemSyncAccessHandle,
} from "./file_system_sync_access_handle.ts";
import {
  createNewFileSystemWritableFileStream,
  type FileSystemWritableFileStream,
} from "./file_system_writable_file_stream.ts";
import { Msg } from "./constant.ts";
import {
  type FileEntry,
  type FileSystemEntry,
  take,
} from "./file_system_entry.ts";
import { typeByEntry, userAgent } from "./implementation_defined.ts";

/**
 * [File System Standard](https://whatpr.org/fs/165.html#dictdef-filesystemcreatewritableoptions)
 */
export interface FileSystemCreateWritableOptions {
  /**
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemcreatewritableoptions-keepexistingdata)
   */
  keepExistingData?: boolean;
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#filesystemfilehandle)
 */
export class FileSystemFileHandle extends FileSystemHandle {
  /** Returns a {@link File} representing the state on disk of the file entry locatable by handle’s locator. If the file on disk changes or is removed after this method is called, the returned {@link File} object will likely be no longer readable.
   *
   * @throws {DOMException}
   * - If permission is not 'granted'.
   * - If located entry is `null`.
   *
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemfilehandle-getfile)
   */
  getFile(): Promise<File> {
    // 1. Let result be a new promise.
    const { reject, promise, resolve } = Promise.withResolvers<File>();

    // 2. Let locator be this's locator.
    const locator = this.locator;

    // 3. Let global be this's relevant global object.

    // 4. Enqueue the following steps to the file system queue:
    userAgent.fileSystemQueue.enqueue(() => {
      // 1. Let entry be the result of locating an entry given locator.
      const entry = locateEntry(locator);

      // 2. Let accessResult be the result of running entry’s query access given "read".
      const accessResult = entry?.queryAccess("read");

      // 3. Queue a storage task with global to run these steps:
      userAgent.storageTask.enqueue(() => {
        // 1. If accessResult’s permission state is not "granted", reject result with a DOMException of accessResult’s error name and abort these steps.
        if (accessResult && accessResult.permissionState !== "granted") {
          return reject(
            new DOMException(Msg.PermissionDenied, accessResult.errorName),
          );
        }

        // 2. If entry is null, reject result with a "NotFoundError" DOMException and abort these steps.
        if (entry === null) {
          return reject(new DOMException(Msg.NotFound, "NotFoundError"));
        }

        // 3. Assert: entry is a file entry.
        assertFileEntry(entry);

        // 4. Let f be a new File.
        // 5. Set f’s snapshot state to the current state of entry.
        // 6. Set f’s underlying byte sequence to a copy of entry’s binary data.
        // 9. Set f’s type to an implementation-defined value, based on for example entry’s name or its file extension.
        const type = typeByEntry(entry);

        // `getFile` reads binaries at the time of the `getFile` call, according to the current specification.
        // @see https://github.com/whatwg/fs/issues/157

        // 7. Set f’s name to entry’s name.
        const f = new File([entry.binaryData.slice(0)], entry.name, {
          // 8. Set f’s lastModified to entry’s modification timestamp.
          lastModified: entry.modificationTimestamp,
          type,
        });

        // 10. Resolve result with f.
        resolve(f);
      });
    });

    // 5. Return result.
    return promise;
  }

  /** Returns a {@link FileSystemWritableFileStream} that can be used to write to the file. Any changes made through stream won’t be reflected in the file entry locatable by fileHandle’s locator until the stream has been closed. User agents try to ensure that no partial writes happen, i.e. the file will either contain its old contents or it will contain whatever data was written through stream up until the stream has been closed.
   *
   * This is typically implemented by writing data to a temporary file, and only replacing the file entry locatable by fileHandle’s locator with the temporary file when the writable filestream is closed.
   *
   * If {@link keepExistingData} is false or not specified, the temporary file starts out empty, otherwise the existing file is first copied to this temporary file.
   *
   * Creating a {@link FileSystemWritableFileStream} takes a shared lock on the file entry locatable with fileHandle’s locator. This prevents the creation of {@link FileSystemSyncAccessHandles} for the entry, until the stream is closed.
   *
   * @throws {DOMException}
   * - If permission is not 'granted'.
   * - If located entry is `null`.
   * - If the {@link name} entry has locked.
   *
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemfilehandle-createwritable)
   */
  createWritable(
    options?: FileSystemCreateWritableOptions,
  ): Promise<FileSystemWritableFileStream> {
    // 1. Let result be a new promise.
    const { promise, reject, resolve } = Promise.withResolvers<
      FileSystemWritableFileStream
    >();

    // 2. Let locator be this's locator.
    const locator = this.locator;

    // 3. Let realm be this's relevant Realm.

    // 4. Let global be this's relevant global object.

    // 5. Enqueue the following steps to the file system queue:

    userAgent.fileSystemQueue.enqueue(() => {
      // 1. Let entry be the result of locating an entry given locator.
      const entry = locateEntry(locator);

      // 2. Let accessResult be the result of running entry’s request access given "readwrite".
      const accessResult = entry?.requestAccess("readwrite");

      // 3. If accessResult’s permission state is not "granted", queue a storage task with global to reject result with a DOMException of accessResult’s error name and abort these steps.
      if (accessResult && accessResult.permissionState !== "granted") {
        return userAgent.storageTask.enqueue(() => {
          reject(
            new DOMException(Msg.PermissionDenied, accessResult.errorName),
          );
        });
      }

      // 4. If entry is null, queue a storage task with global to reject result with a "NotFoundError" DOMException and abort these steps.
      if (entry === null) {
        return userAgent.storageTask.enqueue(() => {
          reject(new DOMException(Msg.NotFound, "NotFoundError"));
        });
      }

      // 5. Assert: entry is a file entry.
      assertFileEntry(entry);

      // 6. Let lockResult be the result of taking a lock with "shared" on entry.
      const lockResult = take("shared", entry);

      // 7. Queue a storage task with global to run these steps:
      userAgent.storageTask.enqueue(() => {
        // 1. If lockResult is "failure", reject result with a "NoModificationAllowedError" DOMException and abort these steps.
        if (lockResult === "failure") {
          return reject(
            new DOMException(
              Msg.NoModificationAllowed,
              "NoModificationAllowedError",
            ),
          );
        }

        // 2. Let stream be the result of creating a new FileSystemWritableFileStream for entry in realm.
        const stream = createNewFileSystemWritableFileStream(entry);

        // 3. If options["keepExistingData"] is true:
        if (options?.keepExistingData) {
          // 1. Set stream’s [[buffer]] to a copy of entry’s binary data.
          stream["buffer"] = entry.binaryData.slice(0);
        }

        // 4. Resolve result with stream.
        return resolve(stream);
      });
    });

    // 6. Return result.
    return promise;
  }

  /** Returns a {@link FileSystemSyncAccessHandle} that can be used to read from/write to the file. Changes made through handle might be immediately reflected in the file entry locatable by fileHandle’s locator. To ensure the changes are reflected in this file, the handle can be flushed.
   *
   * Creating a {@link FileSystemSyncAccessHandle} takes an exclusive lock on the file entry locatable with fileHandle’s locator. This prevents the creation of further {@link FileSystemSyncAccessHandles} or {@link FileSystemWritableFileStreams} for the entry, until the access handle is closed.
   *
   * The returned {@link FileSystemSyncAccessHandle} offers synchronous methods. This allows for higher performance on contexts where asynchronous operations come with high overhead, e.g., WebAssembly.
   *
   * For the time being, this method will only succeed when the fileHandle is in a bucket file system.
   *
   * @throws {DOMException}
   * - If permission is not 'granted'.
   * - If located entry is `null`.
   * - If the {@link name} entry has locked.
   * - If this is not [in a bucket file system](https://whatpr.org/fs/165.html#filesystemhandle-is-in-a-bucket-file-system).
   *
   * [File System Standard](https://whatpr.org/fs/165.html#dom-filesystemfilehandle-createsyncaccesshandle)
   */
  createSyncAccessHandle(): Promise<FileSystemSyncAccessHandle> {
    // 1. Let result be a new promise.
    const { promise: result, reject, resolve } = Promise.withResolvers<
      FileSystemSyncAccessHandle
    >();

    // 2. Let locator be this's locator.
    const locator = this.locator;

    // 3. Let realm be this's relevant Realm.

    // 4. Let global be this's relevant global object.

    // 5. Let isInABucketFileSystem be true if this is in a bucket file system; otherwise false.
    const isInABucketFileSystem = isInBucketFileSystem(this);

    // 6. Enqueue the following steps to the file system queue:
    userAgent.fileSystemQueue.enqueue(() => {
      // 1. Let entry be the result of locating an entry given locator.
      const entry = locateEntry(locator);

      // 2. Let accessResult be the result of running entry’s request access given "readwrite".
      const accessResult = entry?.requestAccess("readwrite");

      // 3. If accessResult’s permission state is not "granted", queue a storage task with global to reject result with a DOMException of accessResult’s error name and abort these steps.
      if (accessResult && accessResult.permissionState !== "granted") {
        return userAgent.storageTask.enqueue(() => {
          reject(
            new DOMException(Msg.PermissionDenied, accessResult.errorName),
          );
        });
      }

      // 4. If isInABucketFileSystem is false, queue a storage task with global to reject result with an "InvalidStateError" DOMException and abort these steps.
      if (!isInABucketFileSystem) {
        return userAgent.storageTask.enqueue(() => {
          reject(
            new DOMException(
              Msg.NotInBucketFileSystemOperation,
              "InvalidStateError",
            ),
          );
        });
      }

      // 5. If entry is null, queue a storage task with global to reject result with a "NotFoundError" DOMException and abort these steps.
      if (entry === null) {
        return userAgent.storageTask.enqueue(() => {
          reject(new DOMException(Msg.NotFound, "NotFoundError"));
        });
      }

      // 6. Assert: entry is a file entry.
      assertFileEntry(entry);

      // 7. Let lockResult be the result of taking a lock with "exclusive" on entry.
      const lockResult = take("exclusive", entry);

      // 8. Queue a storage task with global to run these steps:
      userAgent.storageTask.enqueue(() => {
        // 1. If lockResult is "failure", reject result with a "NoModificationAllowedError" DOMException and abort these steps.
        if (lockResult === "failure") {
          return reject(
            new DOMException(
              Msg.NoModificationAllowed,
              "NoModificationAllowedError",
            ),
          );
        }

        // 2. Let handle be the result of creating a new FileSystemSyncAccessHandle for entry in realm.
        const handle = createNewFileSystemSyncAccessHandle(entry);

        // 3. Resolve result with handle.
        resolve(handle);
      });
    });

    // 7. Return result.
    return result;
  }
}

/**
 * @ignore
 */
export interface FileSystemFileHandle {
  get kind(): "file";
}

function assertFileEntry(_: FileSystemEntry): asserts _ is FileEntry {}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#creating-a-child-filesystemfilehandle)
 */
export function createChildFileSystemFileHandle(
  parentLocator: FileSystemLocator,
  name: string,
): FileSystemFileHandle {
  // @ts-ignore Allow protected constructor construction
  // 1. Let handle be a new FileSystemFileHandle in realm.
  const handle: FileSystemFileHandle = new FileSystemFileHandle();

  // 2. Let childType be "file".
  const childType = "file";

  // 3. Let childFileSystem be the parentLocator’s file system.
  const childFileSystem = parentLocator.fileSystem;

  // 4. Let childPath be the result of cloning parentLocator’s path and appending name.
  const childPath = parentLocator.path.clone();
  childPath.append(name);

  // 5. Set handle’s locator to a file system locator whose kind is childType, file system is childFileSystem, and path is childPath.
  handle["locator"] = {
    kind: childType,
    fileSystem: childFileSystem,
    path: childPath,
  };

  // 6. Return handle.
  return handle;
}

/**
 * [File System Standard](https://whatpr.org/fs/165.html#creating-a-new-filesystemfilehandle)
 */
export function createNewFileSystemFileHandle(
  fileSystem: FileSystem,
  path: FileSystemPath,
): FileSystemFileHandle {
  // @ts-ignore Allow protected constructor construction
  // 1. Let handle be a new FileSystemFileHandle in realm.
  const handle: FileSystemFileHandle = new FileSystemFileHandle();

  // 2. Set handle’s locator to a file system locator whose kind is "file", file system is fileSystem, and path is path.
  handle["locator"] = { kind: "file", fileSystem, path };

  // 3. Return handle.
  return handle;
}
