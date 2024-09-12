import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import { createEmptyFile, createFileWithContents } from "@test/util.ts";
import { type Context, runTests } from "./target.ts";

runTests(() => {
  describe("FileSystemHandle", () => {
    describe("isSameEntry", () => {
      it<Context>(
        "isSameEntry for identical directory handles returns true",
        async function () {
          await expect(this.root.isSameEntry(this.root)).resolves.toBeTruthy();
        },
      );
    });

    describe("kind", () => {
      it<Context>("should return directory or file", function () {
        expect(this.root.kind).toBe("directory");
      });
    });

    // describe("name", () => {
    //   it<Context>("should return end of path segment", function () {
    //     expect(this.root.name).toBe("");
    //   });
    // });

    describe("getFile", () => {
      it<Context>(
        "getFile() provides a file that can be sliced",
        async function () {
          const contents = "awesome content";

          const handle = await createFileWithContents(
            this.root,
            "foo.txt",
            contents,
          );
          const file = await handle.getFile();
          const slice = file.slice(1, file.size);
          const actualContents = await slice.text();

          expect(actualContents).toBe(contents.slice(1, contents.length));
        },
      );

      // TODO
      // it<Context>(
      //   "getFile() returns last modified time",
      //   async function () {
      //     const handle = await createEmptyFile(this.root, "mtime.txt");
      //     let file = await handle.getFile();
      //     const first_mtime = file.lastModified;

      //     await sleep(1);

      //     const writer = await handle.createWritable({ keepExistingData: false });
      //     await writer.write(new Blob(["foo"]));
      //     await writer.close();

      //     file = await handle.getFile();
      //     const second_mtime = file.lastModified;

      //     const fileReplica = await handle.getFile();
      //     expect(second_mtime).toBe(fileReplica.lastModified);

      //     expect(first_mtime).toBeLessThan(second_mtime);
      //   },
      // );

      it<Context>(
        "getFile() returns expected name",
        async function () {
          const fileName = "fileAttributesTest.txt";
          const fileHandle = await createEmptyFile(this.root, fileName);
          let file = await fileHandle.getFile();

          expect(file.name, fileName);

          file = await fileHandle.getFile();

          expect(file.name, fileName);
        },
      );
    });
  });
});
