import type { FileSystemEntry, FileSystemLocator } from "./type.ts";

export interface Definition {
  locateEntry(locator: FileSystemLocator): FileSystemEntry | null;
}
