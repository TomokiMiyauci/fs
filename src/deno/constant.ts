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
