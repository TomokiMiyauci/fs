import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { List, Set } from "@miyauci/infra";
import { isInScope } from "./file_system.ts";
import type {
  FileSystem as IFileSystem,
  FileSystemObservation as IFileSystemObservation,
} from "./file_system.ts";
import { FileSystemObserver } from "./file_system_observer.ts";
import type { FileSystemHandle } from "./file_system_handle.ts";
import { createNewFileSystemHandle } from "./algorithm.ts";
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

class FileSystemObservation implements IFileSystemObservation {
  constructor(fileSystem: FileSystem, path: List<string>, recursive = false) {
    this.rootHandle = createNewFileSystemHandle(
      fileSystem,
      path,
      "directory",
    );
    this.recursive = recursive;
  }
  recursive: boolean;
  observer: FileSystemObserver = new FileSystemObserver(() => {});
  rootHandle: FileSystemHandle;
}

describe("isInScope", () => {
  it("should return false if relationship is 'other'", () => {
    expect(isInScope(
      createNewFileSystemHandle(
        new FileSystem(),
        new List(),
        "file",
      ),
      new FileSystemObservation(new FileSystem(), new List()),
    )).toBeFalsy();
  });

  it("should return true if relationship is 'ancestor'", () => {
    const fileSystem = new FileSystem();
    expect(isInScope(
      createNewFileSystemHandle(
        fileSystem,
        new List(["", "dir"]),
        "directory",
      ),
      new FileSystemObservation(fileSystem, new List(["", "dir", "nested"])),
    )).toBeTruthy();
  });

  it("should return true if relationship is 'direct child'", () => {
    const fileSystem = new FileSystem();
    expect(isInScope(
      createNewFileSystemHandle(
        fileSystem,
        new List(["", "dir", "nested"]),
        "directory",
      ),
      new FileSystemObservation(fileSystem, new List(["", "dir"])),
    )).toBeTruthy();
  });

  it("should return false if relationship is 'descendant' and recursive is false", () => {
    const fileSystem = new FileSystem();
    expect(isInScope(
      createNewFileSystemHandle(
        fileSystem,
        new List(["", "dir", "nested"]),
        "directory",
      ),
      new FileSystemObservation(fileSystem, new List([""])),
    )).toBeFalsy();
  });

  it("should return true if relationship is 'descendant' and recursive is true", () => {
    const fileSystem = new FileSystem();
    expect(isInScope(
      createNewFileSystemHandle(
        fileSystem,
        new List(["", "dir", "nested"]),
        "directory",
      ),
      new FileSystemObservation(fileSystem, new List([""]), true),
    )).toBeTruthy();
  });
});
