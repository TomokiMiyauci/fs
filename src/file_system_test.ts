import { beforeEach, describe, it } from "@std/testing/bdd";
import { assertSpyCallArg, assertSpyCalls, spy } from "@std/testing/mock";
import { expect } from "@std/expect";
import { List, Set } from "@miyauci/infra";
import { delay } from "@std/async/delay";
import {
  DirectoryEntry,
  FileEntry,
  FileSystem,
  FileSystemObservation,
} from "@test/util.ts";
import {
  isInScope,
  notify,
  notifyObservations,
  sendError,
} from "./file_system.ts";
import type { FileSystemPath } from "./file_system.ts";
import { FileSystemObserver } from "./file_system_observer.ts";
import { createNewFileSystemHandle } from "./algorithm.ts";
import {
  createNewFileSystemChangeRecord,
  type FileSystemChangeRecord,
} from "./file_system_change_record.ts";

interface Context {
  fileSystem: FileSystem;
}

describe("sendError", () => {
  beforeEach<Context>(function () {
    this.fileSystem = new FileSystem();
  });

  it<Context>("should do nothing if observations is empty", function () {
    const observations = new Set<FileSystemObservation>();
    this.fileSystem["observations"] = observations;

    sendError(observations, this.fileSystem);
  });

  it<Context>(
    "should clear observations after calling sendError and emit error event",
    async function () {
      const observations = new Set<FileSystemObservation>();

      this.fileSystem["observations"] = observations;

      const rootHandle = createNewFileSystemHandle(
        this.fileSystem,
        new List([""]),
        "directory",
      );

      const records: FileSystemChangeRecord[] = [];
      const observer = new FileSystemObserver((allRecords) => {
        records.push(...allRecords);
      });
      const observation = new FileSystemObservation(rootHandle);
      observation.observer = observer;
      observations.append(observation);

      expect(observations.isEmpty).toBeFalsy();

      sendError(observations, this.fileSystem);

      await delay(0);

      expect(observations.isEmpty).toBeTruthy();
      expect(records).toEqual([
        createNewFileSystemChangeRecord(
          observation,
          rootHandle,
          "errored",
          null,
        ),
      ]);
    },
  );
});

describe("isInScope", () => {
  beforeEach<Context>(function () {
    this.fileSystem = new FileSystem();
  });

  it<Context>("should return false if relationship is 'other'", function () {
    const handle = createNewFileSystemHandle(
      this.fileSystem,
      new List(),
      "directory",
    );

    expect(isInScope(
      createNewFileSystemHandle(
        new FileSystem(),
        new List(),
        "file",
      ),
      new FileSystemObservation(handle),
    )).toBeFalsy();
  });

  it<Context>("should return true if relationship is 'ancestor'", function () {
    const handle = createNewFileSystemHandle(
      this.fileSystem,
      new List(["", "dir", "nested"]),
      "directory",
    );

    expect(isInScope(
      createNewFileSystemHandle(
        this.fileSystem,
        new List(["", "dir"]),
        "directory",
      ),
      new FileSystemObservation(handle),
    )).toBeTruthy();
  });

  it<Context>(
    "should return true if relationship is 'direct child'",
    function () {
      const handle = createNewFileSystemHandle(
        this.fileSystem,
        new List(["", "dir"]),
        "directory",
      );

      expect(isInScope(
        createNewFileSystemHandle(
          this.fileSystem,
          new List(["", "dir", "nested"]),
          "directory",
        ),
        new FileSystemObservation(handle),
      )).toBeTruthy();
    },
  );

  it<Context>(
    "should return false if relationship is 'descendant' and recursive is false",
    function () {
      const handle = createNewFileSystemHandle(
        this.fileSystem,
        new List([""]),
        "directory",
      );

      expect(isInScope(
        createNewFileSystemHandle(
          this.fileSystem,
          new List(["", "dir", "nested"]),
          "directory",
        ),
        new FileSystemObservation(handle),
      )).toBeFalsy();
    },
  );

  it<Context>(
    "should return true if relationship is 'descendant' and recursive is true",
    function () {
      const handle = createNewFileSystemHandle(
        this.fileSystem,
        new List([""]),
        "directory",
      );

      const observation = new FileSystemObservation(handle);
      observation.recursive = true;
      expect(isInScope(
        createNewFileSystemHandle(
          this.fileSystem,
          new List(["", "dir", "nested"]),
          "directory",
        ),
        observation,
      )).toBeTruthy();
    },
  );
});

