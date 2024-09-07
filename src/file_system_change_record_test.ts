import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { List, Set } from "@miyauci/infra";
import {
  createNewFileSystemChangeRecord,
  FileSystemChangeRecord,
} from "./file_system_change_record.ts";
import { createNewFileSystemHandle } from "./algorithm.ts";
import { FileSystemObserver } from "./file_system_observer.ts";
import type {
  FileSystem as IFileSystem,
  FileSystemObservation,
} from "./file_system.ts";
import type { FileSystemEntry } from "./file_system_entry.ts";

class FileSystem implements IFileSystem {
  getPath(entry: FileSystemEntry) {
    const path = new List([entry.name]);
    let parent = entry.parent;

    while (parent) {
      path.prepend(parent.name);

      parent = parent.parent;
    }

    return path;
  }
  locateEntry() {
    return null;
  }
  root: string = "";
  observations: Set<FileSystemObservation> = new Set();
}

describe("createNewFileSystemChangeRecord", () => {
  const fileSystem = new FileSystem();
  const rootHandle = createNewFileSystemHandle(
    fileSystem,
    new List([""]),
    "directory",
  );
  const changedHandle = createNewFileSystemHandle(
    fileSystem,
    new List(["", "file.txt"]),
    "file",
  );
  const observer = new FileSystemObserver(() => {});

  it("should return changed record", () => {
    const record = createNewFileSystemChangeRecord(
      {
        observer: new FileSystemObserver(() => {}),
        recursive: false,
        rootHandle,
      },
      changedHandle,
      "appeared",
      null,
    );

    expect(record.type).toBe("appeared");
    expect(record.changedHandle).toBe(changedHandle);
    expect(record.relativePathComponents).toEqual(["file.txt"]);
    expect(record.relativePathMovedFrom).toBe(null);
    expect(record.root).toBe(rootHandle);
  });

  it("should specify relativePathMovedFrom", () => {
    const record = createNewFileSystemChangeRecord(
      { observer, recursive: false, rootHandle },
      changedHandle,
      "moved",
      {
        kind: "file",
        fileSystem,
        path: new List(["", "changed.txt"]),
      },
    );

    expect(record.type).toBe("moved");
    expect(record.changedHandle).toBe(changedHandle);
    expect(record.relativePathComponents).toEqual(["file.txt"]);
    expect(record.relativePathMovedFrom).toEqual(["changed.txt"]);
    expect(record.root).toBe(rootHandle);
  });
});

describe("FileSystemChangeRecord", () => {
  it("should not construct", () => {
    // @ts-expect-error It should not construct
    new FileSystemChangeRecord();
  });
});
