import { beforeAll, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { List } from "@miyauci/infra";
import { FileSystem } from "@test/helper.ts";
import {
  createNewFileSystemChangeRecord,
  FileSystemChangeRecord,
} from "./file_system_change_record.ts";
import { createNewFileSystemHandle } from "./algorithm.ts";
import { FileSystemObserver } from "./file_system_observer.ts";
import type { FileSystemFileHandle } from "./file_system_file_handle.ts";
import type { FileSystemDirectoryHandle } from "./file_system_directory_handle.ts";

interface Context {
  fileSystem: FileSystem;
  rootHandle: FileSystemDirectoryHandle | FileSystemFileHandle;
  observer: FileSystemObserver;
}

describe("createNewFileSystemChangeRecord", () => {
  beforeAll<Context>(function () {
    this.fileSystem = new FileSystem();
    this.rootHandle = createNewFileSystemHandle(
      this.fileSystem,
      new List([""]),
      "directory",
    );
    this.observer = new FileSystemObserver(() => {});
  });

  it<Context>("should return changed record", function () {
    const changedHandle = createNewFileSystemHandle(
      this.fileSystem,
      new List(["", "file.txt"]),
      "file",
    );
    const record = createNewFileSystemChangeRecord(
      {
        observer: this.observer,
        recursive: false,
        rootHandle: this.rootHandle,
      },
      changedHandle,
      "appeared",
      null,
    );

    expect(record.type).toBe("appeared");
    expect(record.changedHandle).toBe(changedHandle);
    expect(record.relativePathComponents).toEqual(["file.txt"]);
    expect(record.relativePathMovedFrom).toBe(null);
    expect(record.root).toBe(this.rootHandle);
  });

  it<Context>("should return changed record", function () {
    const changedHandle = createNewFileSystemHandle(
      this.fileSystem,
      new List(["", "file.txt"]),
      "file",
    );
    const record = createNewFileSystemChangeRecord(
      {
        observer: this.observer,
        recursive: false,
        rootHandle: this.rootHandle,
      },
      changedHandle,
      "appeared",
      null,
    );

    expect(record.type).toBe("appeared");
    expect(record.changedHandle).toBe(changedHandle);
    expect(record.relativePathComponents).toEqual(["file.txt"]);
    expect(record.relativePathMovedFrom).toBe(null);
    expect(record.root).toBe(this.rootHandle);
  });

  it<Context>("should specify relativePathMovedFrom", function () {
    const changedHandle = createNewFileSystemHandle(
      this.fileSystem,
      new List(["", "new.txt"]),
      "file",
    );
    const record = createNewFileSystemChangeRecord(
      {
        observer: this.observer,
        recursive: false,
        rootHandle: this.rootHandle,
      },
      changedHandle,
      "moved",
      {
        fileSystem: this.fileSystem,
        kind: "file",
        path: new List(["", "file.txt"]),
      },
    );

    expect(record.type).toBe("moved");
    expect(record.changedHandle).toBe(changedHandle);
    expect(record.relativePathComponents).toEqual(["new.txt"]);
    expect(record.relativePathMovedFrom).toEqual(["file.txt"]);
    expect(record.root).toBe(this.rootHandle);
  });
});

describe("FileSystemChangeRecord", () => {
  it("should not construct", () => {
    // @ts-expect-error It should not construct
    new FileSystemChangeRecord();
  });
});
