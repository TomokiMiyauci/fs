import { runFileSystemHandleTest } from "@test/file_system_handle.ts";
import { VirtualFileSystem } from "@test/util.ts";
import { isInBucketFileSystem } from "./file_system_handle.ts";
import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { createNewFileSystemHandle } from "./algorithm.ts";
import { List, Set } from "@miyauci/infra";

runFileSystemHandleTest(async () => {
  const fs = new VirtualFileSystem();

  return {
    root: await fs.getDirectory(),
  };
});

describe("isInBucketFileSystem", () => {
  it("should return true if the path of first segment is empty", () => {
    const fileHandle = createNewFileSystemHandle(
      {
        locateEntry: () => null,
        getPath() {
          return new List([""]);
        },
        observations: new Set(),
        root: "",
      },
      new List(["", "file.txt"]),
      "file",
    );

    expect(isInBucketFileSystem(fileHandle)).toBeTruthy();
  });

  it("should return true if the path of first segment is not empty", () => {
    const fileHandle = createNewFileSystemHandle(
      {
        locateEntry: () => null,
        getPath() {
          return new List([""]);
        },
        observations: new Set(),
        root: "",
      },
      new List(["file.txt"]),
      "file",
    );

    expect(isInBucketFileSystem(fileHandle)).toBeFalsy();
  });
});