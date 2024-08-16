import { concat } from "@std/bytes/concat";
import { releaseLock } from "./algorithm.ts";
import type {
  FileEntry,
  FileSystemWriteChunkType,
  WriteParams,
} from "./type.ts";
import type { UserAgent } from "./observer.ts";
import { buffer, file as $file, seekOffset } from "./symbol.ts";
import { Msg } from "./constant.ts";
import { queueRecord } from "./observer.ts";
import type { FileSystemHandle } from "./file_system_handle.ts";

export class FileSystemWritableFileStream
  extends WritableStream<FileSystemWriteChunkType> {
  /**
   * @see https://fs.spec.whatwg.org/#filesystemwritablefilestream-file
   */
  [$file]: FileEntry;

  /**
   * @see https://fs.spec.whatwg.org/#filesystemwritablefilestream-seekoffset
   */
  [seekOffset]: number = 0;

  /**
   * @see https://fs.spec.whatwg.org/#filesystemwritablefilestream-buffer
   */
  [buffer]: Uint8Array = new Uint8Array(0);

  constructor(
    entry: FileEntry,
    underlyingSink?: UnderlyingSink<FileSystemWriteChunkType> | undefined,
    strategy?: QueuingStrategy<FileSystemWriteChunkType> | undefined,
  ) {
    super(underlyingSink, strategy);

    this[$file] = entry;
  }

  seek(position: number): Promise<void> {
    // 1. Let writer be the result of getting a writer for this.
    const writer = super.getWriter();

    // 2. Let result be the result of writing a chunk to writer given «[ "type" → "seek", "position" → position ]».
    const result = writer.write({ type: "seek", position });

    // 3. Release writer.
    writer.releaseLock();

    // 4. Return result.
    return result;
  }

  truncate(size: number): Promise<void> {
    // 1. Let writer be the result of getting a writer for this.
    const writer = super.getWriter();

    // 2. Let result be the result of writing a chunk to writer given «[ "type" → "truncate", "size" → size ]».
    const result = writer.write({ type: "truncate", size });

    // 3. Release writer.
    writer.releaseLock();

    // 4. Return result.
    return result;
  }

  write(data: FileSystemWriteChunkType): Promise<void> {
    // 1. Let writer be the result of getting a writer for this.
    const writer = super.getWriter();

    // 2. Let result be the result of writing a chunk to writer given data.
    const result = writer.write(data);

    // 3. Release writer.
    writer.releaseLock();

    // 4. Return result.
    return result;
  }
}

/**
 * @see https://fs.spec.whatwg.org/#create-a-new-filesystemwritablefilestream
 */
