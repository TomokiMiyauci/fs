import { List, OrderedSet } from "@miyauci/infra";
import { FileSystemHandle } from "./file_system_handle.ts";
import {
  isDirectoryEntry,
  isFileEntry,
  isValidFileName,
  resolveLocator,
} from "./algorithm.ts";
import type {
  DirectoryEntry,
  FileEntry,
  FileSystemEntry,
  FileSystemGetDirectoryOptions,
  FileSystemGetFileOptions,
  FileSystemLocator,
  FileSystemRemoveOptions,
} from "./type.ts";
import type { Definition } from "./definition.ts";
import type { UserAgent } from "./observer.ts";
import {
  createChildFileSystemFileHandle,
  FileSystemFileHandle,
} from "./file_system_file_handle.ts";
import {
  locator as $locator,
  registeredObserverList,
  root as $root,
  userAgent as $userAgent,
} from "./symbol.ts";
import { asynciterator, type PairAsyncIterable } from "../webidl/async.ts";
import { Msg } from "./constant.ts";
import { queueRecord } from "./observer.ts";

@asynciterator({
  init(_, iterator): void {
    // 1. Set iterator’s past results to an empty set.
    iterator.pastResults = new OrderedSet();
  },
  next,
})
export class FileSystemDirectoryHandle extends FileSystemHandle {
  constructor(
    locator: FileSystemLocator,
    private definition: Definition,
    userAgent: UserAgent,
    root?: FileSystemHandle,
  ) {
    super(locator, userAgent, root);
  }
  override get kind(): "directory" {
    return "directory";
  }

  getDirectoryHandle(
    name: string,
    options?: FileSystemGetDirectoryOptions,
  ): Promise<FileSystemDirectoryHandle> {
    // 1. Let result be a new promise.
    const { promise, reject, resolve } = Promise.withResolvers<
      FileSystemDirectoryHandle
    >();

    // 2. Let realm be this's relevant Realm.

    // 3. Let locator be this's locator.
    const locator = this[$locator];

    // 4. Let global be this's relevant global object.

    // 5. Enqueue the following steps to the file system queue:
    this[$userAgent].fileSystemQueue.enqueue(() => {
      // 1. If name is not a valid file name, queue a storage task with global to reject result with a TypeError and abort these steps.
      if (!isValidFileName(name)) {
        return this[$userAgent].storageTask.enqueue(() => {
          reject(new TypeError(Msg.InvalidName));
        });
      }

      // 2. Let entry be the result of locating an entry given locator.
      const entry = this.definition.locateEntry(locator);

      // 3. If options["create"] is true:
      // 1. Let accessResult be the result of running entry’s request access given "readwrite".
      // 4. Otherwise:
      // 1. Let accessResult be the result of running entry’s query access given "read".
      const accessResult = options?.create
        ? entry?.requestAccess("readwrite")
        : entry?.queryAccess("read");

      // 5. Queue a storage task with global to run these steps:
      this[$userAgent].storageTask.enqueue(async () => {
        // 1. If accessResult’s permission state is not "granted", reject result with a DOMException of accessResult’s error name and abort these steps.
        if (accessResult && accessResult.permissionState !== "granted") {
          return reject(new DOMException(accessResult.errorName));
        }

        // 2. If entry is null, reject result with a "NotFoundError" DOMException and abort these steps.
        if (entry === null) {
          return reject(new DOMException(Msg.NotFound, "NotFoundError"));
        }

        // 3. Assert: entry is a directory entry.
        assertDirectoryEntry(entry);

        // 4. For each child of entry’s children:
        for (const child of entry.children) {
          // 1. If child’s name equals name:
          if (child.name === name) {
            // 1. If child is a file entry:
            if (isFileEntry(child)) {
              // 1. Reject result with a "TypeMismatchError" DOMException and abort these steps.
              return reject(
                new DOMException(Msg.Mismatch, "TypeMismatchError"),
              );
            }

            // 2. Resolve result with the result of creating a child FileSystemDirectoryHandle with locator and child’s name in realm and abort these steps.
            return resolve(
              createChildFileSystemDirectoryHandle(locator, name, {
                definition: this.definition,
                root: this[$root],
                userAgent: this[$userAgent],
              }),
            );
          }
        }

        // 5. If options["create"] is false:
        if (!options?.create) {
          // 1. Reject result with a "NotFoundError" DOMException and abort these steps.
          return reject(new DOMException(Msg.NotFound, "NotFoundError"));
        }

        // 6. Let child be a new directory entry whose query access and request access algorithms are those of entry.
        const child = {
          // 7. Set child’s name to name.
          name,
          queryAccess: entry.queryAccess.bind(entry),
          requestAccess: entry.requestAccess.bind(entry),
          // 8. Set child’s children to an empty set.
          children: new OrderedSet(),
        } satisfies DirectoryEntry;

        try {
          // 9. Append child to entry’s children.
          entry.children.append(child);
        } catch (e) {
          // 10. If creating child in the underlying file system throws an exception, reject result with that exception and abort these steps.
          return reject(e);
        }

        const childLocator = createChildLocator(locator, child);

        const handle = new FileSystemDirectoryHandle(
          childLocator,
          this.definition,
          this[$userAgent],
          this[$root],
        );

        await queueRecord(
          this[registeredObserverList],
          handle,
          "appeared",
          this[$root],
          this[$userAgent],
        );

        // 11. Resolve result with the result of creating a child FileSystemDirectoryHandle with locator and child’s name in realm.
        resolve(handle);
      });
    });

    // 6.  Return result.
    return promise;
  }

