//! State managers infrastructure module

pub mod state_manager;
pub mod errors;

// Re-export public types
pub use state_manager::{StateManager, StateManagerError, CacheAdapter, CacheError};
pub use errors::*;