import { FileSystemHandle } from "./file_system_handle.ts";
import type {
  FileEntry,
  FileSystemCreateWritableOptions,
  FileSystemEntry,
  FileSystemLocator,
  IO,
  UnderlyingFileSystem,
} from "./type.ts";
import { locateEntry, takeLock } from "./algorithm.ts";
import { createFileSystemWritableFileStream } from "./file_system_writable_file_stream.ts";
import { buffer, locator } from "./symbol.ts";
import { extname } from "@std/path";
import { typeByExtension } from "@std/media-types";
import {
  createFileSystemSyncAccessHandle,
  type FileSystemSyncAccessHandle,
} from "./file_system_sync_access_handle.ts";
import type { FileSystemWritableFileStream } from "./file_system_writable_file_stream.ts";
import { Msg } from "./constant.ts";

export class FileSystemFileHandle extends FileSystemHandle {
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
    queueMicrotask(async () => {
      // 1. Let entry be the result of locating an entry given locator.
      const entry = locateEntry(fsLocator, this.io, this.fs);

      // 2. Let accessResult be the result of running entry’s query access given "read".
      const accessResult = await entry?.queryAccess("read");

      // 3. Queue a storage task with global to run these steps:

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
      const blob = new BlobDataItem({
        locator: fsLocator,
        lastModified: entry.modificationTimestamp,
        entry,
        fs: this.fs,
        io: this.io,
        binaryData: entry.binaryData,
      });

      // 9. Set f’s type to an implementation-defined value, based on for example entry’s name or its file extension.
      const type = typeByExtension(extname(entry.name));

      // 7. Set f’s name to entry’s name.
      const file = new File([blob], entry.name, {
        // 8. Set f’s lastModified to entry’s modification timestamp.
        lastModified: entry.modificationTimestamp,
        type,
      });

      // 10. Resolve result with f.
      resolve(file);
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
    queueMicrotask(async () => {
      // 1. Let entry be the result of locating an entry given locator.
      const entry = locateEntry(fsLocator, this.io, this.fs);

      // 2. Let accessResult be the result of running entry’s request access given "readwrite".
      const accessResult = await entry?.requestAccess("readwrite");

      // 3. If accessResult’s permission state is not "granted", queue a storage task with global to reject result with a DOMException of accessResult’s error name and abort these steps.
      if (accessResult && accessResult.permissionState !== "granted") {
        return reject(new DOMException(accessResult.errorName));
      }

      // 4. If entry is null, queue a storage task with global to reject result with a "NotFoundError" DOMException and abort these steps.
      if (entry === null) {
        return reject(new DOMException(Msg.NotFound, "NotFoundError"));
      }

      // 5. Assert: entry is a file entry.
      assertFileEntry(entry);

      // 6. Let lockResult be the result of taking a lock with "shared" on entry.
      const lockResult = takeLock("shared", entry);

      // 7. Queue a storage task with global to run these steps:

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
      const stream = createFileSystemWritableFileStream(entry);

      // 3. If options["keepExistingData"] is true:
      if (options?.keepExistingData) {
        // 1. Set stream’s [[buffer]] to a copy of entry’s binary data.
        stream[buffer] = entry.binaryData.slice(0);
      }

      // 4. Resolve result with stream.
      return resolve(stream);
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
    queueMicrotask(async () => {
      // 1. Let entry be the result of locating an entry given locator.
      const entry = locateEntry(fsLocator, this.io, this.fs);

      // 2. Let accessResult be the result of running entry’s request access given "readwrite".
      const accessResult = await entry?.requestAccess("readwrite");

      // 3. If accessResult’s permission state is not "granted", queue a storage task with global to reject result with a DOMException of accessResult’s error name and abort these steps.
      if (accessResult && accessResult.permissionState !== "granted") {
        return reject(new DOMException(accessResult.errorName));
      }

      // 4. If isInABucketFileSystem is false, queue a storage task with global to reject result with an "InvalidStateError" DOMException and abort these steps.

      // 5. If entry is null, queue a storage task with global to reject result with a "NotFoundError" DOMException and abort these steps.
      if (entry === null) {
        return reject(new DOMException(Msg.NotFound, "NotFoundError"));
      }

      // 6. Assert: entry is a file entry.
      assertFileEntry(entry);

      // 7. Let lockResult be the result of taking a lock with "exclusive" on entry.
      const lockResult = takeLock("exclusive", entry);

      // 8. Queue a storage task with global to run these steps:

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
      const handle = createFileSystemSyncAccessHandle(entry);

      // 3. Resolve result with handle.
      resolve(handle);
    });

    // 7. Return result.
    return result;
  }
}

function assertFileEntry(_: FileSystemEntry): asserts _ is FileEntry {}

interface BlobDataItemOptions {
  lastModified: number;
  locator: FileSystemLocator;
  entry: FileEntry;
  fs: UnderlyingFileSystem;
  io: IO;
  binaryData: Uint8Array;
}

class BlobDataItem extends Blob {
  lastModified: number;
  locator: FileSystemLocator;
  entry: FileEntry;
  fs: UnderlyingFileSystem;
  io: IO;
  binaryData: Uint8Array;

  constructor(options: BlobDataItemOptions) {
    super([options.binaryData]);

    this.lastModified = options.lastModified;
    this.locator = options.locator;
    this.entry = options.entry;
    this.fs = options.fs;
    this.io = options.io;
    this.binaryData = options.binaryData;
  }

  slice(start: number = 0, end?: number): Blob {
    const binaryData = this.binaryData.slice(start, end);

    return new BlobDataItem({
      lastModified: this.lastModified,
      locator: this.locator,
      entry: { ...this.entry, binaryData },
      fs: this.fs,
      io: this.io,
      binaryData,
    });
  }

  stream(): ReadableStream<Uint8Array> {
    const timestamp = this.io.modificationTimestamp(this.locator);

    if (timestamp > this.lastModified) {
      throw new DOMException(
        "The requested file could not be read, typically due to permission problems that have occurred after a reference to a file was acquired.",
        "NotReadableError",
      );
    }

    return this.fs.stream(this.entry, this.locator);
  }
}

export function createChildFileSystemFileHandle(
  parentLocator: FileSystemLocator,
  name: string,
  realm: {
    FileSystemFileHandle: typeof FileSystemFileHandle;
    fs: UnderlyingFileSystem;
    io: IO;
  },
): FileSystemFileHandle {
  // 2. Let childType be "file".
  const childType = "file";

  // 3. Let childRoot be a copy of parentLocator’s root.
  const childRoot = parentLocator.root;

  // 4. Let childPath be the result of cloning parentLocator’s path and appending name.
  const childPath = parentLocator.path.concat(name);
  const locator = {
    kind: childType,
    root: childRoot,
    path: childPath,
  } satisfies FileSystemLocator;
  // 5. Set handle’s locator to a file system locator whose kind is childType, root is childRoot, and path is childPath.
  // 1. Let handle be a new FileSystemFileHandle in realm.
  const handle = new realm.FileSystemFileHandle(locator, realm.fs, realm.io);

  // 6. Return handle.
  return handle;
}

export function createFileSystemFileHandle(
  root: string,
  path: string[],
  fs: UnderlyingFileSystem,
  io: IO,
): FileSystemFileHandle {
  const locator = {
    kind: "file",
    root,
    path,
  } satisfies FileSystemLocator;

  // 1. Let handle be a new FileSystemFileHandle in realm.
  // 2. Set handle’s locator to a file system locator whose kind is "file", root is root, and path is path.
  const handle = new FileSystemFileHandle(locator, fs, io);

  // 3. Return handle.
  return handle;
}
