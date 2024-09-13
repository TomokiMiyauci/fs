import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { FileEntry, FileSystem } from "@test/util.ts";
import {
  createNewFileSystemWritableFileStream,
  FileSystemWritableFileStream,
  writeChunk,
} from "./file_system_writable_file_stream.ts";
import { Msg } from "./constant.ts";

describe("FileSystemWritableFileStream", () => {
  interface Context {
    fileSystem: FileSystem;
    fileEntry: FileEntry;
  }

  beforeEach<Context>(function () {
    this.fileSystem = new FileSystem();
    this.fileEntry = new FileEntry(this.fileSystem);
  });

  describe("constructor", () => {
    it("should not construct", () => {
      // @ts-expect-error it should not construct
      new FileSystemWritableFileStream();
    });
  });

  describe("close", () => {
    it<Context>("should throw error if it does not permit", async function () {
      const errorName = "CustomError";
      this.fileEntry.queryAccess = () => {
        return { permissionState: "denied", errorName };
      };
      const stream = createNewFileSystemWritableFileStream(this.fileEntry);

      await expect(stream.close()).rejects.toThrow(
        new DOMException(Msg.PermissionDenied, errorName),
      );
    });

    it<Context>(
      "should throw error if setting binaryData is failed",
      async function () {
        class MyError extends Error {
          name: string = "custom";
        }

        Object.defineProperty(this.fileEntry, "binaryData", {
          set() {
            throw new MyError();
          },
        });
        const stream = createNewFileSystemWritableFileStream(this.fileEntry);

        await expect(stream.close()).rejects.toThrow(
          MyError,
        );
      },
    );
  });
});

describe("writeChunk", () => {
  interface Context {
    fileSystem: FileSystem;
    fileEntry: FileEntry;
    stream: FileSystemWritableFileStream;
  }

  beforeEach<Context>(function () {
    this.fileSystem = new FileSystem();
    this.fileEntry = new FileEntry(this.fileSystem);
    this.stream = createNewFileSystemWritableFileStream(this.fileEntry);
  });

  it<Context>("should throw error if it does not permit", async function () {
    const errorName = "custom";
    this.fileEntry.queryAccess = () => {
      return { permissionState: "denied", errorName };
    };

    await expect(writeChunk(this.stream, { type: "truncate" })).rejects.toThrow(
      new DOMException(Msg.PermissionDenied, errorName),
    );
  });
});
