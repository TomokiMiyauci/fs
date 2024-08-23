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
    case "rename":
      return "moved";
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
    const fullPath = join(this.root, ...path);

    try {
      const stat = Deno.statSync(fullPath);

      if (stat.isFile) return new FileEntry(this.root, [...path]);
      if (stat.isDirectory) return new DirectoryEntry(this.root, [...path]);

      return null;
    } catch {
      return null;
    }
  }

  watch(): void {
    for (const eventType of allEvents) {
      this.#watcher.addEventListener(eventType, this.#listener);
    }

    this.#watcher.watch();
  }

  unwatch(): void {
    for (const eventType of allEvents) {
      this.#watcher.removeEventListener(eventType, this.#listener);
    }

    this.#watcher.unwatch();
  }

  [Symbol.dispose](): void {
    this.unwatch();
  }
}

const allEvents = [
  "access",
  "any",
  "create",
  "modify",
  "other",
  "remove",
] satisfies Deno.FsEvent["kind"][];

class BaseEntry {
  constructor(protected root: string, protected path: string[]) {
    this.name = path[path.length - 1];
  }

  protected get fullPath(): string {
    return join(this.root, ...this.path);
  }

  readonly name: string;

  queryAccess(mode: AccessMode): FileSystemAccessResult {
    switch (mode) {
      case "read": {
        const result = Deno.permissions.requestSync({
          name: "read",
          path: this.fullPath,
        });

        return {
          permissionState: result.state,
          errorName: "",
        };
      }
      case "readwrite": {
        const readResult = Deno.permissions.requestSync({
          name: "read",
          path: this.fullPath,
        });

        if (readResult.state !== "granted") {
          return {
            permissionState: readResult.state,
            errorName: "NOT",
          };
        }

        const writeResult = Deno.permissions.requestSync({
          name: "write",
          path: this.fullPath,
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
          path: this.fullPath,
        });

        return {
          permissionState: result.state,
          errorName: "",
        };
      }
      case "readwrite": {
        const readResult = Deno.permissions.requestSync({
          name: "read",
          path: this.fullPath,
        });

        if (readResult.state !== "granted") {
          return {
            permissionState: readResult.state,
            errorName: "NOT",
          };
        }

        const writeResult = Deno.permissions.requestSync({
          name: "write",
          path: this.fullPath,
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
  constructor(root: string, path: string[]) {
    super(root, path);
  }

  get children() {
    return new Effector(this.root, this.path);
  }
}

class FileEntry extends BaseEntry implements _FileEntry {
  constructor(root: string, path: string[]) {
    super(root, path);
  }

  get modificationTimestamp(): number {
    const { mtime } = Deno.statSync(this.fullPath);

    return mtime?.getTime() ?? Date.now();
  }

  get binaryData(): Uint8Array {
    return Deno.readFileSync(this.fullPath);
  }

  set binaryData(value: Uint8Array) {
    Deno.writeFileSync(this.fullPath, value, { create: false });
  }

  sharedLockCount: number = 0;
  lock: "open" = "open";
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
