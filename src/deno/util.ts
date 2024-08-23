import { join } from "@std/path/join";
import type { FileSystem as _FileSystem } from "../file_system.ts";
import type {
  AccessMode,
  DirectoryEntry as _DirectoryEntry,
  FileEntry as _FileEntry,
  FileSystemAccessResult,
} from "../file_system_entry.ts";

export class BaseEntry {
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
