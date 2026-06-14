/**
 * Registry Utilities
 *
 * Provides factory functions for creating type-safe in-memory registries.
 * Uses composition over inheritance for better flexibility and simplicity.
 */

/**
 * Common registry interface for read operations.
 */
export interface Registry<T> {
  /** Get an item by key */
  get(key: string): T | undefined;
  /** Check if an item exists */
  has(key: string): boolean;
  /** List all items */
  list(): T[];
  /** Get all keys */
  keys(): string[];
  /** Get the number of items */
  readonly size: number;
  /** Clear all items */
  clear(): void;
}

/**
 * Mutable registry interface for write operations.
 */
export interface MutableRegistry<T> extends Registry<T> {
  /** Set an item by key */
  set(key: string, value: T): void;
  /** Delete an item by key, returns true if deleted */
  delete(key: string): boolean;
}

/**
 * Creates a new mutable registry with the specified initial items.
 *
 * @param initialItems Optional array of [key, value] pairs to initialize with
 * @returns A new MutableRegistry instance
 *
 * @example
 * ```typescript
 * const registry = createRegistry<string>();
 * registry.set('key1', 'value1');
 * console.log(registry.get('key1')); // 'value1'
 * console.log(registry.has('key1')); // true
 * console.log(registry.list()); // ['value1']
 * ```
 */
export function createRegistry<T>(initialItems?: Iterable<[string, T]>): MutableRegistry<T> {
  const items = new Map<string, T>(initialItems);

  return {
    get: (key: string) => items.get(key),
    has: (key: string) => items.has(key),
    list: () => Array.from(items.values()),
    keys: () => Array.from(items.keys()),
    get size() {
      return items.size;
    },
    clear: () => items.clear(),
    set: (key: string, value: T) => items.set(key, value),
    delete: (key: string) => items.delete(key),
  };
}
