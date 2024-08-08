import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { VirtualFileSystem } from "./virtual.ts";

interface Context {
  fs: VirtualFileSystem;
}

describe("VirtualFileSystem", () => {
  beforeEach<Context>(function () {
    this.fs = new VirtualFileSystem();
  });

  describe("remove", () => {
    it<Context>(
      "it should do nothing if the resource does not exist",
      function () {
        expect(this.fs.remove([""])).toBeFalsy();
      },
    );

    it<Context>(
      "it should throw if the parent does not exist",
      function () {
        expect(() => this.fs.remove(["", ""])).toThrow();
      },
    );

    it<Context>(
      "it should throw if the parent is not directory",
      function () {
        this.fs.createFile([""]);
        expect(() => this.fs.remove(["", ""])).toThrow();
      },
    );

    it<Context>(
      "it should remove file",
      function () {
        this.fs.createFile([""]);
        expect(this.fs.readFile([""])).toBeTruthy();

        this.fs.remove([""]);
        expect(() => this.fs.readFile([""])).toThrow();
      },
    );

    it<Context>(
      "it should remove directory",
      function () {
        this.fs.createDirectory([""]);
        expect(this.fs.readDirectory([""])).toBeTruthy();

        this.fs.remove([""]);
        expect(() => this.fs.readDirectory([""])).toThrow();
      },
    );
  });

  describe("createFile", () => {
    it<Context>("should create file", function () {
      this.fs.createFile([""]);

      expect(this.fs.readFile([""])).toBeTruthy();
    });

    it<Context>("should do nothing if the path exists", function () {
      this.fs.createFile([""]);
      this.fs.createFile([""]);

      expect(this.fs.readFile([""])).toBeTruthy();
    });

    it<Context>("should throw error if the resource is directory", function () {
      this.fs.createDirectory([""]);

      expect(() => this.fs.createFile([""])).toThrow();
    });
  });

  describe("createDirectory", () => {
    it<Context>("should create directory", function () {
      this.fs.createDirectory([""]);

      expect(this.fs.readDirectory([""])).toBeTruthy();
    });

    it<Context>("should do nothing if the path exists", function () {
      this.fs.createDirectory([""]);
      this.fs.createDirectory([""]);

      expect(this.fs.readDirectory([""])).toBeTruthy();
    });

    it<Context>("should throw error if the resource is file", function () {
      this.fs.createFile([""]);

      expect(() => this.fs.createDirectory([""])).toThrow();
    });
  });

  describe("readDirectory", () => {
    it<Context>(
      "should throw error if the resource does not exist",
      function () {
        expect(() => this.fs.readDirectory([""])).toThrow();
        expect(() => this.fs.readDirectory(["", ""])).toThrow();
      },
    );

    it<Context>(
      "should throw error if the resource is not directory",
      function () {
        this.fs.createFile([""]);
        expect(() => this.fs.readDirectory([""])).toThrow();
      },
    );

    it<Context>(
      "should return directory",
      function () {
        this.fs.createDirectory([""]);
        this.fs.createFile(["", "file.txt"]);
        this.fs.createDirectory(["", "dir"]);

        expect([...this.fs.readDirectory([""])]).toEqual([{
          get isDirectory() {
            return false;
          },
          get isFile() {
            return true;
          },
          name: "file.txt",
        }, {
          get isDirectory() {
            return true;
          },
          get isFile() {
            return false;
          },
          name: "dir",
        }]);
      },
    );
  });

  describe("readFile", () => {
    it<Context>(
      "should throw error if the resource does not exist",
      function () {
        expect(() => this.fs.readFile([""])).toThrow();
        expect(() => this.fs.readFile(["", ""])).toThrow();
      },
    );

    it<Context>(
      "should throw error if the resource is not file",
      function () {
        this.fs.createDirectory([""]);
        expect(() => this.fs.readFile([""])).toThrow();
      },
    );

    it<Context>(
      "should return contents",
      function () {
        this.fs.createFile([""]);
        expect(this.fs.readFile([""])).toBeTruthy();
      },
    );
  });
});
