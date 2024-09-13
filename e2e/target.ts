import { afterEach, beforeEach, describe } from "@std/testing/bdd";
import type { FileSystemDirectoryHandle } from "../src/file_system_directory_handle.ts";
import { InMemoryFileSystem } from "@miyauci/fs/in-memory";
import * as DenoRuntime from "@miyauci/fs/deno";
import * as NodeRuntime from "@miyauci/fs/node";

export interface Target {
  name: string;

  beforeEach(): Promise<ProvideResult>;
}

export type ProvideResult = FileSystemDirectoryHandle | ContextResult;

export interface ContextResult {
  root: FileSystemDirectoryHandle;
  afterEach(): void;
}

export const targets: Target[] = [
  {
    name: "InMemoryFileSystem",
    async beforeEach() {
      const fs = new InMemoryFileSystem();

      fs.watch();

      return await fs.getDirectory();
    },
  },
  {
    name: "DenoFileSystem",
    async beforeEach() {
      const rootPath = await Deno.makeTempDir();
      const fs = new DenoRuntime.LocalFileSystem(rootPath);
      const root = await fs.getDirectory();

      return {
        root,
        afterEach() {
          return Deno.remove(rootPath, { recursive: true });
        },
      };
    },
  },
  {
    name: "Node",
    async beforeEach() {
      const rootPath = await Deno.makeTempDir();
      const fs = new NodeRuntime.LocalFileSystem(rootPath);
      const root = await fs.getDirectory();

      return {
        root,
        afterEach() {
          return Deno.remove(rootPath, { recursive: true });
        },
      };
    },
  },
] satisfies Target[];

export interface Context {
  root: FileSystemDirectoryHandle;
  afterEach?(): void;
}

// deno-lint-ignore ban-types
export function runTests(fn: Function): void {
  for (const target of targets) {
    describe(target.name, () => {
      beforeEach<Context>(async function () {
        const result = await target.beforeEach();

        if ("root" in result) {
          this.root = result.root;
        } else {
          this.root = result;
        }
      });

      afterEach<Context>(function () {
        return this.afterEach?.();
      });

      fn();
    });
  }
}
