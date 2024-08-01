// deno-lint-ignore-file no-explicit-any

export interface AsynchronouslyIterable<
  T,
  C extends object = object,
  I = unknown,
> {
  init(instance: C, iterator: AsyncIterableIterator<T> & I): void;
  next(
    instance: C,
    iterator: AsyncIterableIterator<T> & I,
  ): Promise<IteratorResult<T>>;
}

interface PairAsynchronouslyIterableDeclaration<K, V> {
  keys(): AsyncIterableIterator<K>;
  entries(): AsyncIterableIterator<[K, V]>;
}

export interface ValueAsyncIterable<T> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
  values(): AsyncIterableIterator<T>;
}

export interface PairAsyncIterable<K, V>
  extends PairAsynchronouslyIterableDeclaration<K, V> {
  [Symbol.asyncIterator](): AsyncIterableIterator<[K, V]>;
  values(): AsyncIterableIterator<V>;
}

export function asynciterator<
  K,
  V,
  T extends new (...args: any) => any,
  I = unknown,
>(
  definition: AsynchronouslyIterable<[K, V], InstanceType<T>, I>,
): (target: T, context: ClassDecoratorContext) => void {
  return (target) => {
    return class extends target {
      [Symbol.asyncIterator]() {
        const _this = this as InstanceType<T>;

        const iterator = {
          next() {
            return definition.next(
              _this,
              this as AsyncIterableIterator<[K, V]> & I,
            );
          },
          [Symbol.asyncIterator]() {
            return this;
          },
        } satisfies AsyncIterableIterator<[K, V]> as
          & AsyncIterableIterator<[K, V]>
          & I;

        definition.init(this as InstanceType<T>, iterator);

        return iterator;
      }

      async *keys() {
        for await (const [key] of this[Symbol.asyncIterator]()) yield key;
      }

      async *values() {
        for await (const [_, value] of this[Symbol.asyncIterator]()) {
          yield value;
        }
      }

      entries() {
        return this[Symbol.asyncIterator];
      }
    };
  };
}
