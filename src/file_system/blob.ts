import type {
  FileEntry,
  FileSystemLocator,
  IO,
  UnderlyingFileSystem,
} from "./type.ts";

export interface BlobDataItemArgs {
  locator: FileSystemLocator;
  entry: FileEntry;
  fs: UnderlyingFileSystem;
  io: IO;
}

export class BlobDataItem extends Blob {
  private locator: FileSystemLocator;
  private entry: FileEntry;
  private fs: UnderlyingFileSystem;
  private io: IO;

  constructor(args: BlobDataItemArgs) {
    super([args.entry.binaryData]);

    this.locator = args.locator;
    this.entry = args.entry;
    this.fs = args.fs;
    this.io = args.io;
  }

  slice(start: number = 0, end?: number): Blob {
    const binaryData = this.entry.binaryData.slice(start, end);

    return new BlobDataItem({
      locator: this.locator,
      entry: { ...this.entry, binaryData },
      fs: this.fs,
      io: this.io,
    });
  }

  stream(): ReadableStream<Uint8Array> {
    const timestamp = this.io.modificationTimestamp(this.locator);

    if (timestamp > this.entry.modificationTimestamp) {
      throw new DOMException(
        "The requested file could not be read, typically due to permission problems that have occurred after a reference to a file was acquired.",
        "NotReadableError",
      );
    }

    return this.fs.stream(this.entry, this.locator);
  }
}
