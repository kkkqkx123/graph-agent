//! # Modular Agent Framework
//!
//! A Rust-based multi-agent system built on Graph Workflow.

pub mod domain;
pub mod application;
pub mod infrastructure;
pub mod interfaces;

// Re-export domain types as the primary API
pub use domain::*;

// Re-export specific application services
pub use application::workflow::service::WorkflowService;

// Re-export specific infrastructure components
pub use infrastructure::database::connection::DatabaseManager;
pub use infrastructure::llm::clients::LLMClient;

// Re-export specific interface handlers
pub use interfaces::http::handlers::health_check;