  getFileHandle(
    name: string,
    options?: FileSystemGetFileOptions,
  ): Promise<FileSystemFileHandle> {
    // 1. Let result be a new promise.
    const { promise, reject, resolve } = Promise.withResolvers<
      FileSystemFileHandle
    >();

    // 2. Let realm be this's relevant Realm.
    const realm = {
      FileSystemFileHandle,
      definition: this.definition,
      userAgent: this[$userAgent],
      root: this[$root],
    };

    // 3. Let locator be this's locator.
    const locator = this[$locator];

    // 4. Let global be this's relevant global object.
    // 5. Enqueue the following steps to the file system queue:
    this[$userAgent].fileSystemQueue.enqueue(() => {
      // 1. If name is not a valid file name, queue a storage task with global to reject result with a TypeError and abort these steps.
      if (!isValidFileName(name)) {
        return this[$userAgent].storageTask.enqueue(() => {
          reject(new TypeError(Msg.InvalidName));
        });
      }

      // 2. Let entry be the result of locating an entry given locator.
      const entry = this.definition.locateEntry(locator);

      // 3. If options["create"] is true:
      // 1. Let accessResult be the result of running entry’s request access given "readwrite".
      // 4. Otherwise:
      // 1. Let accessResult be the result of running entry’s query access given "read".
      const accessResult = options?.create
        ? entry?.queryAccess("readwrite")
        : entry?.queryAccess("read");

      // 5. Queue a storage task with global to run these steps:
      this[$userAgent].storageTask.enqueue(async () => {
        // 1. If accessResult’s permission state is not "granted", reject result with a DOMException of accessResult’s error name and abort these steps.
        if (accessResult && accessResult.permissionState !== "granted") {
          return reject(new DOMException(accessResult.errorName));
        }

        // 2. If entry is null, reject result with a "NotFoundError" DOMException and abort these steps.
        if (entry === null) {
          return reject(new DOMException(Msg.NotFound, "NotFoundError"));
        }

        // 3. Assert: entry is a directory entry.
        assertDirectoryEntry(entry);

        // 4. For each child of entry’s children:
        for (const child of entry.children) {
          // 1. If child’s name equals name:
          if (child.name === name) {
            // 1. If child is a directory entry:
            if (isDirectoryEntry(child)) {
              // 1. Reject result with a "TypeMismatchError" DOMException and abort these steps.
              return reject(
                new DOMException(Msg.Mismatch, "TypeMismatchError"),
              );
            }

            // 2. Resolve result with the result of creating a child FileSystemFileHandle with locator and child’s name in realm and abort these steps.
            return resolve(
              createChildFileSystemFileHandle(locator, child.name, realm),
            );
          }
        }

        // 5. If options["create"] is false:
        if (!options?.create) {
          // 1. Reject result with a "NotFoundError" DOMException and abort these steps.
          return reject(new DOMException(Msg.NotFound, "NotFoundError"));
        }

        // 6. Let child be a new file entry whose query access and request access algorithms are those of entry.
        const child = {
          // 7. Set child’s name to name.
          name,
          // 8. Set child’s binary data to an empty byte sequence.
          binaryData: new Uint8Array(0),
          queryAccess: entry.queryAccess.bind(entry),
          requestAccess: entry.requestAccess.bind(entry),
          // 9. Set child’s modification timestamp to the current time.
          modificationTimestamp: Date.now(),
          sharedLockCount: 0,
          lock: "open",
        } satisfies FileEntry;

        try {
          // 10. Append child to entry’s children.
          entry.children.append(child);
        } catch (e) {
          // 11. If creating child in the underlying file system throws an exception, reject result with that exception and abort these steps.
          reject(e);
        }

        const handle = createChildFileSystemFileHandle(
          locator,
          child.name,
          realm,
        );
        await queueRecord(
          this[registeredObserverList],
          handle,
          "appeared",
          this[$root],
          this[$userAgent],
        );

        // 12. Resolve result with the result of creating a child FileSystemFileHandle with locator and child’s name in realm.
        resolve(handle);
      });
    });

    // 6. Return result.
    return promise;
  }

  removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void> {
    // 1. Let result be a new promise.
    const { promise, resolve, reject } = Promise.withResolvers<void>();

    // 2. Let locator be this's locator.
    const locator = this[$locator];

    // 3. Let global be this's relevant global object.

    // 4. Enqueue the following steps to the file system queue:
    this[$userAgent].fileSystemQueue.enqueue(() => {
      // 1. If name is not a valid file name, queue a storage task with global to reject result with a TypeError and abort these steps.
      if (!isValidFileName(name)) {
        return this[$userAgent].storageTask.enqueue(() => {
          reject(new TypeError(Msg.InvalidName));
        });
      }

      // 2. Let entry be the result of locating an entry given locator.
      const entry = this.definition.locateEntry(locator);

      // 3. Let accessResult be the result of running entry’s request access given "readwrite".
      const accessResult = entry?.requestAccess("readwrite");

      // 4. Queue a storage task with global to run these steps:
      this[$userAgent].storageTask.enqueue(async () => {
        // 1. If accessResult’s permission state is not "granted", reject result with a DOMException of accessResult’s error name and abort these steps.
        if (accessResult && accessResult.permissionState !== "granted") {
          return reject(new DOMException(accessResult.errorName));
        }

        // 2. If entry is null, reject result with a "NotFoundError" DOMException and abort these steps.
        if (entry === null) {
          return reject(new DOMException(Msg.NotFound, "NotFoundError"));
        }

        // 3. Assert: entry is a directory entry.
        assertDirectoryEntry(entry);

        // 4. For each child of entry’s children:
        for (const child of entry.children) {
          // 1. If child’s name equals name:
          if (child.name === name) {
            // 1. If child is a directory entry:
            if (isDirectoryEntry(child)) {
              // 1. If child’s children is not empty and options["recursive"] is false:
              if (!child.children.isEmpty && !options?.recursive) {
                // 1. Reject result with an "InvalidModificationError" DOMException and abort these steps.
                return reject(
                  new DOMException(
                    Msg.InvalidModification,
                    "InvalidModificationError",
                  ),
                );
              }
            }

            const handle = (await findHandle(this, child))!; // This is probably guaranteed.

            try {
              // 2. Remove child from entry’s children.
              entry.children.remove(child);
            } catch (e) {
              // 3. If removing child in the underlying file system throws an exception, reject result with that exception and abort these steps.
              return reject(e);
            }

            await queueRecord(
              this[registeredObserverList],
              handle,
              "disappeared",
              this[$root],
              this[$userAgent],
            );

            // 4. Resolve result with undefined.
            return resolve();
          }
        }

        // 5. Reject result with a "NotFoundError" DOMException.
        reject(new DOMException(Msg.NotFound, "NotFoundError"));
      });
    });

    // 5. Return result.
    return promise;
  }

  async resolve(
    possibleDescendant: FileSystemHandle,
  ): Promise<string[] | null> {
    // steps are to return the result of resolving possibleDescendant’s locator relative to this's locator.
    const result = await resolveLocator(
      possibleDescendant[$locator],
      this[$locator],
      this[$userAgent],
    );

    if (result) return [...result];

    return result;
  }
}

export interface FileSystemDirectoryHandle
  extends PairAsyncIterable<string, FileSystemHandle> {}

interface IterationContext {
  /**
   * @see https://fs.spec.whatwg.org/#filesystemdirectoryhandle-iterator-past-results
   */
  pastResults: OrderedSet<string>;
}

