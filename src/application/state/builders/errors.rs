//! State builder errors

use thiserror::Error;

#[derive(Debug, Error)]
pub enum StateBuilderError {
    #[error("State creation failed: {0}")]
    CreationError(String),
    
    #[error("State validation failed: {0}")]
    ValidationError(String),
}
