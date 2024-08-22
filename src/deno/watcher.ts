export interface WatcherOptions {
  /**
   * @default false
   */
  recursive?: boolean;
}

export class Watcher extends EventTarget {
  #path: string | string[];
  #recursive: boolean;
  #watcher: Deno.FsWatcher | undefined;

  constructor(path: string | string[], options?: WatcherOptions) {
    super();

    const { recursive = false } = options ?? {};

    this.#path = path;
    this.#recursive = recursive;
  }

  watch(): void {
    if (this.#watcher) return;

    const watcher = Deno.watchFs(this.#path, { recursive: this.#recursive });

    const dispatchEvent = (event: Deno.FsEvent): void => {
      this.dispatchEvent(
        new CustomEvent<Deno.FsEvent>(event.kind, { detail: event }),
      );
    };

    const process = async () => {
      for await (const event of watcher) dispatchEvent(event);
    };

    process();

    this.#watcher = watcher;
  }

  /** Stops watching the file system and closes the watcher resource. */
  unwatch(): void {
    this[Symbol.dispose]();
  }

  [Symbol.dispose](): void {
    this.#watcher?.close();
    this.#watcher = undefined;
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
  any: CustomEvent<Deno.FsEvent>;
  access: CustomEvent<Deno.FsEvent>;
  create: CustomEvent<Deno.FsEvent>;
  modify: CustomEvent<Deno.FsEvent>;
  remove: CustomEvent<Deno.FsEvent>;
  other: CustomEvent<Deno.FsEvent>;
}
