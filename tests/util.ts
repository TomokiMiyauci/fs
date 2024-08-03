import { FileSystemFileHandle } from "../src/file_system/file_system_file_handle.ts";
import { FileSystemDirectoryHandle } from "../src/file_system/file_system_directory_handle.ts";
import { FileSystemWriteChunkType } from "../src/file_system/type.ts";

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
  return createFileWithContents(handle, name, "");
}
