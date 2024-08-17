import { List } from "@miyauci/infra";
import { join } from "@std/path/join";
import { resolve } from "@std/path/resolve";
import type {
  AccessMode,
  DirectoryEntry as _DirectoryEntry,
  FileEntry as _FileEntry,
  FileSystemAccessResult,
  FileSystemEntry,
  FileSystemLocator,
  PartialSet,
  StorageManagerContext,
} from "../type.ts";
import { isDirectoryEntry } from "../algorithm.ts";

export class FileSystem implements StorageManagerContext {
  constructor(root: string = "") {
    const fullPath = resolve(root);

    this.root = fullPath;
  }

  root: string;

  locateEntry(locator: FileSystemLocator): FileSystemEntry | null {
    return locate(locator);
  }
}

class BaseEntry {
  constructor(public name: string, protected path: string) {}

  queryAccess(mode: AccessMode): FileSystemAccessResult {
    switch (mode) {
      case "read": {
        const result = Deno.permissions.requestSync({
          name: "read",
          path: this.path,
        });

        return {
          permissionState: result.state,
          errorName: "",
        };
      }
      case "readwrite": {
        const readResult = Deno.permissions.requestSync({
          name: "read",
          path: this.path,
        });

        if (readResult.state !== "granted") {
          return {
            permissionState: readResult.state,
            errorName: "NOT",
          };
        }

        const writeResult = Deno.permissions.requestSync({
          name: "write",
          path: this.path,
        });

        if (writeResult.state !== "granted") {
          return {
            permissionState: readResult.state,
            errorName: "NOT",
          };
        }

        return {
          permissionState: "granted",
          errorName: "",
        };
      }
    }
  }

  requestAccess(mode: AccessMode): FileSystemAccessResult {
    switch (mode) {
      case "read": {
        const result = Deno.permissions.requestSync({
          name: "read",
          path: this.path,
        });

        return {
          permissionState: result.state,
          errorName: "",
        };
      }
      case "readwrite": {
        const readResult = Deno.permissions.requestSync({
          name: "read",
          path: this.path,
        });

        if (readResult.state !== "granted") {
          return {
            permissionState: readResult.state,
            errorName: "NOT",
          };
        }

        const writeResult = Deno.permissions.requestSync({
          name: "write",
          path: this.path,
        });

        if (writeResult.state !== "granted") {
          return {
            permissionState: readResult.state,
            errorName: "NOT",
          };
        }

        return {
          permissionState: "granted",
          errorName: "",
        };
      }
    }
  }
}

class DirectoryEntry extends BaseEntry implements _DirectoryEntry {
  constructor(
    public name: string,
    private locator: FileSystemLocator,
    path: string,
  ) {
    super(name, path);
  }

  get children() {
    return new Effector(this.locator);
  }
}

function locate(locator: FileSystemLocator): FileSystemEntry | null {
  const path = join(locator.root, ...locator.path);
  const name = locator.path[locator.path.size - 1];

  if (locator.kind === "file") {
    try {
      const file = Deno.openSync(path, { read: true });

      return new FileEntry(name, file, path);
    } catch {
      return null;
    }
  }

  try {
    Deno.openSync(path);

    return new DirectoryEntry(name, locator, path);
  } catch {
    return null;
  }
}

class FileEntry extends BaseEntry implements _FileEntry {
  constructor(
    public name: string,
    private fs: Deno.FsFile,
    path: string,
  ) {
    super(name, path);
  }
  get modificationTimestamp(): number {
    const { mtime } = this.fs.statSync();

    return mtime?.getTime() ?? Date.now();
  }
  set modificationTimestamp(value: number) {
    this.fs.utimeSync(value, value);
  }

  get binaryData(): Uint8Array {
    const { size } = this.fs.statSync();

    const u8 = new Uint8Array(size);
    this.fs.readSync(u8);

    return u8;
  }

  set binaryData(value: Uint8Array) {
    Deno.writeFileSync(this.path, value, { create: false });
  }

  sharedLockCount: number = 0;
  lock: "open" = "open";
}

class Effector implements PartialSet<FileSystemEntry> {
  constructor(private locator: FileSystemLocator) {}

  append(item: FileSystemEntry): void {
    const fullPath = join(...this.path, item.name);

    if (isDirectoryEntry(item)) {
      Deno.mkdirSync(fullPath);
    } else {
      using file = Deno.openSync(fullPath, { create: true, write: true });
      file.writeSync(item.binaryData);
      file.utimeSync(item.modificationTimestamp, item.modificationTimestamp);
    }
  }

  remove(item: FileSystemEntry): void {
    const fullPath = join(...this.path, item.name);

    Deno.removeSync(fullPath, { recursive: true });
  }

  get isEmpty(): boolean {
    const iter = Deno.readDirSync(join(...this.path));

    return isEmpty(iter);
  }

  get path(): string[] {
    return [this.locator.root, ...this.locator.path];
  }

  *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
    const iter = Deno.readDirSync(join(...this.path));

    for (const entry of iter) {
      const name = entry.name;
      const path = new List([...this.path, name]);

      if (entry.isDirectory) {
        yield new DirectoryEntry(name, {
          kind: "directory",
          root: this.locator.root,
          path,
        }, join(...path));
      } else if (entry.isFile) {
        const file = Deno.openSync(join(...path), { read: true });

        yield new FileEntry(name, file, join(...path));
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
