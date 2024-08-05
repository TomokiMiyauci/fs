export class OrderedSet<T> {
  #set: Set<T> = new Set();

  append(item: T): void {
    this.#set.add(item);
  }

  clone(): OrderedSet<T> {
    const set = new OrderedSet<T>();

    for (const item of this.#set) set.append(item);

    return set;
  }

  empty(): void {
    this.#set.clear();
  }

  get size(): number {
    return this.#set.size;
  }

  get isEmpty(): boolean {
    return !this.#set.size;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.#set[Symbol.iterator]();
  }
}
