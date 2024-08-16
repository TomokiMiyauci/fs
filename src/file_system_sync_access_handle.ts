import { concat } from "@std/bytes/concat";
import { releaseLock } from "./algorithm.ts";
import type {
  AllowSharedBufferSource,
  FileEntry,
  FileSystemLocator,
  FileSystemReadWriteOptions,
} from "./type.ts";
import type { UserAgent } from "./observer.ts";
import { file as $file, locator as $locator, state } from "./symbol.ts";

export class FileSystemSyncAccessHandle {
  /**
   * @see https://fs.spec.whatwg.org/#filesystemsyncaccesshandle-state
   */
  [state]: "open" | "close" = "open";

  /**
   * @see https://fs.spec.whatwg.org/#filesystemsyncaccesshandle-file
   */
  [$file]: FileEntry;

  [$locator]: FileSystemLocator;
  private filePositionCursor: number = 0;

  constructor(
    locator: FileSystemLocator,
    entry: FileEntry,
    private userAgent: UserAgent,
  ) {
    this[$locator] = locator;
    this[$file] = entry;
  }

  read(
    buffer: AllowSharedBufferSource,
    options?: FileSystemReadWriteOptions,
  ): number {
    this.assertUnsignedLongLong(options?.at);

    // 1. If this's [[state]] is "closed", throw an "InvalidStateError" DOMException.
    if (this[state] === "close") throw new DOMException("InvalidStateError");

    // 2. Let bufferSize be buffer’s byte length.
    const bufferSize = buffer.byteLength;

    try {
      // 3. Let fileContents be this's [[file]]'s binary data.
      const fileContents = this[$file].binaryData;

      // 4. Let fileSize be fileContents’s length.
      const fileSize = fileContents.length;

      // 5. Let readStart be options["at"] if options["at"] exists; otherwise this's file position cursor.
      const readStart = typeof options?.at === "number"
        ? options.at
        : this.filePositionCursor;

      // 6. If the underlying file system does not support reading from a file offset of readStart, throw a TypeError.

      // 7. If readStart is larger than fileSize:
      if (readStart > fileSize) {
        // 1. Set this's file position cursor to fileSize.
        this.filePositionCursor = fileSize;

        // 2. Return 0.
        return 0;
      }

      // 8. Let readEnd be readStart + (bufferSize − 1).
      // No need -1?
      let readEnd = readStart + bufferSize;

      // 9. If readEnd is larger than fileSize, set readEnd to fileSize.
      if (readEnd > fileSize) readEnd = fileSize;

      // 10. Let bytes be a byte sequence containing the bytes from readStart to readEnd of fileContents.
      const bytes = fileContents.slice(readStart, readEnd);

      // 11. Let result be bytes’s length.
      const result = bytes.length;

      // 13. Let arrayBuffer be buffer’s underlying buffer.
      const arrayBuffer = undelyingBuffer(buffer);

      // 14. Write bytes into arrayBuffer.
      write(arrayBuffer, bytes);

      // 15. Set this's file position cursor to readStart + result.
      this.filePositionCursor = readStart + result;

      // 16. Return result.
      return result;

      // 12. If the operations reading from fileContents in the previous steps failed:
    } catch {
      // 1. If there were partial reads and the number of bytes that were read into bytes is known, set result to the number of read bytes.

      // 2. Otherwise set result to 0.
      return 0;
      // The following are not executable
    }
  }

  write(
    buffer: AllowSharedBufferSource,
    options?: FileSystemReadWriteOptions,
  ): number {
    this.assertUnsignedLongLong(options?.at);

    // 1. If this's [[state]] is "closed", throw an "InvalidStateError" DOMException.
    if (this[state] === "close") throw new DOMException("InvalidStateError");

    // 2. Let writePosition be options["at"] if options["at"] exists; otherwise this's file position cursor.
    const writePosition = typeof options?.at === "number"
      ? options.at
      : this.filePositionCursor;

    // 3. If the underlying file system does not support writing to a file offset of writePosition, throw a TypeError.

    // 4. Let fileContents be a copy of this's [[file]]'s binary data.
    let fileContents = this[$file].binaryData.slice();

    // 5. Let oldSize be fileContents’s length.
    const oldSize = fileContents.length;

    // 6. Let bufferSize be buffer’s byte length.
    const bufferSize = buffer.byteLength;

    // 7. If writePosition is larger than oldSize, append writePosition − oldSize 0x00 (NUL) bytes to the end of fileContents.
    if (writePosition > oldSize) {
      fileContents = concat([
        fileContents,
        new Uint8Array(writePosition - oldSize),
      ]);
    }

    // 8. Let head be a byte sequence containing the first writePosition bytes of fileContents.
    const head = fileContents.slice(0, writePosition);

    // 9. Let tail be an empty byte sequence.
    let tail = new Uint8Array();

    // 10. If writePosition + bufferSize is smaller than oldSize:
    if ((writePosition + bufferSize) < oldSize) {
      const lastIndex = oldSize - (writePosition + bufferSize);
      // 1. Set tail to a byte sequence containing the last oldSize − (writePosition + bufferSize) bytes of fileContents.
      tail = fileContents.slice(-lastIndex);
    }

    // 11. Let newSize be head’s length + bufferSize + tail’s length.
    // const newSize = head.length + bufferSize + tail.length;

    // 12. If newSize − oldSize exceeds the available storage quota, throw a "QuotaExceededError" DOMException.

    try {
      // 13. Set this's [[file]]'s binary data to the concatenation of head, the contents of buffer and tail.
      this[$file].binaryData = concat([head, contentsOf(buffer), tail]);

      // 14. If the operations modifying the this's[[file]]'s binary data in the previous steps failed:
    } catch {
      // 1. If there were partial writes and the number of bytes that were written from buffer is known:

      // 1. Let bytesWritten be the number of bytes that were written from buffer.

      // 2. Set this's file position cursor to writePosition + bytesWritten.

      // 3. Return bytesWritten.

      // 2. Otherwise throw an "InvalidStateError" DOMException.
      throw new DOMException("InvalidStateError");
    }

    // 15. Set this's file position cursor to writePosition + bufferSize.
    this.filePositionCursor = writePosition + bufferSize;

    // 16. Return bufferSize.
    return bufferSize;
  }

