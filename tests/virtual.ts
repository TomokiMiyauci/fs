type Structure = Map<string, FileInfo | Structure>;

export class VirtualFileSystem {
  private map: Structure = new Map();

  remove(keys: string[]) {
    if (keys.length <= 1) {
      const key = keys[0];

      this.map.delete(key);
      return;
    }

    const [head, tail] = headTail(keys);

    const parent = this.get(head, this.map);

    if (!parent) {
      //
    } else if (parent instanceof Map) {
      parent.delete(tail);
    } else {
      throw new Error("delete");
    }
  }

  private get(keys: string[], map: Structure): FileInfo | Structure | null {
    const [first, ...rest] = keys;

    if (map.has(first)) {
      const result = map.get(first)!;

      if (rest.length) {
        if (result instanceof Map) {
          return this.get(rest, result);
        } else {
          throw new Error();
        }
      } else {
        if (result instanceof Map) return result;
        else return result;
      }
    }

    return null;
  }

  getSource(keys: string[]): FileInfo | Structure | null {
    return this.get(keys, this.map);
  }

  readDir(keys: string[]): Iterable<DirEntry> {
    const maybe = this.get(keys, this.map);

    if (!maybe) throw new Error();
    if (!(maybe instanceof Map)) throw new Error();

    return {
      *[Symbol.iterator](): Iterator<DirEntry> {
        for (const [name, value] of maybe) {
          if (value instanceof Map) {
            yield {
              get isDirectory() {
                return true;
              },
              get isFile() {
                return false;
              },
              name,
            };
          } else {
            yield {
              get isDirectory() {
                return false;
              },
              get isFile() {
                return true;
              },
              name,
            };
          }
        }
      },
    };
  }

  stat(paths: string[]): FileHeader {
    const maybe = this.get(paths, this.map);

    if (!maybe) throw new Error();
    if (maybe instanceof Map) throw new Error();

    return { lastModified: maybe.lastModified };
  }

  writeFile(keys: string[], value: Uint8Array): void {
    const maybe = this.get(keys, this.map);

    if (!maybe) throw new Error("not found");
    if (maybe instanceof Map) throw new Error();

    maybe.data = value;
  }

  readFile(keys: string[]): Uint8Array {
    const maybe = this.get(keys, this.map);

    if (!maybe) throw new Error();
    if (maybe instanceof Map) throw new Error();

    return maybe.data;
  }

  mkdir(keys: string[]): void {
    const [head, tail] = headTail(keys);

    if (!head.length) {
      const result = this.map.get(tail);

      if (!result) {
        this.map.set(tail, new Map());
        return;
      } else if (result instanceof Map) {
        return;
        // loop
      } else {
        throw new Error("it is already exist but it is file");
      }
    }

    const result = this.get(head, this.map);

    if (result instanceof Map) {
      const child = result.get(tail);

      if (child instanceof Map) {
        // loop
      } else if (!child) {
        result.set(tail, new Map());
      } else {
        throw new Error("it is already exist but it is file");
      }
    } else if (!result) {
      throw new Error("parent is not exist");
    } else {
      throw new Error("parent is not directory");
    }
  }

  touch(keys: string[]): void {
    if (keys.length <= 1) {
      const result = this.map.get(keys[0]);

      if (!result) {
        this.map.set(keys[0], {
          data: new Uint8Array(),
          lastModified: Date.now(),
        });
        return;
      } else if (result instanceof Map) {
        throw new Error("it is already exit");
      } else {
        // noop
        return;
      }
    }

    const [head, tail] = headTail(keys);

    const result = this.get(head, this.map);

    if (result instanceof Map) {
      const child = result.get(tail);

      if (child instanceof Map) {
        throw new Error("it is already exist but it is file");
      } else if (!child) {
        result.set(tail, { data: new Uint8Array(), lastModified: Date.now() });
      } else {
        return;
        // noop
      }
    } else if (!result) {
      throw new Error("parent is not exist");
    } else {
      throw new Error("parent is not directory");
    }
  }
}

function headTail<T>(input: T[]): [head: T[], tail: T] {
  const index = input.length - 1;
  const head = input.slice(0, index);
  const tail = input[index];

  return [head, tail];
}

export interface FileHeader {
  lastModified: number;
}

export interface FileInfo extends FileHeader {
  data: Uint8Array;
}

export interface DirEntry {
  get isDirectory(): boolean;
  get isFile(): boolean;
  readonly name: string;
}
