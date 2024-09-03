import { join } from "@std/path/join";
import { format } from "@miyauci/format";
import type { FileSystem as _FileSystem } from "../file_system.ts";
import type {
  AccessMode,
  DirectoryEntry,
  FileSystemAccessResult,
} from "../file_system_entry.ts";
import {
  DescriptorName,
  Flag,
  PERMISSION_ERROR_MESSAGE_TEMPLATE,
} from "./constant.ts";

export abstract class BaseEntry {
  constructor(protected root: string, protected path: string[]) {
    this.name = path[path.length - 1];
  }

  protected get fullPath(): string {
    return join(this.root, ...this.path);
  }

  readonly name: string;

  abstract get parent(): DirectoryEntry | null;

  queryAccess(mode: AccessMode): FileSystemAccessResult {
    switch (mode) {
      case "read": {
        const result = Deno.permissions.requestSync({
          name: "read",
          path: this.fullPath,
        });

        if (result.state !== "granted") {
          return {
            permissionState: result.state,
            errorName: readPermissionErrorMsg(this.fullPath),
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
            errorName: readPermissionErrorMsg(this.fullPath),
          };
        }

        const writeResult = Deno.permissions.requestSync({
          name: "write",
          path: this.fullPath,
        });

        if (writeResult.state !== "granted") {
          return {
            permissionState: readResult.state,
            errorName: writePermissionErrorMsg(this.fullPath),
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

        if (result.state !== "granted") {
          return {
            permissionState: result.state,
            errorName: readPermissionErrorMsg(this.fullPath),
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
            errorName: readPermissionErrorMsg(this.fullPath),
          };
        }

        const writeResult = Deno.permissions.requestSync({
          name: "write",
          path: this.fullPath,
        });

        if (writeResult.state !== "granted") {
          return {
            permissionState: readResult.state,
            errorName: writePermissionErrorMsg(this.fullPath),
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

function readPermissionErrorMsg(path: string): string {
  return format(PERMISSION_ERROR_MESSAGE_TEMPLATE, {
    name: DescriptorName.Read,
    flag: Flag.AllowRead,
    path,
  });
}

function writePermissionErrorMsg(path: string): string {
  return format(PERMISSION_ERROR_MESSAGE_TEMPLATE, {
    name: DescriptorName.Write,
    flag: Flag.AllowWrite,
    path,
  });
}