  truncate(newSize: number): void {
    this.assertUnsignedLongLong(newSize);

    // 1. If this's [[state]] is "closed", throw an "InvalidStateError" DOMException.
    if (this[state] === "close") throw new DOMException("InvalidStateError");

    // 2. Let fileContents be a copy of this's [[file]]'s binary data.
    const fileContents = this[$file].binaryData.slice();

    // 3. Let oldSize be the length of this's [[file]]'s binary data.
    const oldSize = this[$file].binaryData.length;

    // 4. If the underlying file system does not support setting a file’s size to newSize, throw a TypeError.

    // 5. If newSize is larger than oldSize:
    if (newSize > oldSize) {
      // 1. If newSize − oldSize exceeds the available storage quota, throw a "QuotaExceededError" DOMException.

      try {
        // 2. Set this's [[file]]'s to a byte sequence formed by concatenating fileContents with a byte sequence containing newSize − oldSize 0x00 bytes.
        this[$file].binaryData = concat([
          fileContents.slice(0, newSize),
          new Uint8Array(newSize - oldSize),
        ]);
      } catch {
        // 3. If the operations modifying the this's [[file]]'s binary data in the previous steps failed, throw an "InvalidStateError" DOMException.
        throw new DOMException("InvalidStateError");
      }

      // 6. Otherwise, if newSize is smaller than oldSize:
    } else if (newSize < oldSize) {
      try {
        // 1. Set this's [[file]]'s to a byte sequence containing the first newSize bytes in fileContents.
        this[$file].binaryData = fileContents.slice(0, newSize);
      } catch {
        // 2. If the operations modifying the this's [[file]]'s binary data in the previous steps failed, throw an "InvalidStateError" DOMException.
        throw new DOMException("InvalidStateError");
      }
    }

    // 7. If this's file position cursor is greater than newSize, then set file position cursor to newSize.
    if (this.filePositionCursor > newSize) this.filePositionCursor = newSize;
  }

  getSize(): number {
    // 1. If this's [[state]] is "closed", throw an "InvalidStateError" DOMException.
    if (this[state] === "close") throw new DOMException("InvalidStateError");

    // 2. Return this's [[file]]'s binary data's length.
    return this[$file].binaryData.length;
  }

  flush(): void {
    // 1. If this's [[state]] is "closed", throw an "InvalidStateError" DOMException.
    if (this[state] === "close") throw new DOMException("InvalidStateError");

    // 2. Attempt to transfer all cached modifications of the file’s content to the file system’s underlying storage device.
  }

  close(): void {
    // 1. If this's [[state]] is "closed", return.
    if (this[state] === "close") return;

    // 2. Set this's [[state]] to "closed".
    this[state] = "close";

    // 3. Set lockReleased to false.
    let lockReleased = false;

    // 4. Let file be this's [[file]].
    const file = this[$file];

    // 5. Enqueue the following steps to the file system queue:
    this.userAgent.fileSystemQueue.enqueue(() => {
      // 1. Release the lock on file.
      releaseLock(file);

      // 2. Set lockReleased to true.
      lockReleased = true;
    });

    const pauseForRelease = () => {
      if (lockReleased) return;

      setTimeout(pauseForRelease, 0);
    };

    // 6. Pause until lockReleased is true.
    pauseForRelease();
  }

  private assertUnsignedLongLong(value: number | undefined): asserts value {
    if (typeof value === "number" && !isUnsignedLongLong(value)) {
      throw new TypeError("Invalid range of value");
    }
  }
}

function isUnsignedLongLong(value: number): boolean {
  return Number.isInteger(value) && 0 <= value;
}

export function createFileSystemSyncAccessHandle(
  locator: FileSystemLocator,
  file: FileEntry,
  userAgent: UserAgent,
): FileSystemSyncAccessHandle {
  // 1. Let handle be a new FileSystemSyncAccessHandle in realm.
  // 2. Set handle’s [[file]] to file.
  const handle = new FileSystemSyncAccessHandle(locator, file, userAgent);

  // 3. Set handle’s [[state]] to "open".
  handle[state] = "open";

  // 4. Return handle.
  return handle;
}

function contentsOf(buffer: AllowSharedBufferSource): Uint8Array {
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
  else {
    return new Uint8Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );
  }
}

function write(buffer: Uint8Array, bytes: Uint8Array): void {
  buffer.set(bytes);
}

function undelyingBuffer(buffer: AllowSharedBufferSource): Uint8Array {
  return buffer instanceof ArrayBuffer
    ? new Uint8Array(buffer)
    : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}
