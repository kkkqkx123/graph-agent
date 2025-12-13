//! Workflow application module

pub mod service;
pub mod commands;
pub mod queries;
pub mod dto;
pub mod composition;
pub mod coordination;
pub mod management;

// Re-export public types
pub use service::*;
pub use commands::*;
pub use queries::*;
pub use dto::*;
pub use composition::*;
pub use coordination::*;
pub use management::*;