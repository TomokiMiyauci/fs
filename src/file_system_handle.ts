import { isSameLocator } from "./algorithm.ts";
import type { RegisteredObserver } from "./observer.ts";
import type {
  FileSystemHandleContext,
  FileSystemHandleKind,
  FileSystemLocator,
} from "./type.ts";
import type { UserAgent } from "./observer.ts";
import { locator as $locator } from "./symbol.ts";
import { List } from "@miyauci/infra";

export interface FileSystemHandleOptions {
  root?: FileSystemHandle;
}

export class FileSystemHandle {
  constructor(
    context: FileSystemHandleContext,
    options?: FileSystemHandleOptions,
  ) {
    this[$locator] = context.locator;
    this.root = options?.root ?? this;
    this.userAgent = context.userAgent;
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
    this.userAgent.fileSystemQueue.enqueue(() => {
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

  // Non-standard internal slot
  protected userAgent: UserAgent;
  protected root: FileSystemHandle;
  protected registeredObserverList: List<RegisteredObserver> = new List();
}
