import { isSameLocator } from "./file_system_entry.ts";
import type { FileSystemHandleContext } from "./type.ts";
import type { FileSystemLocator } from "./file_system_locator.ts";
import { locator as $locator } from "./symbol.ts";
import { userAgent } from "./user_agent.ts";

/**
 * @see https://fs.spec.whatwg.org/#enumdef-filesystemhandlekind
 */
export type FileSystemHandleKind = "directory" | "file";

export class FileSystemHandle {
  constructor(context: FileSystemHandleContext) {
    this[$locator] = context.locator;
  }
  get kind(): FileSystemHandleKind {
    // steps are to return this's locator's kind.
    return this[$locator].kind;
  }

  get name(): string {
    // steps are to return the last item (a string) of this's locator's path.
    return this[$locator].path[this[$locator].path.size - 1];
  }

  isSameEntry(other: FileSystemHandle): Promise<boolean> {
    // 1. Let realm be this's relevant Realm.

    // 2. Let p be a new promise in realm.
    const { promise, resolve } = Promise.withResolvers<boolean>();

    // 3. Enqueue the following steps to the file system queue:
    userAgent.fileSystemQueue.enqueue(() => {
      // 1. If this's locator is the same locator as other’s locator, resolve p with true.
      if (isSameLocator(this[$locator], other[$locator])) resolve(true);
      // 2. Otherwise resolve p with false.
      else resolve(false);
    });

    // 4. Return p.
    return promise;
  }

  /**
   * @see https://fs.spec.whatwg.org/#filesystemhandle-locator
   */
  [$locator]: FileSystemLocator;
}
