export class List<T> {
  #item: T[] = [];

  get isEmpty(): boolean {
    return !this.#item.length;
  }

  append(item: T): void {
    this.#item.push(item);
  }

  prepend(item: T): void {
    this.#item.unshift(item);
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.#item[Symbol.iterator]();
  }

  empty(): void {
    this.#item.length = 0;
  }

  remove(condition: (item: T) => boolean): void {
    this.#item = this.#item.filter((item) => !condition(item));
  }

  clone(): List<T> {
    const list = new List<T>();

    for (const item of this.#item) list.append(item);

    return list;
  }
}
