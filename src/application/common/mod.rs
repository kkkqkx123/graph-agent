//! Common application module

pub mod command_handler;
pub mod query_handler;
pub mod errors;

// Re-export public types
pub use command_handler::*;
pub use query_handler::*;
pub use errors::*;