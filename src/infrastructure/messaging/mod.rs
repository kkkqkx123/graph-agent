//! Messaging infrastructure module

pub mod event_bus;
pub mod handlers;
pub mod in_memory;

// Re-export public types
pub use event_bus::*;
pub use handlers::*;
pub use in_memory::*;