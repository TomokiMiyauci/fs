import type { FileSystemFileHandle } from "../src/file_system_file_handle.ts";
import type {
  FileSystemDirectoryHandle,
} from "../src/file_system_directory_handle.ts";
import type { FileSystemWriteChunkType } from "../src/file_system_writable_file_stream.ts";
import type {
  VirtualFileSystem as _VirtualFileSystem,
} from "../src/in_memory/virtual.ts";
import type { FileSystemHandle } from "../src/file_system_handle.ts";
import { assert, assertEquals } from "@std/assert";
import type { FileSystemChangeRecord } from "../src/file_system_change_record.ts";

export interface ProvideContext {
  root: FileSystemDirectoryHandle;
  onAfterEach?(): void;
}

export interface Provider {
  (): ProvideContext | Promise<ProvideContext>;
}

export interface Context {
  root: FileSystemDirectoryHandle;
  onAfterEach?: VoidFunction;
}

export async function createFileWithContents(
  handle: FileSystemDirectoryHandle,
  name: string,
  data: FileSystemWriteChunkType,
): Promise<FileSystemFileHandle> {
  const file = await handle.getFileHandle(name, { create: true });
  const writable = await file.createWritable();

  await writable.write(data);
  await writable.close();

  return file;
}

export function createEmptyFile(
  handle: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemFileHandle> {
  return handle.getFileHandle(name, { create: true });
}

export async function getFileContents(
  handle: FileSystemFileHandle,
): Promise<string> {
  const file = await handle.getFile();

  return file.text();
}

export async function getFileSize(
  handle: FileSystemFileHandle,
): Promise<number> {
  const file = await handle.getFile();

  return file.size;
}

export function createDirectory(
  handle: FileSystemDirectoryHandle,
  name: string,
) {
  return handle.getDirectoryHandle(name, { create: true });
}

export const pathSeparators = ["/", "\\"];

export async function assertEqualRecords(
  root: FileSystemHandle,
  actual: FileSystemChangeRecord[],
  expected: FileSystemChangeRecord[],
): Promise<void> {
  assertEquals(
    actual.length,
    expected.length,
    "Received an unexpected number of events",
  );

  for (let i = 0; i < actual.length; i++) {
    const actual_record = actual[i];
    const expected_record = expected[i];

    assertEquals(
      actual_record.type,
      expected_record.type,
      "A record's type didn't match the expected type",
    );

    assertEquals(
      actual_record.relativePathComponents,
      expected_record.relativePathComponents,
      "A record's relativePathComponents didn't match the expected relativePathComponents",
    );

    if (expected_record.relativePathMovedFrom) {
      assertEquals(
        actual_record.relativePathMovedFrom,
        expected_record.relativePathMovedFrom,
        "A record's relativePathMovedFrom didn't match the expected relativePathMovedFrom",
      );
    } else {
      assertEquals(
        actual_record.relativePathMovedFrom,
        null,
        "A record's relativePathMovedFrom was set when it shouldn't be",
      );
    }

    assert(
      await actual_record.changedHandle.isSameEntry(
        expected_record.changedHandle,
      ),
      "A record's changedHandle didn't match the expected changedHandle",
    );
    assert(
      await actual_record.root.isSameEntry(root),
      "A record's root didn't match the expected root",
    );
  }
}
