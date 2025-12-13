//! Common domain module

pub mod id;
pub mod timestamp;
pub mod errors;

// Re-export public types
pub use id::*;
pub use timestamp::*;
pub use errors::*;