/** An ordered set is a list with the additional semantic that it must not contain the same item twice.
 *
 * [Infra Living Standard](https://infra.spec.whatwg.org/#ordered-set)
 */
export class OrderedSet<T> {
  #set: Set<T> = new Set();

  /** Add item to end of set if the {@linkcode item} does not exist. O(1)
   *
   * [Infra Living Standard](https://infra.spec.whatwg.org/#set-append)
   */
  append(item: T): void {
    this.#set.add(item);
  }

  /** Return shallow copied list. O(n)
   *
   * [Infra Living Standard](https://infra.spec.whatwg.org/#list-clone)
   */
  clone(): OrderedSet<T> {
    const set = new OrderedSet<T>();

    for (const item of this.#set) set.append(item);

    return set;
  }

  /** To be empty list. O(n)
   *
   * [Infra Living Standard](https://infra.spec.whatwg.org/#list-empty)
   */
  empty(): void {
    this.#set.clear();
  }

  /** Return list size. O(1)
   *
   * [Infra Living Standard](https://infra.spec.whatwg.org/#list-size)
   */
  get size(): number {
    return this.#set.size;
  }

  /**
   * [Infra Living Standard](https://infra.spec.whatwg.org/#list-is-empty)
   */
  get isEmpty(): boolean {
    return !this.#set.size;
  }

  /**
   * [Infra Living Standard](https://infra.spec.whatwg.org/#list-iterate)
   */
  [Symbol.iterator](): IterableIterator<T> {
    return this.#set[Symbol.iterator]();
  }
}
