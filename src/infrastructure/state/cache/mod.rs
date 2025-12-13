//! State cache infrastructure module

pub mod redis_adapter;
pub mod memory_adapter;
pub mod errors;

// Re-export public types
pub use redis_adapter::{RedisCacheAdapter, RedisCacheError};
pub use memory_adapter::{MemoryCacheAdapter, MemoryCacheError, CacheStats};
pub use errors::*;