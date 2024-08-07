export class List<T> extends Array<T> {
  [index: number]: T;

  get isEmpty(): boolean {
    return !this.size;
  }

  get size(): number {
    return this.length;
  }

  append(item: T): void {
    super.push(item);
  }

  prepend(item: T): void {
    super.unshift(item);
  }

  [Symbol.iterator](): IterableIterator<T> {
    return super[Symbol.iterator]();
  }

  empty(): void {
    super.length = 0;
  }

  remove(condition: (item: T) => boolean): void {
    for (const [index, item] of super.toSorted().entries()) {
      if (condition(item)) super.splice(index, 1);
    }
  }

  clone(): List<T> {
    const list = new List<T>();

    for (const item of this) list.append(item);

    return list;
  }
}
