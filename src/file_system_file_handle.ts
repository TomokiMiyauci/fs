import {
  FileSystemHandle,
  type FileSystemHandleOptions,
} from "./file_system_handle.ts";
import type {
  FileEntry,
  FileSystemCreateWritableOptions,
  FileSystemEntry,
  FileSystemFileOrDirectoryHandleContext,
  FileSystemLocator,
} from "./type.ts";
import { takeLock } from "./algorithm.ts";
import { createFileSystemWritableFileStream } from "./file_system_writable_file_stream.ts";
import { buffer, locator, root, userAgent } from "./symbol.ts";
import {
  createFileSystemSyncAccessHandle,
  type FileSystemSyncAccessHandle,
} from "./file_system_sync_access_handle.ts";
import type { FileSystemWritableFileStream } from "./file_system_writable_file_stream.ts";
import { Msg } from "./constant.ts";

export class FileSystemFileHandle extends FileSystemHandle {
  constructor(
    private context: FileSystemFileOrDirectoryHandleContext,
    options?: FileSystemHandleOptions,
  ) {
    super(context, options);
  }
  override get kind(): "file" {
    return "file";
  }

  getFile(): Promise<File> {
    // 1. Let result be a new promise.
    const { reject, promise, resolve } = Promise.withResolvers<File>();

    // 2. Let locator be this's locator.
    const fsLocator = this[locator];

    // 3. Let global be this's relevant global object.

    // 4. Enqueue the following steps to the file system queue:
    this[userAgent].fileSystemQueue.enqueue(() => {
      // 1. Let entry be the result of locating an entry given locator.
      const entry = this.context.locateEntry(fsLocator);

      // 2. Let accessResult be the result of running entry’s query access given "read".
      const accessResult = entry?.queryAccess("read");

      // 3. Queue a storage task with global to run these steps:
      this[userAgent].storageTask.enqueue(() => {
        // 1. If accessResult’s permission state is not "granted", reject result with a DOMException of accessResult’s error name and abort these steps.
        if (accessResult && accessResult.permissionState !== "granted") {
          return reject(new DOMException(accessResult.errorName));
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
        const type = this.context.typeByEntry(entry);

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

  createWritable(
    options?: FileSystemCreateWritableOptions,
  ): Promise<FileSystemWritableFileStream> {
    // 1. Let result be a new promise.
    const { promise, reject, resolve } = Promise.withResolvers<
      FileSystemWritableFileStream
    >();

    // 2. Let locator be this's locator.
    const fsLocator = this[locator];

    // 3. Let realm be this's relevant Realm.

    // 4. Let global be this's relevant global object.

    // 5. Enqueue the following steps to the file system queue:

    this[userAgent].fileSystemQueue.enqueue(() => {
      // 1. Let entry be the result of locating an entry given locator.
      const entry = this.context.locateEntry(fsLocator);

      // 2. Let accessResult be the result of running entry’s request access given "readwrite".
      const accessResult = entry?.requestAccess("readwrite");

      // 3. If accessResult’s permission state is not "granted", queue a storage task with global to reject result with a DOMException of accessResult’s error name and abort these steps.
      if (accessResult && accessResult.permissionState !== "granted") {
        return this[userAgent].storageTask.enqueue(() => {
          reject(new DOMException(accessResult.errorName));
        });
      }

      // 4. If entry is null, queue a storage task with global to reject result with a "NotFoundError" DOMException and abort these steps.
      if (entry === null) {
        return this[userAgent].storageTask.enqueue(() => {
          reject(new DOMException(Msg.NotFound, "NotFoundError"));
        });
      }

      // 5. Assert: entry is a file entry.
      assertFileEntry(entry);

      // 6. Let lockResult be the result of taking a lock with "shared" on entry.
      const lockResult = takeLock("shared", entry);

      // 7. Queue a storage task with global to run these steps:
      this[userAgent].storageTask.enqueue(() => {
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
        const stream = createFileSystemWritableFileStream(entry, {
          handle: this,
          root: this[root],
          userAgent: this[userAgent],
        });

        // 3. If options["keepExistingData"] is true:
        if (options?.keepExistingData) {
          // 1. Set stream’s [[buffer]] to a copy of entry’s binary data.
          stream[buffer] = entry.binaryData.slice(0);
        }

        // 4. Resolve result with stream.
        return resolve(stream);
      });
    });

    // 6. Return result.
    return promise;
  }

  createSyncAccessHandle(): Promise<FileSystemSyncAccessHandle> {
    // 1. Let result be a new promise.
    const { promise: result, reject, resolve } = Promise.withResolvers<
      FileSystemSyncAccessHandle
    >();

    // 2. Let locator be this's locator.
    const fsLocator = this[locator];

    // 3. Let realm be this's relevant Realm.

    // 4. Let global be this's relevant global object.

    // 5. Let isInABucketFileSystem be true if this is in a bucket file system; otherwise false.

    // 6. Enqueue the following steps to the file system queue:
    this[userAgent].fileSystemQueue.enqueue(() => {
      // 1. Let entry be the result of locating an entry given locator.
      const entry = this.context.locateEntry(fsLocator);

      // 2. Let accessResult be the result of running entry’s request access given "readwrite".
      const accessResult = entry?.requestAccess("readwrite");

      // 3. If accessResult’s permission state is not "granted", queue a storage task with global to reject result with a DOMException of accessResult’s error name and abort these steps.
      if (accessResult && accessResult.permissionState !== "granted") {
        return this[userAgent].storageTask.enqueue(() => {
          reject(new DOMException(accessResult.errorName));
        });
      }

      // 4. If isInABucketFileSystem is false, queue a storage task with global to reject result with an "InvalidStateError" DOMException and abort these steps.

      // 5. If entry is null, queue a storage task with global to reject result with a "NotFoundError" DOMException and abort these steps.
      if (entry === null) {
        return this[userAgent].storageTask.enqueue(() => {
          reject(new DOMException(Msg.NotFound, "NotFoundError"));
        });
      }

      // 6. Assert: entry is a file entry.
      assertFileEntry(entry);

      // 7. Let lockResult be the result of taking a lock with "exclusive" on entry.
      const lockResult = takeLock("exclusive", entry);

      // 8. Queue a storage task with global to run these steps:
      this[userAgent].storageTask.enqueue(() => {
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
        const handle = createFileSystemSyncAccessHandle(entry, this[userAgent]);

        // 3. Resolve result with handle.
        resolve(handle);
      });
    });

    // 7. Return result.
    return result;
  }
}

function assertFileEntry(_: FileSystemEntry): asserts _ is FileEntry {}

export function createChildFileSystemFileHandle(
  parentLocator: FileSystemLocator,
  name: string,
  realm: Pick<
    FileSystemFileOrDirectoryHandleContext,
    "locateEntry" | "typeByEntry" | "userAgent"
  >,
  options: FileSystemHandleOptions,
): FileSystemFileHandle {
  // 2. Let childType be "file".
  const childType = "file";

  // 3. Let childRoot be a copy of parentLocator’s root.
  const childRoot = parentLocator.root;

  // 4. Let childPath be the result of cloning parentLocator’s path and appending name.
  const childPath = parentLocator.path.clone();
  childPath.append(name);
  const locator = {
    kind: childType,
    root: childRoot,
    path: childPath,
  } satisfies FileSystemLocator;
  // 5. Set handle’s locator to a file system locator whose kind is childType, root is childRoot, and path is childPath.
  // 1. Let handle be a new FileSystemFileHandle in realm.
  const handle = new FileSystemFileHandle({ ...realm, locator }, options);

  // 6. Return handle.
  return handle;
}