describe("notify", () => {
  beforeEach<Context>(function () {
    this.fileSystem = new FileSystem();
  });

  it<Context>(
    "should do nothing if eventType is modified and eventEntryType is directory",
    async function () {
      const rootHandle = createNewFileSystemHandle(
        this.fileSystem,
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
        this.fileSystem,
      );

      await delay(0);

      expect(records.length).toBe(0);
    },
  );

  it<Context>(
    "should infer entry type if event's entry type is null",
    async function () {
      const rootHandle = createNewFileSystemHandle(
        this.fileSystem,
        new List([""]),
        "directory",
      );

      const records: FileSystemChangeRecord[] = [];
      const observer = new FileSystemObserver((allRecords) => {
        records.push(...allRecords);
      });
      const observation = new FileSystemObservation(rootHandle);
      observation.observer = observer;

      notify(
        observation,
        new List([{
          type: "appeared",
          entryType: null,
          fromPath: null,
          modifiedPath: new List([""]),
        }]),
        this.fileSystem,
      );

      await delay(0);

      expect(records.length).toBe(1);

      const record = records[0];
      expect(record.changedHandle.kind).toBe("directory");
      expect(record).toEqual(
        createNewFileSystemChangeRecord(
          observation,
          createNewFileSystemHandle(
            this.fileSystem,
            new List([""]),
            "directory",
          ),
          "appeared",
          null,
        ),
      );
    },
  );

  it<Context>(
    "should skip event of moved what is not in scope",
    async function () {
      const rootHandle = createNewFileSystemHandle(
        this.fileSystem,
        new List([""]),
        "directory",
      );

      const records: FileSystemChangeRecord[] = [];
      const observer = new FileSystemObserver((allRecords) => {
        records.push(...allRecords);
      });
      const observation = new FileSystemObservation(rootHandle);
      observation.observer = observer;

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
    },
  );

  it<Context>(
    "should emit appeared event if the event is moved and it's path is not from path in scope",
    async function () {
      const fileEntry = new FileEntry(this.fileSystem);
      fileEntry.name = "file.txt";

      const rootEntry = new DirectoryEntry(this.fileSystem);
      rootEntry.children = new Set([fileEntry]);

      const movedEntry = new FileEntry(this.fileSystem);
      movedEntry.name = "moved.txt";

      this.fileSystem.locateEntry = (path: FileSystemPath) => {
        if (path.size === 1 && path[0] === "") return rootEntry;

        if (
          path.size === 3 && path[0] === "" && path[1] === "dir" &&
          path[2] === "file.txt"
        ) {
          return fileEntry;
        }

        if (path.size === 2 && path[0] === "" && path[1] === "moved.txt") {
          return movedEntry;
        }

        return null;
      };

      const rootHandle = createNewFileSystemHandle(
        this.fileSystem,
        new List([""]),
        "directory",
      );

      const records: FileSystemChangeRecord[] = [];
      const observer = new FileSystemObserver((allRecords) => {
        records.push(...allRecords);
      });
      const observation = new FileSystemObservation(rootHandle);
      observation.observer = observer;

      notify(
        observation,
        new List([{
          type: "moved",
          entryType: "file",
          fromPath: new List(["", "dir", "file.txt"]),
          modifiedPath: new List(["", "moved.txt"]),
        }]),
        this.fileSystem,
      );

      await delay(0);

      expect(records).toEqual([
        createNewFileSystemChangeRecord(
          observation,
          createNewFileSystemHandle(
            this.fileSystem,
            new List(["", "moved.txt"]),
            "file",
          ),
          "appeared",
          {
            fileSystem: this.fileSystem,
            kind: "file",
            path: new List(["file.txt"]),
          },
        ),
      ]);
    },
  );

  it<Context>(
    "should emit disappeared event if the event is moved and it's path is not modified path in scope",
    async function () {
      const fileEntry = new FileEntry(this.fileSystem);
      fileEntry.name = "file.txt";

      const rootEntry = new DirectoryEntry(this.fileSystem);
      rootEntry.children = new Set([fileEntry]);

      const movedEntry = new FileEntry(this.fileSystem);
      movedEntry.name = "moved.txt";

      this.fileSystem.locateEntry = (path: FileSystemPath) => {
        if (path.size === 1 && path[0] === "") return rootEntry;

        if (
          path.size === 2 && path[0] === "" && path[1] === "file.txt"
        ) {
          return fileEntry;
        }

        if (
          path.size === 3 && path[0] === "" && path[1] === "dir" &&
          path[2] === "moved.txt"
        ) {
          return movedEntry;
        }

        return null;
      };

      const rootHandle = createNewFileSystemHandle(
        this.fileSystem,
        new List([""]),
        "directory",
      );

      const records: FileSystemChangeRecord[] = [];
      const observer = new FileSystemObserver((allRecords) => {
        records.push(...allRecords);
      });
      const observation = new FileSystemObservation(rootHandle);
      observation.observer = observer;

      notify(
        observation,
        new List([{
          type: "moved",
          entryType: "file",
          fromPath: new List(["", "file.txt"]),
          modifiedPath: new List(["", "dir", "moved.txt"]),
        }]),
        this.fileSystem,
      );

      await delay(0);

      expect(records).toEqual([
        createNewFileSystemChangeRecord(
          observation,
          createNewFileSystemHandle(
            this.fileSystem,
            new List(["", "file.txt"]),
            "file",
          ),
          "disappeared",
          {
            fileSystem: this.fileSystem,
            kind: "file",
            path: new List(["dir", "file.txt"]),
          },
        ),
      ]);
    },
  );

  it<Context>(
    "should emit error event if disappear root handle",
    async function () {
      const rootHandle = createNewFileSystemHandle(
        this.fileSystem,
        new List([""]),
        "directory",
      );

      const records: FileSystemChangeRecord[] = [];
      const observer = new FileSystemObserver((allRecords) => {
        records.push(...allRecords);
      });
      const observation = new FileSystemObservation(rootHandle);
      observation.observer = observer;

      notify(
        observation,
        new List([{
          type: "disappeared",
          entryType: "directory",
          fromPath: null,
          modifiedPath: new List([""]),
        }]),
        this.fileSystem,
      );

      await delay(0);

      expect(records.length).toBe(2);
      expect(records).toEqual([
        createNewFileSystemChangeRecord(
          observation,
          rootHandle,
          "disappeared",
          null,
        ),
        createNewFileSystemChangeRecord(
          observation,
          rootHandle,
          "errored",
          null,
        ),
      ]);
    },
  );

  it<Context>(
    "should skip if the event type is modified and the type is directory",
    async function () {
      const rootHandle = createNewFileSystemHandle(
        this.fileSystem,
        new List([""]),
        "directory",
      );
      const fn = spy();
      const observer = new FileSystemObserver(fn);
      const observation = new FileSystemObservation(rootHandle);
      observation.observer = observer;

      notify(
        observation,
        new List([{
          type: "modified",
          entryType: "directory",
          fromPath: null,
          modifiedPath: new List([""]),
        }]),
        this.fileSystem,
      );

      await delay(0);

      assertSpyCallArg(fn, 0, 0, []);
      assertSpyCallArg(fn, 0, 1, observer);
    },
  );

  it<Context>(
    "should skip if the event type is modified and the type is null",
    async function () {
      const rootHandle = createNewFileSystemHandle(
        this.fileSystem,
        new List([""]),
        "directory",
      );
      const fn = spy();
      const observer = new FileSystemObserver(fn);
      const observation = new FileSystemObservation(rootHandle);
      observation.observer = observer;

      notify(
        observation,
        new List([{
          type: "modified",
          entryType: null,
          fromPath: null,
          modifiedPath: new List([""]),
        }]),
        this.fileSystem,
      );

      await delay(0);

      assertSpyCallArg(fn, 0, 0, []);
      assertSpyCallArg(fn, 0, 1, observer);
    },
  );
});

describe("notifyObservations", () => {
  it("should call callback if notifyObservations called", async () => {
    const fileSystem = new FileSystem();
    const fn = spy();
    const observer = new FileSystemObserver(fn);
    const handle = createNewFileSystemHandle(
      fileSystem,
      new List([""]),
      "directory",
    );

    fileSystem.observations.append({
      observer,
      rootHandle: handle,
      recursive: false,
    });

    notifyObservations(
      fileSystem,
      new List([{
        entryType: "file",
        fromPath: null,
        modifiedPath: new List(["", "file.txt"]),
        type: "appeared",
      }]),
    );

    await delay(0);

    assertSpyCalls(fn, 1);
  });
});
