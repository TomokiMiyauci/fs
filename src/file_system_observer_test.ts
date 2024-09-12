import { beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { List } from "@miyauci/infra";
import { DirectoryEntry, FileSystem } from "@test/helper.ts";
import { delay } from "@std/async/delay";
import { FileSystemObserver } from "./file_system_observer.ts";
import { createNewFileSystemHandle } from "./algorithm.ts";
import { Msg } from "./constant.ts";

interface Context {
  observer: FileSystemObserver;
}

describe("FileSystemObserver", () => {
  beforeEach<Context>(function () {
    this.observer = new FileSystemObserver(() => {});
  });

  describe("observe", () => {
    it<Context>(
      "should throw DOMException if located entry's permission is defined",
      async function () {
        const fileSystem = new FileSystem();
        const dirEntry = new DirectoryEntry(fileSystem);
        const errorName = "custom";
        dirEntry.queryAccess = () => {
          return { permissionState: "denied", errorName };
        };
        fileSystem.locateEntry = () => {
          return dirEntry;
        };

        const dir = createNewFileSystemHandle(
          fileSystem,
          new List([""]),
          "directory",
        );

        await expect(this.observer.observe(dir)).rejects.toThrow(
          new DOMException(Msg.PermissionDenied, errorName),
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

        await delay(0);

        expect(fileSystem.observations.size).toBe(0);
        expect(this.observer["observations"].size).toBe(0);
      },
    );

    it<Context>(
      "should remove observations if observe before unobserve",
      async function () {
        const fileSystem = new FileSystem();
        fileSystem.locateEntry = (path) => {
          if (path.size === 1 && path[0] === "") {
            return new DirectoryEntry(fileSystem);
          }

          return null;
        };
        const dir = createNewFileSystemHandle(
          fileSystem,
          new List([""]),
          "directory",
        );

        await this.observer.observe(dir);

        expect(fileSystem.observations.size).toBe(1);
        expect(this.observer["observations"].size).toBe(1);

        this.observer.unobserve(dir);

        await delay(0);

        expect(fileSystem.observations.size).toBe(0);
        expect(this.observer["observations"].size).toBe(0);
      },
    );
  });
});
