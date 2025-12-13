//! Application errors

use thiserror::Error;

#[derive(Debug, Error)]
pub enum ServiceError {
    #[error("Service error: {0}")]
    Error(String),
}