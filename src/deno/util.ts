import { join } from "@std/path/join";
import { relative } from "@std/path/relative";
import { List } from "@miyauci/infra";
import type {
  DirectoryEntry,
  FileSystem,
  FileSystemAccessResult,
  FileSystemEvent,
  FileSystemHandleKind,
} from "@miyauci/fs";
import { ABORT_ERROR, KindMap } from "./constant.ts";
import { safeStatSync } from "./io.ts";

export abstract class BaseEntry {
  constructor(fileSystem: FileSystem, protected path: string[]) {
    this.name = path[path.length - 1];
    this.fileSystem = fileSystem;
  }

  protected get fullPath(): string {
    return join(this.fileSystem.root, ...this.path);
  }

  readonly name: string;

  readonly fileSystem: FileSystem;

  abstract get parent(): DirectoryEntry | null;

  queryAccess(mode: "read" | "readwrite"): FileSystemAccessResult {
    switch (mode) {
      case "read": {
        const result = Deno.permissions.requestSync({
          name: "read",
          path: this.fullPath,
        });

        if (result.state !== "granted") {
          return {
            permissionState: result.state,
            errorName: ABORT_ERROR,
          };
        }

        return { permissionState: result.state, errorName: "" };
      }
      case "readwrite": {
        const readResult = Deno.permissions.requestSync({
          name: "read",
          path: this.fullPath,
        });

        if (readResult.state !== "granted") {
          return {
            permissionState: readResult.state,
            errorName: ABORT_ERROR,
          };
        }

        const writeResult = Deno.permissions.requestSync({
          name: "write",
          path: this.fullPath,
        });

        if (writeResult.state !== "granted") {
          return {
            permissionState: readResult.state,
            errorName: ABORT_ERROR,
          };
        }

        return {
          permissionState: "granted",
          errorName: "",
        };
      }
    }
  }

  requestAccess(mode: "read" | "readwrite"): FileSystemAccessResult {
    switch (mode) {
      case "read": {
        const result = Deno.permissions.requestSync({
          name: "read",
          path: this.fullPath,
        });

        if (result.state !== "granted") {
          return {
            permissionState: result.state,
            errorName: ABORT_ERROR,
          };
        }

        return { permissionState: result.state, errorName: "" };
      }
      case "readwrite": {
        const readResult = Deno.permissions.requestSync({
          name: "read",
          path: this.fullPath,
        });

        if (readResult.state !== "granted") {
          return {
            permissionState: readResult.state,
            errorName: ABORT_ERROR,
          };
        }

        const writeResult = Deno.permissions.requestSync({
          name: "write",
          path: this.fullPath,
        });

        if (writeResult.state !== "granted") {
          return {
            permissionState: readResult.state,
            errorName: ABORT_ERROR,
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

export class FsEventConverter {
  static toFileSystemEvents(
    root: string,
    event: Deno.FsEvent,
  ): FileSystemEvent[] {
    return event.paths.map((path) => {
      const stat = safeStatSync(path);

      return this.toFileSystemEvent({ path, kind: event.kind, root, stat });
    });
  }

  static toFileSystemEvent(
    { path, root, kind, stat }: EventContext,
  ): FileSystemEvent {
    const entryType = stat ? this.toEntryType(stat) : null;
    const modifiedPath = this.toModifiedPath(root, path);
    const type = KindMap[kind];

    return { modifiedPath, type, fromPath: null, entryType };
  }

  static toModifiedPath(root: string, path: string): List<string> {
    const relativePath = relative(root, path);
    const segments = relativePath.split("/");
    const modifiedPath = new List(segments);

    return modifiedPath;
  }

  static toEntryType(
    info: Pick<Deno.FileInfo, "isDirectory" | "isFile">,
  ): FileSystemHandleKind | null {
    if (info.isDirectory) return "directory";
    if (info.isFile) return "file";

    return null;
  }
}

export interface EventContext {
  path: string;
  root: string;
  kind: Deno.FsEvent["kind"];
  stat: Pick<Deno.FileInfo, "isDirectory" | "isFile"> | undefined;
}
