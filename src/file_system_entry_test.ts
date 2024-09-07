import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { List, Set } from "@miyauci/infra";
import {
  type FileEntry as IFileEntry,
  type FileSystemAccessResult,
  isSameLocator,
  isSamePath,
  release,
  take,
} from "./file_system_entry.ts";
import type {
  FileSystem as IFileSystem,
  FileSystemObservation,
} from "./file_system.ts";

class FileSystem implements IFileSystem {
  root: string = "";
  observations: Set<FileSystemObservation> = new Set();
  getPath() {
    return new List(["file.txt"]);
  }
  locateEntry() {
    return null;
  }
}

class FileEntry implements IFileEntry {
  name: string = "file.txt";

  binaryData: Uint8Array = new Uint8Array();

  fileSystem: FileSystem = new FileSystem();

  parent: null = null;

  modificationTimestamp: number = Date.now();

  lock: "open" | "taken-exclusive" | "taken-shared" = "open";

  sharedLockCount: number = 0;
  requestAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }

  queryAccess(): FileSystemAccessResult {
    return { permissionState: "granted", errorName: "" };
  }
}

describe("take", () => {
  interface Context {
    entry: FileEntry;
  }

  beforeEach<Context>(function () {
    this.entry = new FileEntry();
  });

  it<Context>(
    "should return 'success' and lock stats to be 'taken-exclusive' if lock is 'open'",
    function () {
      expect(take("exclusive", this.entry), "success");

      expect(this.entry.lock).toBe("taken-exclusive");
    },
  );

  it<Context>(
    "should return 'success' and lock stats to be 'taken-shared', sharedLockCount increase if lock is 'open'",
    function () {
      this.entry.sharedLockCount = 10;
      expect(this.entry.sharedLockCount).toBe(10);
      expect(take("shared", this.entry), "success");

      expect(this.entry.lock).toBe("taken-shared");
      expect(this.entry.sharedLockCount).toBe(1);
    },
  );

  it<Context>(
    "should return 'failure' if lock is 'taken-exclusive'",
    function () {
      this.entry.lock = "taken-exclusive";

      expect(take("exclusive", this.entry), "failure");
    },
  );

  it<Context>(
    "should return 'failure' if lock is 'taken-exclusive' 2",
    function () {
      this.entry.lock = "taken-exclusive";

      expect(take("shared", this.entry), "failure");
    },
  );

  it<Context>(
    "should return 'failure' if lock is 'taken-shared' and value is 'exclusive'",
    function () {
      this.entry.lock = "taken-shared";

      expect(take("exclusive", this.entry), "failure");
    },
  );

  it<Context>(
    "should return 'success' and increase sharedLockCount if lock is 'taken-shared' and value is 'shared'",
    function () {
      this.entry.lock = "taken-shared";
      this.entry.sharedLockCount = 1;

      expect(take("shared", this.entry), "success");
      expect(this.entry.sharedLockCount).toBe(2);
    },
  );
});

describe("release", () => {
  interface Context {
    entry: FileEntry;
  }

  beforeEach<Context>(function () {
    this.entry = new FileEntry();
  });

  it<Context>("should return 'open' if lock is open", function () {
    release(this.entry);

    expect(this.entry.lock).toBe("open");
  });

  it<Context>("should return 'open' if lock is taken-exclusive", function () {
    this.entry.lock === "taken-exclusive";

    release(this.entry);

    expect(this.entry.lock).toBe("open");
  });

  it<Context>(
    "should decrease sharedLockCount if lock is taken-shared",
    function () {
      this.entry.lock = "taken-shared";
      this.entry.sharedLockCount++;

      expect(this.entry.sharedLockCount).toBe(1);

      release(this.entry);

      expect(this.entry.lock).toBe("open");
      expect(this.entry.sharedLockCount).toBe(0);
    },
  );

  it<Context>(
    "should return  taken-shared if sharedLockCount greater than 2",
    function () {
      this.entry.lock = "taken-shared";
      this.entry.sharedLockCount = 2;

      expect(this.entry.sharedLockCount).toBe(2);

      release(this.entry);

      expect(this.entry.lock).toBe("taken-shared");
      expect(this.entry.sharedLockCount).toBe(1);
    },
  );
});

describe("isSamePath", () => {
  it("should return false if the list size is not same", () => {
    expect(isSamePath(new List([""]), new List())).toBeFalsy();
  });

  it("should return false if the item is not same", () => {
    expect(isSamePath(new List(["", "a"]), new List(["", ""]))).toBeFalsy();
  });

  it("should return true if the all items are same", () => {
    expect(
      isSamePath(new List(["", "a", "b", "c"]), new List(["", "a", "b", "c"])),
    ).toBeTruthy();
  });
});

describe("isSameLocator", () => {
  it("should return false if kind is not same", () => {
    const fileSystem = new FileSystem();
    const path = new List<string>();
    expect(
      isSameLocator({ kind: "directory", path, fileSystem }, {
        kind: "file",
        path,
        fileSystem,
      }),
    ).toBeFalsy();
  });

  it("should return false if fileSystem is not same", () => {
    const path = new List<string>();
    expect(
      isSameLocator({ kind: "directory", path, fileSystem: new FileSystem() }, {
        kind: "directory",
        path,
        fileSystem: new FileSystem(),
      }),
    ).toBeFalsy();
  });

  it("should return true", () => {
    const fileSystem = new FileSystem();

    expect(
      isSameLocator({
        kind: "directory",
        path: new List([""]),
        fileSystem,
      }, {
        kind: "directory",
        path: new List([""]),
        fileSystem,
      }),
    ).toBeTruthy();
  });
});