export function createFileSystemWritableFileStream(
  file: FileEntry,
  context: {
    root: FileSystemHandle;
    handle: FileSystemHandle;
    userAgent: UserAgent;
  },
): FileSystemWritableFileStream {
  // 3. Let writeAlgorithm be an algorithm which takes a chunk argument and returns the result of running the write a chunk algorithm with stream and chunk.
  const writeAlgorithm: UnderlyingSinkWriteCallback<FileSystemWriteChunkType> =
    (chunk: FileSystemWriteChunkType) =>
      writeChunk(stream, chunk, context.userAgent);

  // 4. Let closeAlgorithm be these steps:
  const closeAlgorithm: UnderlyingSinkCloseCallback = () => {
    // 1. Let closeResult be a new promise.
    const { promise: closeResult, reject, resolve } = Promise.withResolvers<
      void
    >();

    // 2. Enqueue the following steps to the file system queue:
    context.userAgent.fileSystemQueue.enqueue(() => {
      // 1. Let accessResult be the result of running file’s query access given "readwrite".
      const accessResult = file.queryAccess("readwrite");

      // 2. Queue a storage task with file’s relevant global object to run these steps:
      context.userAgent.storageTask.enqueue(() => {
        // 1. If accessResult’s permission state is not "granted", reject closeResult with a DOMException of accessResult’s error name and abort these steps.
        if (accessResult && accessResult.permissionState !== "granted") {
          return reject(new DOMException(accessResult.errorName));
        }

        // 2. Run implementation-defined malware scans and safe browsing checks. If these checks fail, reject closeResult with an "AbortError" DOMException and abort these steps.

        try {
          // 3. Set stream’s [[file]]'s binary data to stream’s [[buffer]]. If that throws an exception, reject closeResult with that exception and abort these steps.
          stream[$file].binaryData = stream[buffer];
        } catch (e) {
          return reject(e);
        }

        queueRecord(
          context.handle["registeredObserverList"],
          context.handle,
          "modified",
          context.root,
          context.userAgent,
        );

        // 4. Enqueue the following steps to the file system queue:
        context.userAgent.fileSystemQueue.enqueue(() => {
          // 1. Release the lock on stream’s [[file]].
          releaseLock(stream[$file]);

          // 2. Queue a storage task with file’s relevant global object to resolve closeResult with undefined.
          context.userAgent.storageTask.enqueue(() => {
            resolve();
          });
        });
      });
    });

    // 3. Return closeResult.
    return closeResult;
  };

  // 5. Let abortAlgorithm be these steps:
  const abortAlgorithm: UnderlyingSinkAbortCallback = () => {
    // 1. Enqueue this step to the file system queue:
    context.userAgent.fileSystemQueue.enqueue(() => {
      // 1. Release the lock on stream’s [[file]].
      releaseLock(stream[$file]);
    });
  };

  // 6. Let highWaterMark be 1.
  const highWaterMark = 1;

  // 7. Let sizeAlgorithm be an algorithm that returns 1.
  const sizeAlgorithm: QueuingStrategySize<FileSystemWriteChunkType> = () => 1;

  // 1. Let stream be a new FileSystemWritableFileStream in realm.
  // 2. Set stream’s [[file]] to file.
  const stream = new FileSystemWritableFileStream(file, {
    abort: abortAlgorithm,
    close: closeAlgorithm,
    write: writeAlgorithm,
  }, { highWaterMark, size: sizeAlgorithm });

  // 8. Set up stream with writeAlgorithm set to writeAlgorithm, closeAlgorithm set to closeAlgorithm, abortAlgorithm set to abortAlgorithm, highWaterMark set to highWaterMark, and sizeAlgorithm set to sizeAlgorithm.
  // setup(
  //   stream,
  //   writeAlgorithm,
  //   closeAlgorithm,
  //   abortAlgorithm,
  //   highWaterMark,
  //   sizeAlgorithm,
  // );

  // 9. Return stream.
  return stream;
}

/**
 * @see https://fs.spec.whatwg.org/#write-a-chunk
 */
