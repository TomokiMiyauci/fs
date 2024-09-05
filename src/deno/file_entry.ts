import type { FileEntry as IFileEntry, FileSystem } from "@miyauci/fs";
import { BaseEntry } from "./util.ts";
import { DirectoryEntry } from "./directory_entry.ts";

export class FileEntry extends BaseEntry implements IFileEntry {
  constructor(fileSystem: FileSystem, path: string[]) {
    super(fileSystem, path);
  }

  get parent(): DirectoryEntry | null {
    const head = this.path.slice(0, -1);

    return head.length ? new DirectoryEntry(this.fileSystem, head) : null;
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
