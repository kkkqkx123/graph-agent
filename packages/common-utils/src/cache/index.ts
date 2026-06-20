/**
 * Cache Module
 * High-performance caching solution using xxHash (WebAssembly)
 * 90-140x faster hashing than traditional algorithms
 */

export { CacheManager, createCache, createCacheSync } from './cache-manager.js';
export {
  XXHash32Algorithm,
  XXHash64Algorithm,
  StreamingXXHash64Algorithm,
  createHashAlgorithm,
} from './xxhash-algorithm.js';
export type { CacheEntry, CacheStats, CacheConfig, IHashAlgorithm, ICache } from './types.js';

