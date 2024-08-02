import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { FileSystemHandle } from "./file_system_handle.ts";

describe("FileSystemHandle", () => {
  describe("isSameEntry", () => {
    it("isSameEntry for identical directory handles returns true", async () => {
      const root = new FileSystemHandle({
        kind: "directory",
        path: [""],
        root: "",
      });

      await expect(root.isSameEntry(root)).resolves.toBeTruthy();
    });
  });

  describe("kind", () => {
    it("should return directory or file", () => {
      const root = new FileSystemHandle(
        { kind: "directory", path: [""], root: "" },
      );

      expect(root.kind).toBe("directory");
    });
  });

  describe("name", () => {
    it("should return end of path segment", () => {
      const root = new FileSystemHandle(
        { kind: "directory", path: [""], root: "" },
      );

      expect(root.name).toBe("");
    });
  });
});
