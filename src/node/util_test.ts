import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { createEvent } from "./util.ts";
import { List } from "@miyauci/infra";

describe("createEvent", () => {
  it("should return appeared event if eventName is 'add'", () => {
    expect(createEvent("add", "/path/file.txt", "/path")).toEqual({
      type: "appeared",
      entryType: "file",
      modifiedPath: new List(["", "file.txt"]),
      fromPath: null,
    });
  });

  it("should return appeared event if eventName is 'addDir'", () => {
    expect(createEvent("addDir", "/path/file.txt", "/path")).toEqual({
      type: "appeared",
      entryType: "directory",
      modifiedPath: new List(["", "file.txt"]),
      fromPath: null,
    });
  });

  it("should return modified event if eventName is 'change'", () => {
    expect(createEvent("change", "/path/file.txt", "/path")).toEqual({
      type: "modified",
      entryType: "file",
      modifiedPath: new List(["", "file.txt"]),
      fromPath: null,
    });
  });

  it("should return disappeared event if eventName is 'unlink'", () => {
    expect(createEvent("unlink", "/path/file.txt", "/path")).toEqual({
      type: "disappeared",
      entryType: "file",
      modifiedPath: new List(["", "file.txt"]),
      fromPath: null,
    });
  });

  it("should return disappeared event if eventName is 'unlinkDir'", () => {
    expect(createEvent("unlinkDir", "/path/file.txt", "/path")).toEqual({
      type: "disappeared",
      entryType: "directory",
      modifiedPath: new List(["", "file.txt"]),
      fromPath: null,
    });
  });
});
