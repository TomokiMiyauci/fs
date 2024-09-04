import { join } from "@std/path/join";
import type {
  DirectoryEntry as IDirectoryEntry,
  FileSystemEntry,
  PartialSet,
} from "@miyauci/fs";
import { isDirectoryEntry } from "../algorithm.ts";
import { FileEntry } from "./file_entry.ts";
import { BaseEntry } from "./util.ts";

export class DirectoryEntry extends BaseEntry implements IDirectoryEntry {
  constructor(root: string, path: string[]) {
    super(root, path);
  }

  get parent(): DirectoryEntry | null {
    const head = this.path.slice(0, -1);

    return head.length ? new DirectoryEntry(this.root, head) : null;
  }

  get children(): PartialSet<FileSystemEntry> {
    return new Effector(this.root, this.path);
  }
}

class Effector implements PartialSet<FileSystemEntry> {
  constructor(private root: string, private path: string[]) {}

  append(item: FileSystemEntry): void {
    const fullPath = join(this.root, ...this.path, item.name);

    if (isDirectoryEntry(item)) {
      Deno.mkdirSync(fullPath);
    } else {
      using file = Deno.createSync(fullPath);
      file.writeSync(item.binaryData);
      file.utimeSync(item.modificationTimestamp, item.modificationTimestamp);
    }
  }

  remove(item: FileSystemEntry): void {
    const fullPath = join(this.root, ...this.path, item.name);

    Deno.removeSync(fullPath, { recursive: true });
  }

  get isEmpty(): boolean {
    return isEmpty(this[Symbol.iterator]());
  }

  *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
    const fullPath = join(this.root, ...this.path);

    const iter = Deno.readDirSync(fullPath);

    for (const entry of iter) {
      const name = entry.name;
      const path = this.path.concat(name);

      if (entry.isDirectory) {
        yield new DirectoryEntry(this.root, path);
      } else if (entry.isFile) {
        yield new FileEntry(this.root, path);
      } else {
        throw new Error("symlink is not supported");
      }
    }
  }
}

function isEmpty(iter: Iterable<unknown>): boolean {
  for (const _ of iter) {
    return false;
  }

  return true;
}
