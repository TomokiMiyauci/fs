import type { FileEntry, FileSystemEntry, FileSystemLocator } from "./type.ts";

export interface Definition {
  locateEntry(locator: FileSystemLocator): FileSystemEntry | null;

  /** Specify the content type from the entry.
   *
   * Used for File API.
   */
  typeByEntry(entry: FileEntry): string | undefined;
}
