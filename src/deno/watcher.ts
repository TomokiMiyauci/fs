import { debounce } from "@std/async/debounce";

export interface WatcherOptions {
  /**
   * @default false
   */
  recursive: boolean;

  /**
   * @default 200
   */
  wait: number;
}

export class Watcher extends EventTarget {
  #path: string | string[];
  #options: WatcherOptions;
  #unwatch: VoidFunction | undefined;

  constructor(path: string | string[], options?: Partial<WatcherOptions>) {
    super();

    const { recursive = false, wait = 200 } = options ?? {};

    this.#path = path;
    this.#options = { recursive, wait };
  }

  watch(): void {
    if (this.#unwatch) return;

    const fsWatcher = Deno.watchFs(this.#path, this.#options);

    const dispatchEvent = debounce((event: Deno.FsEvent) => {
      this.dispatchEvent(
        new CustomEvent<Deno.FsEvent>("*", { detail: event }),
      );
    }, this.#options.wait);

    const process = async () => {
      for await (const event of fsWatcher) dispatchEvent(event);
    };

    process();

    this.#unwatch = fsWatcher.close.bind(fsWatcher);
  }

  unwatch(): void {
    this.#unwatch?.();
    this.#unwatch = undefined;
  }
}

export interface Watcher {
  addEventListener<K extends keyof FsEventMap>(
    type: K,
    listener: (this: Watcher, ev: FsEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;

  removeEventListener<K extends keyof FsEventMap>(
    type: K,
    listener: (this: Watcher, ev: FsEventMap[K]) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

export interface FsEventMap {
  "*": CustomEvent<Deno.FsEvent>;
}
