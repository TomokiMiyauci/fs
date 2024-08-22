import { Watcher } from "./watcher.ts";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { join } from "@std/path/join";

describe("Watcher", () => {
  it("should do nothing if construct", () => {
    new Watcher([]);
  });

  it("should do nothing if unwatch call before watch", () => {
    using watcher = new Watcher([]);

    watcher.unwatch();
  });

  describe("event dispatching", () => {
    interface Context {
      root: string;
    }

    beforeEach<Context>(async function () {
      const dir = await Deno.makeTempDir();

      this.root = await Deno.realPath(dir);

      // Avoid catching temp dir creation event.
      // @see https://github.com/denoland/deno/issues/15332
      await wait(10);
    });

    afterEach<Context>(async function () {
      await Deno.remove(this.root, { recursive: true });
    });

    it<Context>("should dispatch create event", async function () {
      using watcher = new Watcher(this.root);

      watcher.watch();
      const { promise, resolve } = Promise.withResolvers<Deno.FsEvent>();
      watcher.addEventListener("create", (ev) => {
        resolve(ev.detail);
      });

      const filePath = join(this.root, "file.txt");

      using _ = await Deno.create(filePath);

      const ev = await promise;

      expect(ev).toEqual({ flag: null, kind: "create", paths: [filePath] });
    });

    it<Context>("should not dispatch anything before watch", async function () {
      using watcher = new Watcher(this.root);

      const { reject } = Promise.withResolvers<
        Deno.FsEvent
      >();
      watcher.addEventListener("create", () => {
        reject();
      });

      const filePath = join(this.root, "file.txt");
      using _ = await Deno.create(filePath);

      await wait(10);
    });

    it<Context>("should not dispatch event after unwatch", async function () {
      using watcher = new Watcher(this.root);

      watcher.watch();
      watcher.unwatch();

      const { reject } = Promise.withResolvers<
        Deno.FsEvent
      >();
      watcher.addEventListener("create", () => {
        reject();
      });

      const filePath = join(this.root, "file.txt");
      using _ = await Deno.create(filePath);

      await wait(10);
    });
  });
});

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}