function next(
  handle: FileSystemDirectoryHandle,
  iterator:
    & AsyncIterableIterator<[string, FileSystemHandle]>
    & IterationContext,
): Promise<IteratorResult<[string, FileSystemHandle]>> {
  const locator = handle[$locator];
  const definition = handle["definition"];
  const root = handle[$root];
  const userAgent = handle[$userAgent];

  // // 1. Let promise be a new promise.
  const { promise, reject, resolve } = Promise.withResolvers<
    IteratorResult<
      [string, FileSystemFileHandle | FileSystemDirectoryHandle]
    >
  >();

  // // 2. Enqueue the following steps to the file system queue:
  userAgent.fileSystemQueue.enqueue(() => {
    // // 1. Let directory be the result of locating an entry given handle’s locator.
    const directory = definition.locateEntry(locator);

    // // 2. Let accessResult be the result of running directory’s query access given "read".
    const accessResult = directory?.queryAccess("read");

    // // 3. Queue a storage task with handle’s relevant global object to run these steps:
    userAgent.storageTask.enqueue(() => {
      // // 1. If accessResult’s permission state is not "granted", reject promise with a DOMException of accessResult’s error name and abort these steps.:
      if (accessResult && accessResult.permissionState !== "granted") {
        return reject(new DOMException(accessResult.errorName));
      }

      // // 2. If directory is null, reject result with a "NotFoundError" DOMException and abort these steps.
      if (directory === null) {
        return reject(new DOMException(Msg.NotFound, "NotFoundError"));
      }

      // // 1. Assert: directory is a directory entry.
      assertDirectoryEntry(directory);

      const names = new Set(iterator.pastResults);
      // // 3. Let child be a file system entry in directory’s children, such that child’s name is not contained in iterator’s past results, or null if no such entry exists.
      const child = find(directory.children) ?? null;

      function find(
        iter: Iterable<FileSystemEntry>,
      ): FileSystemEntry | undefined {
        for (const item of iter) if (!names.has(item.name)) return item;
      }

      // // 4. If child is null, resolve promise with undefined and abort these steps.
      if (child === null) return resolve({ done: true, value: undefined });

      // // 5. Append child’s name to iterator’s past results.
      iterator.pastResults.append(child.name);

      let result: FileSystemFileHandle | FileSystemDirectoryHandle;
      // 6. If child is a file entry:
      if (isFileEntry(child)) {
        // 1. Let result be the result of creating a child FileSystemFileHandle with handle’s locator and child’s name in handle’s relevant Realm.
        result = createChildFileSystemFileHandle(locator, child.name, {
          definition,
          root,
          userAgent,
        });
      } // 7. Otherwise:
      else {
        // 1. Let result be the result of creating a child FileSystemDirectoryHandle with handle’s locator and child’s name in handle’s relevant Realm.
        result = createChildFileSystemDirectoryHandle(
          locator,
          child.name,
          { definition, root, userAgent },
        );
      }

      // 8. Resolve promise with (child’s name, result).
      resolve({ done: false, value: [child.name, result] });
    });
  });

  // 3. Return promise.
  return promise;
}

function assertDirectoryEntry(
  _: FileSystemEntry,
): asserts _ is DirectoryEntry {}

export function createChildFileSystemDirectoryHandle(
  parentLocator: FileSystemLocator,
  name: string,
  realm: {
    definition: Definition;
    root: FileSystemHandle;
    userAgent: UserAgent;
  },
): FileSystemDirectoryHandle {
  // 2. Let childType be "directory".
  const childType = "directory";

  // 3. Let childRoot be a copy of parentLocator’s root.
  const childRoot = parentLocator.root;

  // 4. Let childPath be the result of cloning parentLocator’s path and appending name.
  const childPath = parentLocator.path.clone();
  childPath.append(name);

  const locator = {
    kind: childType,
    root: childRoot,
    path: childPath,
  } satisfies FileSystemLocator;

  // 5. Set handle’s locator to a file system locator whose kind is childType, root is childRoot, and path is childPath.
  // 1. Let handle be a new FileSystemDirectoryHandle in realm.
  const handle = new FileSystemDirectoryHandle(
    locator,
    realm.definition,
    realm.userAgent,
    realm.root,
  );

  // 6. Return handle.
  return handle;
}

export function createFileSystemDirectoryHandle(
  root: string,
  path: List<string>,
  realm: {
    definition: Definition;
    userAgent: UserAgent;
  },
): FileSystemDirectoryHandle {
  const locator = { kind: "directory", root, path } satisfies FileSystemLocator;
  const handle = new FileSystemDirectoryHandle(
    locator,
    realm.definition,
    realm.userAgent,
  );

  return handle;
}

function createChildLocator(
  locator: FileSystemLocator,
  entry: FileSystemEntry,
): FileSystemLocator {
  const path = locator.path.clone();
  path.append(entry.name);
  const root = locator.root;

  const kind = isDirectoryEntry(entry) ? "directory" : "file";

  return { kind, path, root };
}

async function findHandle(
  dirHandle: FileSystemDirectoryHandle,
  entry: FileSystemEntry,
): Promise<FileSystemHandle | undefined> {
  for await (const [_, handle] of dirHandle) {
    if (handle.name === entry.name) return handle;
  }
}
