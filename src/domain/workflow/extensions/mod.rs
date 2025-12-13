//! Workflow extensions module

pub mod hooks;
pub mod plugins;
pub mod triggers;

// Re-export specific types to avoid ambiguity
pub use hooks::*;
pub use plugins::*;
pub use triggers::*;