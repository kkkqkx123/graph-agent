//! State infrastructure module

pub mod cache;
pub mod factories;
pub mod managers;

// Re-export public types
pub use cache::{RedisCacheAdapter, MemoryCacheAdapter, CacheStats, CacheError};
pub use factories::state_factory::*;
pub use managers::{StateManager, StateManagerError, CacheAdapter};
