import { debounce } from "@std/async/debounce";

export interface WatcherOptions {
  /**
   * @default false
   */
  recursive?: boolean;

  /**
   * @default 200
   */
  wait?: number;
}

export class Watcher extends EventTarget {
  #path: string | string[];
  #unwatch: VoidFunction | undefined;
  #wait: number;
  #recursive: boolean;

  constructor(path: string | string[], options?: WatcherOptions) {
    super();

    const { recursive = false, wait = 200 } = options ?? {};

    this.#path = path;
    this.#wait = wait;
    this.#recursive = recursive;
  }

  watch(): void {
    if (this.#unwatch) return;

    const watcher = Deno.watchFs(this.#path, { recursive: this.#recursive });

    const callback = (event: Deno.FsEvent): void => {
      this.dispatchEvent(
        new CustomEvent<Deno.FsEvent>("*", { detail: event }),
      );
    };
    const dispatchEvent = debounce(callback, this.#wait);

    const process = async () => {
      for await (const event of watcher) dispatchEvent(event);
    };

    process();

    this.#unwatch = watcher.close.bind(watcher);
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
