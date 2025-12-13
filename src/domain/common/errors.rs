//! Common domain errors

use thiserror::Error;

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
}