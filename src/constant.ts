export const enum Msg {
  NotFound =
    "A requested file or directory could not be found at the time an operation was processed.",

  Mismatch =
    "The path supplied exists, but was not an entry of requested type.",

  InvalidName = "Name is not allowed.",
  InvalidModification = "The object can not be modified in this way.",
  NoModificationAllowed = "The object can not be modified.",

  InvalidSeekParams =
    "Invalid params passed. seek requires a position argument.",

  InvalidWriteParams = "Invalid params passed. write requires a data argument",
  InvalidTruncateParams =
    "Invalid params passed. truncate requires a size argument",
}
