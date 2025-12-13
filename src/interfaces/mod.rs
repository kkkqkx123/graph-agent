//! Interface layer - External interfaces and adapters

pub mod http;
pub mod grpc;
pub mod cli;

// Re-export specific interface types to avoid conflicts
pub use http::handlers::health_check;
pub use grpc::services::HealthService;
pub use cli::commands::Cli;