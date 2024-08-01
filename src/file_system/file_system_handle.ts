import { isSameLocator } from "./algorithm.ts";
import type {
  FileSystemHandleKind,
  FileSystemLocator,
  IO,
  UnderlyingFileSystem,
} from "./type.ts";
import { locator } from "./symbol.ts";

export class FileSystemHandle {
  constructor(
    loc: FileSystemLocator,
    protected fs: UnderlyingFileSystem,
    protected io: IO,
  ) {
    this[locator] = loc;
  }
  get kind(): FileSystemHandleKind {
    // steps are to return this's locator's kind.
    return this[locator].kind;
  }

  get name(): string {
    // steps are to return the last item (a string) of this's locator's path.
    return this[locator].path[this[locator].path.length - 1];
  }

  isSameEntry(other: FileSystemHandle): Promise<boolean> {
    // 1. Let realm be this's relevant Realm.

    // 2. Let p be a new promise in realm.
    const { promise, resolve } = Promise.withResolvers<boolean>();

    // 3. Enqueue the following steps to the file system queue:
    queueMicrotask(() => {
      // 1. If this's locator is the same locator as other’s locator, resolve p with true.
      if (isSameLocator(this[locator], other[locator])) resolve(true);
      // 2. Otherwise resolve p with false.
      else resolve(false);
    });

    // 4. Return p.
    return promise;
  }

  [locator]: FileSystemLocator;
}
