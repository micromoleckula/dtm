/**
 * Factory and reset contract for pooled objects.
 */
export interface IPoolable {
  reset(): void;
}

/**
 * Generic high-performance object pool for zero-allocation simulation loops.
 */
export class ObjectPool<T extends IPoolable> {
  private readonly pool: T[] = [];
  private readonly factory: () => T;
  private readonly initialSize: number;

  /**
   * @param factory Factory function to construct new instances when pool is exhausted.
   * @param initialSize Initial number of pre-warmed instances.
   */
  constructor(factory: () => T, initialSize = 32) {
    this.factory = factory;
    this.initialSize = initialSize;
    this.warm(this.initialSize);
  }

  private warm(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * Acquires a recycled instance from the pool, or creates one if empty.
   */
  public acquire(): T {
    let item = this.pool.pop();
    if (!item) {
      item = this.factory();
    }
    item.reset();
    return item;
  }

  /**
   * Returns an object to the pool for reuse.
   */
  public release(item: T): void {
    item.reset();
    this.pool.push(item);
  }

  /**
   * Releases an array of items back into the pool.
   */
  public releaseAll(items: T[]): void {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      item.reset();
      this.pool.push(item);
    }
    items.length = 0;
  }

  /**
   * Number of available pooled instances currently idle.
   */
  public get available(): number {
    return this.pool.length;
  }
}
