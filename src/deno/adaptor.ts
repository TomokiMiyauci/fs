import { List } from "@miyauci/infra";
import { join } from "@std/path/join";
import { resolve } from "@std/path/resolve";
import {
  FileSystem as _FileSystem,
  type FileSystemEvent,
  type FileSystemPath,
  notifyObservations,
} from "../file_system.ts";
import type {
  AccessMode,
  DirectoryEntry as _DirectoryEntry,
  FileEntry as _FileEntry,
  FileSystemAccessResult,
  FileSystemEntry,
  PartialSet,
} from "../file_system_entry.ts";
import { isDirectoryEntry } from "../algorithm.ts";
import type { FileSystemChangeType } from "../file_system_change_record.ts";
import { Watcher } from "./watcher.ts";
import { safeStatSync } from "./io.ts";

function events(ev: Deno.FsEvent, root: string): FileSystemEvent[] {
  return ev.paths.map((path) => {
    const info = safeStatSync(path);

    const entryType = info ? typeEntry(info) : null;

    const relativePath = path.replace(root, "");
    const segments = relativePath.split("/");

    const modifiedPath = new List(segments);
    const type = kind(ev.kind);

    return { modifiedPath, type, fromPath: null, entryType };
  });
}

function typeEntry(info: Deno.FileInfo) {
  if (info.isDirectory) return "directory";
  if (info.isFile) return "file";

  return null;
}

function kind(kind: Deno.FsEvent["kind"]): FileSystemChangeType {
  switch (kind) {
    case "any":
    case "access":
    case "other":
      return "unknown";

    case "create":
      return "appeared";
    case "modify":
      return "modified";
    case "remove":
      return "disappeared";
  }
}

interface FsCallback {
  (event: CustomEvent<Deno.FsEvent>): void;
}

export class FileSystem extends _FileSystem {
  #listener: FsCallback;
  #watcher: Watcher;

  constructor(root: string = "") {
    super();

    const rootPath = resolve(root);

    this.root = rootPath;

    this.#listener = (ev: CustomEvent<Deno.FsEvent>): void => {
      const e = events(ev.detail, rootPath);

      notifyObservations(this, new List(e));
    };

    this.#watcher = new Watcher(rootPath, { recursive: true });
  }

  root: string;

  locateEntry(path: FileSystemPath): FileSystemEntry | null {
    return locate(this.root, [...path]);
  }

  watch(): void {
    this.#watcher.addEventListener("*", this.#listener);

    this.#watcher.watch();
  }

  unwatch(): void {
    this.#watcher.removeEventListener("*", this.#listener);

    this.#watcher.unwatch();
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
  constructor(name: string, private root: string, path: string[]) {
    const fullPath = join(root, ...path);

    super(name, fullPath);

    this.paths = path;
  }

  private paths: string[];

  get children() {
    return new Effector(this.root, this.paths);
  }
}

function locate(root: string, path: string[]): FileSystemEntry | null {
  const name = path[path.length - 1];
  const fullPath = join(root, ...path);

  try {
    const file = Deno.openSync(fullPath);
    const stat = file.statSync();

    if (stat.isFile) {
      return new FileEntry(name, file, fullPath);
    }

    if (stat.isDirectory) {
      return new DirectoryEntry(name, root, path);
    }

    return null;
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
  constructor(private root: string, private paths: string[]) {}

  append(item: FileSystemEntry): void {
    const fullPath = join(this.root, ...this.paths, item.name);

    if (isDirectoryEntry(item)) {
      Deno.mkdirSync(fullPath);
    } else {
      using file = Deno.openSync(fullPath, { create: true, write: true });
      file.writeSync(item.binaryData);
      file.utimeSync(item.modificationTimestamp, item.modificationTimestamp);
    }
  }

  remove(item: FileSystemEntry): void {
    const fullPath = join(this.root, ...this.paths, item.name);

    Deno.removeSync(fullPath, { recursive: true });
  }

  get isEmpty(): boolean {
    const fullPath = join(this.root, ...this.paths);

    const iter = Deno.readDirSync(fullPath);

    return isEmpty(iter);
  }

  *[Symbol.iterator](): IterableIterator<FileSystemEntry> {
    const fullPath = join(this.root, ...this.paths);

    const iter = Deno.readDirSync(fullPath);

    for (const entry of iter) {
      const name = entry.name;

      if (entry.isDirectory) {
        yield new DirectoryEntry(name, this.root, this.paths.concat(name));
      } else if (entry.isFile) {
        const path = this.paths.concat(name);
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
