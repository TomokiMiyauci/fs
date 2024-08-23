import { BaseEntry } from "./util.ts";
import type { FileEntry as _FileEntry } from "../file_system_entry.ts";

export class FileEntry extends BaseEntry implements _FileEntry {
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
