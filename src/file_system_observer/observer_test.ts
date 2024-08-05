/**
 * @see https://github.com/web-platform-tests/wpt/blob/master/fs/script-tests/FileSystemObserver.js
 * @see https://github.com/web-platform-tests/wpt/blob/master/fs/script-tests/FileSystemObserver-writable-file-stream.js
 */

import { expect } from "@std/expect";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { type Context, createEmptyFile, getDirectory } from "@test";
import { FileSystemObserver } from "./observer.ts";
import { type FileSystemChangeRecord } from "@miyauci/file-system";

describe("FileSystemObserver", () => {
  beforeEach<Context>(function () {
    this.root = getDirectory();
  });

  it<Context>(
    "Calling unobserve() without a corresponding observe() shouldn't throw",
    async function () {
      const observer = new FileSystemObserver(() => {});

      await expect(observer.observe(this.root)).resolves.toBeFalsy();
    },
  );

  it<Context>(
    "unobserve() is idempotent",
    async function () {
      const observer = new FileSystemObserver(() => {});

      await expect(observer.observe(this.root)).resolves.toBeFalsy();
      await expect(observer.observe(this.root)).resolves.toBeFalsy();
    },
  );

  it(
    "Calling disconnect() without observing shouldn't throw",
    function () {
      const observer = new FileSystemObserver(() => {});

      expect(observer.disconnect()).toBeFalsy();
    },
  );

  it(
    "disconnect() is idempotent",
    function () {
      const observer = new FileSystemObserver(() => {});

      expect(observer.disconnect()).toBeFalsy();
      expect(observer.disconnect()).toBeFalsy();
    },
  );

  it<Context>(
    `Creating a file through FileSystemDirectoryHandle.getFileHandle is reported as an "appeared" event if in scope`,
    async function () {
      for (const recursive of [true, false]) {
        const dir = await this.root.getDirectoryHandle("dir", { create: true });

        const observer = new CollectiveFileSystemObserver();

        await observer.observe(dir, { recursive });

        const fileHandle = await createEmptyFile(dir, "file.txt");

        expect(observer.takeRecords()).toEqual([{
          type: "appeared",
          root: this.root,
          changedHandle: fileHandle,
          relativePathComponents: ["dir", "file.txt"],
        }]);

        observer.disconnect();

        await this.root.removeEntry("dir", { recursive: true });
      }
    },
  );

  it<Context>(
    `Removing a file through FileSystemFileHandle.remove is reported as an "disappeared" event if in scope`,
    async function () {
      for (const recursive of [true, false]) {
        const dir = await this.root.getDirectoryHandle("dir", { create: true });

        const observer = new CollectiveFileSystemObserver();
        const fileHandle = await createEmptyFile(dir, "file.txt");

        await observer.observe(dir, { recursive });

        await dir.removeEntry("file.txt");

        expect(observer.takeRecords()).toEqual([{
          type: "disappeared",
          root: this.root,
          changedHandle: fileHandle,
          relativePathComponents: ["dir", "file.txt"],
        }]);

        observer.disconnect();

        await this.root.removeEntry("dir", { recursive: true });
      }
    },
  );

  it<Context>(
    `Events outside the watch scope are not sent to the observer\'s callback`,
    async function () {
      for (const recursive of [true, false]) {
        const outDir = await this.root.getDirectoryHandle("outside", {
          create: true,
        });
        const dir = await this.root.getDirectoryHandle("dir", { create: true });

        const observer = new CollectiveFileSystemObserver();

        await observer.observe(dir, { recursive });

        await createEmptyFile(outDir, "file.txt");
        await outDir.removeEntry("file.txt");

        expect(observer.takeRecords()).toEqual([]);

        observer.disconnect();

        await this.root.removeEntry("dir", { recursive: true });
        await this.root.removeEntry("outside", { recursive: true });
      }
    },
  );

  // TODO: with move method
  // directory_test(
  //   async (t, root_dir) => {
  //     const dir = await root_dir.getDirectoryHandle(getUniqueName(), {
  //       create: true,
  //     });

  //     const scope_test = new ScopeTest(t, dir);
  //     const watched_handle = await scope_test.watched_handle();

  //     for (const recursive of [false, true]) {
  //       for await (const src of scope_test.in_scope_paths(recursive)) {
  //         for await (const dest of scope_test.in_scope_paths(recursive)) {
  //           const file = await src.createHandle();

  //           const observer = new CollectingFileSystemObserver(t, root_dir);
  //           await observer.observe([watched_handle], { recursive });

  //           // Move `file`.
  //           await file.move(dest.parentHandle(), dest.fileName());

  //           // Expect one "moved" event to happen on `file`.
  //           const records = await observer.getRecords();
  //           await assert_records_equal(
  //             watched_handle,
  //             records,
  //             [movedEvent(
  //               file,
  //               dest.relativePathComponents(),
  //               src.relativePathComponents(),
  //             )],
  //           );

  //           observer.disconnect();
  //         }
  //       }
  //     }
  //   },
  //   'Moving a file through FileSystemFileHandle.move is reported as a "moved" event if destination and source are in scope',
  // );

  // directory_test(
  //   async (t, root_dir) => {
  //     const dir = await root_dir.getDirectoryHandle(getUniqueName(), {
  //       create: true,
  //     });

  //     const scope_test = new ScopeTest(t, dir);
  //     const watched_handle = await scope_test.watched_handle();

  //     for (const recursive of [false, true]) {
  //       for await (const src of scope_test.out_of_scope_paths(recursive)) {
  //         for await (const dest of scope_test.out_of_scope_paths(recursive)) {
  //           const file = await src.createHandle();

  //           const observer = new CollectingFileSystemObserver(t, root_dir);
  //           await observer.observe([watched_handle], { recursive });

  //           // Move `file`.
  //           await file.move(dest.parentHandle(), dest.fileName());

  //           // Expect the observer to not receive any events.
  //           const records = await observer.getRecords();
  //           await assert_records_equal(watched_handle, records, []);
  //         }
  //       }
  //     }
  //   },
  //   "Moving a file through FileSystemFileHandle.move is not reported if destination and source are not in scope",
  // );

  // directory_test(
  //   async (t, root_dir) => {
  //     const dir = await root_dir.getDirectoryHandle(getUniqueName(), {
  //       create: true,
  //     });

  //     const scope_test = new ScopeTest(t, dir);
  //     const watched_handle = await scope_test.watched_handle();

  //     for (const recursive of [false, true]) {
  //       for await (const src of scope_test.out_of_scope_paths(recursive)) {
  //         for await (const dest of scope_test.in_scope_paths(recursive)) {
  //           const file = await src.createHandle();

  //           const observer = new CollectingFileSystemObserver(t, root_dir);
  //           await observer.observe([watched_handle], { recursive });

  //           // Move `file`.
  //           await file.move(dest.parentHandle(), dest.fileName());

  //           // Expect one "appeared" event to happen on `file`.
  //           const records = await observer.getRecords();
  //           await assert_records_equal(
  //             watched_handle,
  //             records,
  //             [appearedEvent(file, dest.relativePathComponents())],
  //           );
  //         }
  //       }
  //     }
  //   },
  //   'Moving a file through FileSystemFileHandle.move is reported as a "appeared" event if only destination is in scope',
  // );

  // directory_test(
  //   async (t, root_dir) => {
  //     const dir = await root_dir.getDirectoryHandle(getUniqueName(), {
  //       create: true,
  //     });

  //     const scope_test = new ScopeTest(t, dir);
  //     const watched_handle = await scope_test.watched_handle();

  //     for (const recursive of [false, true]) {
  //       for await (const src of scope_test.in_scope_paths(recursive)) {
  //         for await (const dest of scope_test.out_of_scope_paths(recursive)) {
  //           // These both point to the same underlying file entry initially until
  //           // move is called on `fileToMove`. `file` is kept so that we have a
  //           // handle that still points at the source file entry.
  //           const file = await src.createHandle();
  //           const fileToMove = await src.createHandle();

  //           const observer = new CollectingFileSystemObserver(t, root_dir);
  //           await observer.observe([watched_handle], { recursive });

  //           // Move `fileToMove`.
  //           await fileToMove.move(dest.parentHandle(), dest.fileName());

  //           // Expect one "disappeared" event to happen on `file`.
  //           const records = await observer.getRecords();
  //           await assert_records_equal(
  //             watched_handle,
  //             records,
  //             [disappearedEvent(file, src.relativePathComponents())],
  //           );
  //         }
  //       }
  //     }
  //   },
  //   'Moving a file through FileSystemFileHandle.move is reported as a "disappeared" event if only source is in scope',
  // );

  describe("modification", () => {
    it<Context>(
      `Closing a FileSystemWritableFileStream that\'s modified the file produces a "modified" event`,
      async function () {
        const handle = await createEmptyFile(this.root, "file.txt");

        const observer = new CollectiveFileSystemObserver();

        await observer.observe(handle);

        const writable = await handle.createWritable();
        await writable.write("contents");
        await writable.close();

        expect(observer.takeRecords()).toEqual([{
          type: "modified",
          changedHandle: handle,
          root: this.root,
          relativePathComponents: ["file.txt"],
        }]);
      },
    );

    it<Context>(
      `All FileSystemWritableFileStream methods that aren\'t closed don\'t produce events`,
      async function () {
        const handle = await createEmptyFile(this.root, "file.txt");

        const observer = new CollectiveFileSystemObserver();

        await observer.observe(handle);

        const writable = await handle.createWritable();
        await writable.write("contents");
        await writable.truncate(1);
        await writable.seek(1);

        expect(observer.takeRecords()).toEqual([]);

        await writable.abort();

        expect(observer.takeRecords()).toEqual([]);
      },
    );
  });
});

class CollectiveFileSystemObserver extends FileSystemObserver {
  #result: FileSystemChangeRecord[] = [];
  constructor() {
    super((records) => {
      this.#result.push(...records);
    });
  }

  takeRecords(): FileSystemChangeRecord[] {
    const result = [...this.#result];

    this.#result.length = 0;

    return result;
  }
}
