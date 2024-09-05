import type { FileSystemChangeType } from "@miyauci/fs";

export const enum Flag {
  AllowRead = "--allow-read",
  AllowWrite = "--allow-write",
}

export const enum DescriptorName {
  Read = "read",
  Write = "write",
}

export const PERMISSION_ERROR_MESSAGE_TEMPLATE =
  'Require ${name} access to "${path}", run again with the ${flag} flag';

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
