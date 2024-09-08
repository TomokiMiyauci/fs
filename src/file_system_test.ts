import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { List, Set } from "@miyauci/infra";
import { delay } from "@std/async/delay";
import { isInScope, notify, sendError } from "./file_system.ts";
import type {
  FileSystem as IFileSystem,
  FileSystemObservation as IFileSystemObservation,
} from "./file_system.ts";
import { FileSystemObserver } from "./file_system_observer.ts";
import type { FileSystemHandle } from "./file_system_handle.ts";
import { createNewFileSystemHandle } from "./algorithm.ts";
import type { FileSystemEntry } from "./file_system_entry.ts";
import {
  createNewFileSystemChangeRecord,
  type FileSystemChangeRecord,
} from "./file_system_change_record.ts";

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

describe("sendError", () => {
  it("should do nothing if observations is empty", () => {
    const observations = new Set<FileSystemObservation>();
    const fileSystem = new FileSystem();
    fileSystem["observations"] = observations;

    sendError(observations, fileSystem);
  });

  it("should clear observations after calling sendError and emit error event", async () => {
    const observations = new Set<FileSystemObservation>();
    const fileSystem = new FileSystem();

    fileSystem["observations"] = observations;

    const allRecords: FileSystemChangeRecord[] = [];
    const rootHandle = createNewFileSystemHandle(
      fileSystem,
      new List([""]),
      "directory",
    );
    const observation = {
      observer: new FileSystemObserver((records) => {
        allRecords.push(...records);
      }),

      recursive: false,
      rootHandle,
    } satisfies FileSystemObservation;
    observations.append(observation);

    expect(observations.isEmpty).toBeFalsy();

    sendError(observations, fileSystem);

    await delay(0);

    expect(observations.isEmpty).toBeTruthy();
    expect(allRecords).toEqual([
      createNewFileSystemChangeRecord(observation, rootHandle, "errored", null),
    ]);
  });
});

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

describe("notify", () => {
  it("should do nothing if eventType is modified and eventEntryType is directory", async () => {
    const fileSystem = new FileSystem();
    const rootHandle = createNewFileSystemHandle(
      fileSystem,
      new List([""]),
      "directory",
    );

    const records: FileSystemChangeRecord[] = [];

    notify(
      {
        observer: new FileSystemObserver((allRecords) => {
          records.push(...allRecords);
        }),
        recursive: false,
        rootHandle,
      },
      new List([{
        type: "modified",
        entryType: "directory",
        fromPath: null,
        modifiedPath: new List(["dir"]),
      }]),
      fileSystem,
    );

    await delay(0);

    expect(records.length).toBe(0);
  });

  it("should infer entry type if event's entry type is null", async () => {
    const fileSystem = new FileSystem();
    const rootHandle = createNewFileSystemHandle(
      fileSystem,
      new List([""]),
      "directory",
    );
    const observation = {
      observer: new FileSystemObserver((allRecords) => {
        records.push(...allRecords);
      }),
      recursive: false,
      rootHandle,
    } satisfies FileSystemObservation;

    const records: FileSystemChangeRecord[] = [];

    notify(
      observation,
      new List([{
        type: "appeared",
        entryType: null,
        fromPath: null,
        modifiedPath: new List([""]),
      }]),
      fileSystem,
    );

    await delay(0);

    expect(records.length).toBe(1);

    const record = records[0];
    expect(record.changedHandle.kind).toBe("directory");
    expect(record).toEqual(
      createNewFileSystemChangeRecord(
        observation,
        createNewFileSystemHandle(fileSystem, new List([""]), "directory"),
        "appeared",
        null,
      ),
    );
  });

  it("should skip event of moved what is not in scope", async () => {
    const fileSystem = new FileSystem();
    const rootHandle = createNewFileSystemHandle(
      fileSystem,
      new List([""]),
      "directory",
    );
    const observation = {
      observer: new FileSystemObserver((allRecords) => {
        records.push(...allRecords);
      }),
      recursive: false,
      rootHandle,
    } satisfies FileSystemObservation;

    const records: FileSystemChangeRecord[] = [];

    notify(
      observation,
      new List([{
        type: "moved",
        entryType: null,
        fromPath: new List([]),
        modifiedPath: new List([]),
      }]),
      new FileSystem(),
    );

    await delay(0);

    expect(records.length).toBe(0);
  });
});
