import { List, Set } from "@miyauci/infra";
import {
  createNewFileSystemDirectoryHandle,
  type FileSystemDirectoryHandle,
} from "../file_system_directory_handle.ts";
import {
  type FileSystem,
  type FileSystemObservation,
  type FileSystemPath,
  notifyObservations,
} from "../file_system.ts";
import type { FileSystemEntry } from "../file_system_entry.ts";
import { VirtualFileSystem as _VirtualFileSystem } from "./virtual.ts";
import { DirectoryEntry, FileEntry } from "./entry.ts";

export class InMemoryFileSystem implements FileSystem {
  private vfs: _VirtualFileSystem;

  constructor() {
    const vfs = new _VirtualFileSystem();
    vfs.createDirectory([""]);

    this.vfs = vfs;
  }

  locateEntry(path: FileSystemPath): FileSystemEntry | null {
    const source = this.vfs.getSource([...path]);

    if (!source) return null;

    if (source instanceof Map) return new DirectoryEntry(this, path, this.vfs);

    return new FileEntry(this, path, this.vfs);
  }

  getPath(entry: FileSystemEntry): FileSystemPath {
    const path = new List([entry.name]);
    let parent = entry.parent;

    while (parent) {
      path.prepend(parent.name);

      parent = parent.parent;
    }

    return path;
  }

  root: string = "";
  observations: Set<FileSystemObservation> = new Set();

  getDirectory(): Promise<FileSystemDirectoryHandle> {
    return Promise.resolve(
      createNewFileSystemDirectoryHandle(this, new List([""])),
    );
  }

  watch(): void {
    this.vfs.addEventListener("disappeared", ({ detail }) => {
      notifyObservations(
        this,
        new List([{
          type: "disappeared",
          entryType: detail.type,
          fromPath: null,
          modifiedPath: new List(detail.path),
        }]),
      );
    });
    this.vfs.addEventListener("appeared", ({ detail }) => {
      notifyObservations(
        this,
        new List([{
          type: "appeared",
          entryType: detail.type,
          fromPath: null,
          modifiedPath: new List(detail.path),
        }]),
      );
    });
    this.vfs.addEventListener("modified", ({ detail }) => {
      notifyObservations(
        this,
        new List([{
          type: "modified",
          entryType: detail.type,
          fromPath: null,
          modifiedPath: new List(detail.path),
        }]),
      );
    });
  }
}