export function writeChunk(
  stream: FileSystemWritableFileStream,
  chunk: FileSystemWriteChunkType,
  userAgent: UserAgent,
): Promise<void> {
  // 1. Let input be the result of converting chunk to a FileSystemWriteChunkType. If this throws an exception, then return a promise rejected with that exception.
  const input = toWriteParams(chunk);

  // 2. Let p be a new promise.
  const { promise: p, reject, resolve } = Promise.withResolvers<void>();

  // 3. Enqueue the following steps to the file system queue:
  userAgent.fileSystemQueue.enqueue(async () => {
    // 1. Let accessResult be the result of running stream’s [[file]]'s query access given "readwrite".
    const accessResult = await stream[$file].queryAccess("readwrite");

    // 2. Queue a storage task with stream’s relevant global object to run these steps:
    userAgent.storageTask.enqueue(async () => {
      // 1. If accessResult’s permission state is not "granted", reject p with a DOMException of accessResult’s error name and abort these steps.
      if (accessResult && accessResult.permissionState !== "granted") {
        return reject(new DOMException(accessResult.errorName));
      }

      // 2. Let command be input["type"] if input is a dictionary; otherwise "write".
      const command = input.type;

      // 3. If command is "write":
      if (command === "write") {
        // 1. If input is undefined or input is a dictionary and input["data"] does not exist, reject p with a TypeError and abort these steps.
        if (!input || input.data === null || input.data === undefined) {
          return reject(new TypeError(Msg.InvalidWriteParams));
        }

        // 2. Let data be input["data"] if input is a dictionary; otherwise input.
        const data = input.data;

        // 3. Let writePosition be stream’s [[seekOffset]].
        let writePosition = stream[seekOffset];

        // 4. If input is a dictionary and input["position"] exists, set writePosition to input["position"].
        if (typeof input.position === "number") writePosition = input.position;

        // 5. Let oldSize be stream’s [[buffer]]'s length.
        const oldSize = stream[buffer].byteLength;

        let dataBytes: Uint8Array;
        // 6. If data is a BufferSource, let dataBytes be a copy of data.
        // 7. Otherwise, if data is a Blob:
        if (data instanceof Blob) {
          // 1. Let dataBytes be the result of performing the read operation on data. If this throws an exception, reject p with that exception and abort these steps.
          dataBytes = await data.bytes();
          // 8. Otherwise:
        } else if (typeof data === "string") {
          // 1. Assert: data is a USVString.

          // 2. Let dataBytes be the result of UTF-8 encoding data.
          dataBytes = new TextEncoder().encode(data);
        } else {
          if (data instanceof ArrayBuffer) {
            dataBytes = new Uint8Array(data);
          } else {
            dataBytes = new Uint8Array(data.buffer);
          }
        }

        // 9. If writePosition is larger than oldSize, append writePosition - oldSize 0x00 (NUL) bytes to the end of stream’s [[buffer]].
        if (writePosition > oldSize) {
          const size = writePosition - oldSize;

          stream[buffer] = concat([stream[buffer], new Uint8Array(size)]);
        }

        // 10. Let head be a byte sequence containing the first writePosition bytes of stream’s[[buffer]].
        const head = stream[buffer].slice(0, writePosition);

        // 11. Let tail be an empty byte sequence.
        let tail = new Uint8Array(0);

        // 12. If writePosition + data’s length is smaller than oldSize:
        if (writePosition + length(data) < oldSize) {
          // 1. Let tail be a byte sequence containing the last oldSize - (writePosition + data’s length) bytes of stream’s [[buffer]].
          const index = oldSize - (writePosition + length(data));

          tail = stream[buffer].slice(-index);
        }

        // 13. Set stream’s [[buffer]] to the concatenation of head, data and tail.
        stream[buffer] = concat([head, dataBytes, tail]);

        // 14. If the operations modifying stream’s [[buffer]] in the previous steps failed due to exceeding the storage quota, reject p with a "QuotaExceededError" DOMException and abort these steps, leaving stream’s [[buffer]] unmodified.

        // 15. Set stream’s [[seekOffset]] to writePosition + data’s length.
        stream[seekOffset] = writePosition + length(data);

        // 16. Resolve p.
        resolve();

        // 4. Otherwise, if command is "seek":
      } else if (command === "seek") {
        // 1. Assert: chunk is a dictionary.

        // 2. If chunk["position"] does not exist, reject p with a TypeError and abort these steps.
        if (typeof input.position !== "number") {
          return reject(new TypeError(Msg.InvalidSeekParams));
        }

        // 3. Set stream’s [[seekOffset]] to chunk["position"].
        stream[seekOffset] = input.position;

        // 4. Resolve p.
        resolve();

        // 5. Otherwise, if command is "truncate":
      } else if (command === "truncate") {
        // 1. Assert: chunk is a dictionary.

        // 2. If chunk["size"] does not exist, reject p with a TypeError and abort these steps.
        if (typeof input.size !== "number") {
          return reject(new TypeError(Msg.InvalidTruncateParams));
        }

        // 3. Let newSize be chunk["size"].
        const newSize = input.size;

        // 4. Let oldSize be stream’s [[buffer]]'s length.
        const oldSize = stream[buffer].byteLength;

        // 5. If newSize is larger than oldSize:
        if (newSize > oldSize) {
          // 1. Set stream’s [[buffer]] to a byte sequence formed by concating stream’s [[buffer]] with a byte sequence containing newSize-oldSize 0x00 bytes.
          stream[buffer] = concat([
            stream[buffer],
            new Uint8Array(newSize - oldSize),
          ]);

          // 2. If the operation in the previous step failed due to exceeding the storage quota, reject p with a "QuotaExceededError" DOMException and abort these steps, leaving stream’s [[buffer]] unmodified.
        } // 6. Otherwise, if newSize is smaller than oldSize:
        else if (newSize < oldSize) {
          // 1. Set stream’s [[buffer]] to a byte sequence containing the first newSize bytes in stream’s [[buffer]].
          stream[buffer] = stream[buffer].slice(0, newSize);
        }

        // 7. If stream’s [[seekOffset]] is bigger than newSize, set stream’s [[seekOffset]] to newSize.
        if (stream[seekOffset] > newSize) stream[seekOffset] = newSize;

        // 8. Resolve p.
        resolve();
      }
    });
  });

  // 4. Return p.
  return p;
}

function toWriteParams(chunk: FileSystemWriteChunkType): WriteParams {
  if (typeof chunk === "string") return { type: "write", data: chunk };
  if (chunk instanceof Blob) return { type: "write", data: chunk };
  if (chunk instanceof ArrayBuffer) return { type: "write", data: chunk };

  if ("buffer" in chunk) {
    return { type: "write", data: chunk };
  }

  return chunk;
}

function length(data: string | BufferSource | Blob): number {
  if (typeof data === "string") return data.length;

  if (data instanceof Blob) return data.size;

  return data.byteLength;
}
