//! # Modular Agent Framework
//!
//! A Rust-based multi-agent system built on Graph Workflow.

pub mod domain;
pub mod application;
pub mod infrastructure;
pub mod interfaces;

// Re-export common types
pub use domain::*;
pub use application::*;
pub use infrastructure::*;
pub use interfaces::*;