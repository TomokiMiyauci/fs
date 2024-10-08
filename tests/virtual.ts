type Structure = Map<string, FileInfo | Structure>;

export class VirtualFileSystem {
  private map: Structure = new Map();

  /** Removes resource of a given path. */
  remove(keys: string[]): void {
    const [key, parent] = this.getParentDir(keys);

    parent.delete(key);
  }

  private getParentDir(keys: string[]): [childKey: string, Structure] {
    if (keys.length <= 1) return [keys[0], this.map];

    const [head, tail] = headTail(keys);

    const parent = this.get(head, this.map);

    if (!parent) throw new Error(Msg.NotFound);
    if (parent instanceof Map) return [tail, parent];

    throw new Error(Msg.NotDirectory);
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

  stat(paths: string[]): FileHeader {
    const maybe = this.get(paths, this.map);

    if (!maybe) throw new Error();
    if (maybe instanceof Map) throw new Error();

    return { lastModified: maybe.lastModified };
  }

  /** Write file contents in the specified path.
   *
   * @throws {Error} If the file does not exist.
   * @throws {Error} If the resource is not a file.
   */
  writeFile(keys: string[], value: Uint8Array): void {
    const [key, parent] = this.getParentDir(keys);

    const resource = parent.get(key);

    if (!resource) throw new Error(Msg.NotFound);
    if (resource instanceof Map) throw new Error(Msg.IsDirectory);

    resource.data = value.slice();
  }

  /** Gets a file contents in the specified path.
   *
   * @throws {Error} If the file does not exist.
   * @throws {Error} If the resource is not a file.
   */
  readFile(keys: string[]): Uint8Array {
    const [key, parent] = this.getParentDir(keys);
    const resource = parent.get(key);

    if (!resource) throw new Error(Msg.NotFound);
    if (resource instanceof Map) throw new Error(Msg.IsDirectory);

    return resource.data;
  }

  /** Gets a directory in the specified path.
   *
   * @throws {Error} If the directory does not exist.
   * @throws {Error} If the resource is not a directory.
   */
  readDirectory(keys: string[]): Iterable<DirEntry> {
    const [key, parent] = this.getParentDir(keys);
    const child = parent.get(key);

    if (!child) throw new Error(Msg.NotFound);
    if (child instanceof Map) {
      return {
        *[Symbol.iterator](): Iterator<DirEntry> {
          for (const [name, value] of child) {
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
    } else throw new Error(Msg.IsFile);
  }

  /** Create a file in the specified path.
   *
   * @throws {Error} If the resource already exists and it is a directory.
   */
  createFile(keys: string[]): void {
    const [key, parent] = this.getParentDir(keys);
    const resource = parent.get(key);

    if (!resource) {
      parent.set(key, { data: new Uint8Array(), lastModified: Date.now() });
    } else if (resource instanceof Map) throw new Error(Msg.IsDirectory);
  }

  /** Create a directory in the specified path.
   *
   * @throws {Error} If the resource already exists and it is a file.
   */
  createDirectory(keys: string[]): void {
    const [key, parent] = this.getParentDir(keys);
    const resource = parent.get(key);

    if (!resource) parent.set(key, new Map());
    else if (resource instanceof Map) {
      //
    } else throw new Error(Msg.IsFile);
  }
}

function headTail<T>(input: T[]): [head: T[], tail: T] {
  const index = input.length - 1;
  const head = input.slice(0, index);
  const tail = input[index];

  return [head, tail];
}

export interface FileHeader {
  readonly lastModified: number;
}

export interface FileInfo extends FileHeader {
  data: Uint8Array;
}

export interface DirEntry {
  get isDirectory(): boolean;
  get isFile(): boolean;
  readonly name: string;
}

const enum Msg {
  IsDirectory = "Is a directory",
  IsFile = "Is a file",
  AlreadyExists = "File exists",
  NotFound = "No such file or directory",
  NotDirectory = "Not a directory",
}
