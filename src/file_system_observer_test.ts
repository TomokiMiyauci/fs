import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { List, Set } from "@miyauci/infra";
import { FileSystemObserver } from "./file_system_observer.ts";
import type {
  FileSystem as IFileSystem,
  FileSystemObservation,
} from "./file_system.ts";
import { createNewFileSystemHandle } from "./algorithm.ts";
import type { FileSystemEntry } from "./file_system_entry.ts";

class FileSystem implements IFileSystem {
  root: string = "";
  observations: Set<FileSystemObservation> = new Set();
  getPath() {
    return new List([""]);
  }
  locateEntry(): FileSystemEntry | null {
    return {
      name: "",
      parent: null,
      children: new Set(),
      queryAccess() {
        return { permissionState: "granted", errorName: "" };
      },
      requestAccess() {
        return { permissionState: "granted", errorName: "" };
      },
      fileSystem: this,
    };
  }
}

describe("FileSystemObserver", () => {
  interface Context {
    observer: FileSystemObserver;
  }

  beforeEach<Context>(function () {
    this.observer = new FileSystemObserver(() => {});
  });

  describe("observe", () => {
    it<Context>(
      "should throw DOMException if located entry's permission is defined",
      async function () {
        const fileSystem = new FileSystem();

        fileSystem.locateEntry = () => {
          return {
            name: "",
            parent: null,
            fileSystem,
            get children(): Set<FileSystemEntry> {
              return new Set();
            },
            queryAccess() {
              return { permissionState: "denied", errorName: "" };
            },
            requestAccess() {
              return { permissionState: "denied", errorName: "" };
            },
          };
        };

        const dir = createNewFileSystemHandle(
          fileSystem,
          new List([""]),
          "directory",
        );

        await expect(this.observer.observe(dir)).rejects.toThrow(
          DOMException,
        );
      },
    );

    it<Context>(
      "should throw DOMException if located entry's permission is defined",
      async function () {
        const fileSystem = new FileSystem();

        fileSystem.locateEntry = () => {
          return null;
        };

        const dir = createNewFileSystemHandle(
          fileSystem,
          new List([""]),
          "directory",
        );

        await expect(this.observer.observe(dir)).rejects.toThrow(
          DOMException,
        );
      },
    );
  });

  describe("unobserve", () => {
    it<Context>(
      "should do nothing if observations is empty",
      async function () {
        const fileSystem = new FileSystem();
        const dir = createNewFileSystemHandle(
          fileSystem,
          new List([""]),
          "directory",
        );

        this.observer.unobserve(dir);

        await wait(0);

        expect(fileSystem.observations.size).toBe(0);
        expect(this.observer["observations"].size).toBe(0);
      },
    );

    it<Context>(
      "should remove observations if observe before unobserve",
      async function () {
        const fileSystem = new FileSystem();
        const dir = createNewFileSystemHandle(
          fileSystem,
          new List([""]),
          "directory",
        );

        await this.observer.observe(dir);

        expect(fileSystem.observations.size).toBe(1);
        expect(this.observer["observations"].size).toBe(1);

        this.observer.unobserve(dir);

        await wait(0);

        expect(fileSystem.observations.size).toBe(0);
        expect(this.observer["observations"].size).toBe(0);
      },
    );
  });
});

function wait(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
}
