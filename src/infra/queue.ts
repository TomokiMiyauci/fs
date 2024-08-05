export class Queue<T> {
  #items: T[] = [];

  get isEmpty(): boolean {
    return !this.#items.length;
  }

  clone(): Queue<T> {
    const queue = new Queue<T>();

    for (const item of this.#items) queue.enqueue(item);

    return queue;
  }

  empty(): void {
    this.#items.length = 0;
  }

  enqueue(item: T): void {
    this.#items.push(item);
  }

  dequeue(item: T): T | null {
    const index = this.#items.findIndex((value) => value === item);

    if (-1 < index) {
      this.#items.splice(index, 1);

      return item;
    }

    return null;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.#items[Symbol.iterator]();
  }
}
