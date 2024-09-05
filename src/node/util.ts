import type { FileSystemEvent } from "@miyauci/fs";
import { List } from "@miyauci/infra";

export function createEvent(
  eventName: "add" | "addDir" | "change" | "unlink" | "unlinkDir",
  path: string,
  root: string,
): FileSystemEvent {
  const relativePath = path.replace(root, "");
  const segments = relativePath.split("/");
  const modifiedPath = new List(segments);
  const baseEvent = { fromPath: null, modifiedPath };

  switch (eventName) {
    case "add":
      return { ...baseEvent, entryType: "file", type: "appeared" };

    case "addDir":
      return { ...baseEvent, entryType: "directory", type: "appeared" };

    case "change":
      return { ...baseEvent, entryType: "file", type: "modified" };

    case "unlink":
      return { ...baseEvent, entryType: "file", type: "disappeared" };

    case "unlinkDir":
      return { ...baseEvent, entryType: "directory", type: "disappeared" };
  }
}
