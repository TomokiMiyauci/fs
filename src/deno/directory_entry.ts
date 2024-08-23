import { join } from "@std/path/join";
import type {
  DirectoryEntry as _DirectoryEntry,
  FileSystemEntry,
  PartialSet,
} from "../file_system_entry.ts";
import { isDirectoryEntry } from "../algorithm.ts";
import { FileEntry } from "./file_entry.ts";
import { BaseEntry } from "./util.ts";

export class DirectoryEntry extends BaseEntry implements _DirectoryEntry {
  constructor(root: string, path: string[]) {
    super(root, path);
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
