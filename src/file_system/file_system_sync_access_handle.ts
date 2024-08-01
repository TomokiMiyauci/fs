import { releaseLock } from "./algorithm.ts";
import type {
  AllowSharedBufferSource,
  FileEntry,
  FileSystemReadWriteOptions,
} from "./type.ts";
import { $file } from "./symbol.ts";
import { concat } from "@std/bytes";

const state = Symbol("[[state]]");

export class FileSystemSyncAccessHandle {
  /**
   * @see https://fs.spec.whatwg.org/#filesystemsyncaccesshandle-state
   */
  [state]: "open" | "close" = "open";
  [$file]!: FileEntry;
  filePositionCursor: number = 0;

  read(
    buffer: AllowSharedBufferSource,
    options?: FileSystemReadWriteOptions,
  ): number {
    // 1. If this's [[state]] is "closed", throw an "InvalidStateError" DOMException.
    if (this[state] === "close") throw new DOMException("InvalidStateError");

    // 2. Let bufferSize be buffer’s byte length.
    const bufferSize = buffer.byteLength;

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
    let readEnd = readStart + (bufferSize - 1);

    // 9. If readEnd is larger than fileSize, set readEnd to fileSize.
    if (readEnd > fileSize) readEnd = fileSize;

    // 10. Let bytes be a byte sequence containing the bytes from readStart to readEnd of fileContents.
    const bytes = fileContents.slice(readStart, readEnd);

    // 11. Let result be bytes’s length.
    const result = bytes.length;

    // 12. If the operations reading from fileContents in the previous steps failed:

    // 1. If there were partial reads and the number of bytes that were read into bytes is known, set result to the number of read bytes.

    // 2. Otherwise set result to 0.

    // 13. Let arrayBuffer be buffer’s underlying buffer.

    // 14. Write bytes into arrayBuffer.

    // 15. Set this's file position cursor to readStart + result.
    this.filePositionCursor = readStart + result;

    // 16. Return result.
    return result;
  }

  write(
    buffer: AllowSharedBufferSource,
    options?: FileSystemReadWriteOptions,
  ): number {
    // 1. If this's [[state]] is "closed", throw an "InvalidStateError" DOMException.
    if (this[state] === "close") throw new DOMException("InvalidStateError");

    // 2. Let writePosition be options["at"] if options["at"] exists; otherwise this's file position cursor.
    const writePosition = typeof options?.at === "number"
      ? options.at
      : this.filePositionCursor;

    // 3. If the underlying file system does not support writing to a file offset of writePosition, throw a TypeError.

    // 4. Let fileContents be a copy of this's [[file]]'s binary data.
    const fileContents = this[$file].binaryData.slice(0);

    // 5. Let oldSize be fileContents’s length.
    const oldSize = fileContents.length;

    // 6. Let bufferSize be buffer’s byte length.
    const bufferSize = buffer.byteLength;

    // 7. If writePosition is larger than oldSize, append writePosition − oldSize 0x00 (NUL) bytes to the end of fileContents.

    // 8. Let head be a byte sequence containing the first writePosition bytes of fileContents.
    // const head = fileContents.slice(0, writePosition);

    // 9. Let tail be an empty byte sequence.
    // let tail = new Uint8Array();

    // 10. If writePosition + bufferSize is smaller than oldSize:
    if (writePosition + bufferSize < oldSize) {
      // const lastIndex = oldSize - (writePosition + bufferSize);
      // 1. Set tail to a byte sequence containing the last oldSize − (writePosition + bufferSize) bytes of fileContents.
      // tail = fileContents.slice(-lastIndex);
    }

    // 11. Let newSize be head’s length + bufferSize + tail’s length.
    // const newSize = head.length + bufferSize + tail.length;

    // 12. If newSize − oldSize exceeds the available storage quota, throw a "QuotaExceededError" DOMException.

    // 13. Set this's [[file]]'s binary data to the concatenation of head, the contents of buffer and tail.

    // 14. If the operations modifying the this's[[file]]'s binary data in the previous steps failed:

    // 1. If there were partial writes and the number of bytes that were written from buffer is known:

    // 1. Let bytesWritten be the number of bytes that were written from buffer.

    // 2. Set this's file position cursor to writePosition + bytesWritten.

    // 3. Return bytesWritten.

    // 2. Otherwise throw an "InvalidStateError" DOMException.

    // 15. Set this's file position cursor to writePosition + bufferSize.
    this.filePositionCursor = writePosition + bufferSize;

    // 16. Return bufferSize.
    return bufferSize;
  }

  truncate(newSize: number): void {
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
    queueMicrotask(() => {
      // 1. Release the lock on file.
      releaseLock(file);

      // 2. Set lockReleased to true.
      lockReleased = true;
    });

    // 6. Pause until lockReleased is true.
    while (!lockReleased) {
      // noop
    }
  }
}

export function createFileSystemSyncAccessHandle(
  file: FileEntry,
): FileSystemSyncAccessHandle {
  // 1. Let handle be a new FileSystemSyncAccessHandle in realm.
  const handle = new FileSystemSyncAccessHandle();

  // 2. Set handle’s [[file]] to file.
  handle[$file] = file;

  // 3. Set handle’s [[state]] to "open".
  handle[state] = "open";

  // 4. Return handle.
  return handle;
}
