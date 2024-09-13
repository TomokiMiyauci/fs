import type { FileSystemChangeType } from "@miyauci/fs";

export const ABORT_ERROR = "AbortError";

export const allEvents = [
  "access",
  "any",
  "create",
  "modify",
  "other",
  "remove",
] satisfies Deno.FsEvent["kind"][];

export const KindMap = {
  any: "unknown",
  access: "unknown",
  other: "unknown",
  create: "appeared",
  modify: "modified",
  remove: "disappeared",
  rename: "moved",
} satisfies KindMap;

type KindMap = {
  [k in Deno.FsEvent["kind"]]: FileSystemChangeType;
};
