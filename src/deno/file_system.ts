import { List, Set } from "@miyauci/infra";
import { join } from "@std/path/join";
import { resolve } from "@std/path/resolve";
import { existsSync } from "@std/fs/exists";
import {
  type FileSystem as _FileSystem,
  type FileSystemEvent,
  type FileSystemObservation,
  type FileSystemPath,
  notifyObservations,
} from "../file_system.ts";
import type {
  DirectoryEntry as _DirectoryEntry,
  FileEntry as _FileEntry,
  FileSystemEntry,
} from "../file_system_entry.ts";
import type { FileSystemChangeType } from "../file_system_change_record.ts";
import { Watcher } from "./watcher.ts";
import { safeStatSync } from "./io.ts";
import { FileEntry } from "./file_entry.ts";
import { DirectoryEntry } from "./directory_entry.ts";
import type { BucketFileSystem } from "../storage_manager.ts";

export class FileSystem implements BucketFileSystem {
  #listener: FsCallback;
  #watcher: Watcher;

  constructor(root: string = "") {
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

  observations: Set<FileSystemObservation> = new Set();

  exists(): boolean {
    return existsSync(this.root, { isDirectory: true });
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
