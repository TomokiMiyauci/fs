import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { List, Set } from "@miyauci/infra";
import { getLocator, getRelationship } from "./file_system_locator.ts";
import type {
  FileSystem as IFileSystem,
  FileSystemObservation,
} from "./file_system.ts";
import type {
  DirectoryEntry,
  FileEntry,
  FileSystemEntry,
} from "./file_system_entry.ts";

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

describe("getLocator", () => {
  const fileSystem = new FileSystem();
  const baseEntry = {
    fileSystem,
    queryAccess() {
      return { errorName: "", permissionState: "granted" };
    },
    requestAccess() {
      return { errorName: "", permissionState: "granted" };
    },
  } satisfies Pick<
    FileSystemEntry,
    "queryAccess" | "fileSystem" | "requestAccess"
  >;

  const fileName = "file.txt";
  const baseFileEntry = {
    ...baseEntry,
    binaryData: new Uint8Array(),
    lock: "open",
    sharedLockCount: 0,
    modificationTimestamp: Date.now(),
    name: fileName,
  } satisfies Omit<FileEntry, "parent">;

  const dirName = "dir";
  const baseDirectoryEntry = {
    ...baseEntry,
    name: dirName,
    children: new Set(),
  } satisfies Omit<DirectoryEntry, "parent">;

  it("should return file locator if the entry is non-parent file entry", () => {
    const fileEntry = { ...baseFileEntry, parent: null } satisfies FileEntry;

    expect(getLocator(fileEntry)).toEqual({
      fileSystem,
      path: new List([fileName]),
      kind: "file",
    });
  });

  it("should return file locator if the entry is file entry what has parent", () => {
    const fileEntry = {
      ...baseFileEntry,
      parent: {
        ...baseDirectoryEntry,
        parent: null,
      },
    } satisfies FileEntry;

    expect(getLocator(fileEntry)).toEqual({
      fileSystem,
      path: new List([dirName, fileName]),
      kind: "file",
    });
  });

  it("should return directory locator if the entry is directory entry what has not parent", () => {
    const directoryEntry = {
      ...baseDirectoryEntry,
      parent: null,
    } satisfies DirectoryEntry;

    expect(getLocator(directoryEntry)).toEqual({
      fileSystem,
      path: new List([dirName]),
      kind: "directory",
    });
  });

  it("should return directory locator if the entry is directory entry what has parent", () => {
    const directoryEntry = {
      ...baseDirectoryEntry,
      parent: {
        ...baseDirectoryEntry,
        parent: null,
      },
    } satisfies DirectoryEntry;

    expect(getLocator(directoryEntry)).toEqual({
      fileSystem,
      path: new List([dirName, dirName]),
      kind: "directory",
    });
  });
});

describe("getRelationship", () => {
  it("should return 'other' if fileSystem is not same", () => {
    expect(
      getRelationship({
        fileSystem: new FileSystem(),
        kind: "file",
        path: new List(),
      }, {
        fileSystem: new FileSystem(),
        kind: "file",
        path: new List(),
      }),
    ).toBe("other");
  });

  it("should return 'ancestor' if ", () => {
    const fileSystem = new FileSystem();
    expect(
      getRelationship({
        fileSystem,
        kind: "file",
        path: new List(["", "a"]),
      }, {
        fileSystem,
        kind: "file",
        path: new List([""]),
      }),
    ).toBe("ancestor");
  });

  it("should return 'other' if each path items is not same", () => {
    const fileSystem = new FileSystem();
    expect(
      getRelationship({
        fileSystem,
        kind: "file",
        path: new List(["a"]),
      }, {
        fileSystem,
        kind: "file",
        path: new List(["b"]),
      }),
    ).toBe("other");
  });

  it("should return 'direct child'", () => {
    const fileSystem = new FileSystem();
    expect(
      getRelationship({
        fileSystem,
        kind: "file",
        path: new List(["a"]),
      }, {
        fileSystem,
        kind: "file",
        path: new List(["a", "b"]),
      }),
    ).toBe("direct child");
  });

  it("should return 'descendant'", () => {
    const fileSystem = new FileSystem();
    expect(
      getRelationship({
        fileSystem,
        kind: "file",
        path: new List(["a"]),
      }, {
        fileSystem,
        kind: "file",
        path: new List(["a", "b", "c"]),
      }),
    ).toBe("descendant");
  });
});
