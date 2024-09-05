import { List } from "@miyauci/infra";
import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import type { FileSystemEvent } from "@miyauci/fs";
import {
  FsEventConverter,
  readPermissionErrorMsg,
  writePermissionErrorMsg,
} from "./util.ts";

describe("FsEventConverter", () => {
  describe("toEntryType", () => {
    it("should return 'directory' is isDirectory is true", () => {
      expect(
        FsEventConverter.toEntryType({ isDirectory: true, isFile: false }),
      ).toBe("directory");
    });

    it("should return 'file' is isFile is true", () => {
      expect(
        FsEventConverter.toEntryType({ isDirectory: false, isFile: true }),
      ).toBe("file");
    });

    it("should return null if isFile and isDirectory are false", () => {
      expect(
        FsEventConverter.toEntryType({ isDirectory: false, isFile: false }),
      ).toBe(null);
    });
  });

  describe("toModifiedPath", () => {
    it("should return modified path", () => {
      const table: [root: string, path: string, expected: string[]][] = [
        ["/", "/", [""]],
        ["/", "/a", ["a"]],
        ["/", "/a/b", ["a", "b"]],
        ["/a", "/a/b", ["b"]],
        ["/a/b", "/a/b", [""]],
      ];

      for (const [root, path, expected] of table) {
        expect(FsEventConverter.toModifiedPath(root, path)).toEqual(
          new List(expected),
        );
      }
    });
  });

  describe("toFileSystemEvent", () => {
    it("should return file system event", () => {
      const table: [
        root: string,
        path: string,
        kind: Deno.FsEvent["kind"],
        stat: Pick<Deno.FileInfo, "isDirectory" | "isFile"> | undefined,
        expected: FileSystemEvent,
      ][] = [
        ["/", "/a", "access", undefined, {
          entryType: null,
          fromPath: null,
          modifiedPath: new List(["a"]),
          type: "unknown",
        }],

        ["/", "/a", "create", { isDirectory: true, isFile: false }, {
          entryType: "directory",
          fromPath: null,
          modifiedPath: new List(["a"]),
          type: "appeared",
        }],

        ["/", "/a/b", "modify", { isDirectory: false, isFile: true }, {
          entryType: "file",
          fromPath: null,
          modifiedPath: new List(["a", "b"]),
          type: "modified",
        }],

        ["/", "/a/b", "remove", { isDirectory: false, isFile: false }, {
          entryType: null,
          fromPath: null,
          modifiedPath: new List(["a", "b"]),
          type: "disappeared",
        }],
      ];

      for (const [root, path, kind, stat, expected] of table) {
        expect(FsEventConverter.toFileSystemEvent({ root, path, kind, stat }))
          .toEqual(expected);
      }
    });
  });
});

describe("readPermissionErrorMsg", () => {
  it("should return string", () => {
    expect(readPermissionErrorMsg("/path")).toBe(
      `Require read access to "/path", run again with the --allow-read flag`,
    );
  });
});

describe("writePermissionErrorMsg", () => {
  it("should return string", () => {
    expect(writePermissionErrorMsg("/path")).toBe(
      `Require write access to "/path", run again with the --allow-write flag`,
    );
  });
});
