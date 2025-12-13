//! State factory errors

use thiserror::Error;

#[derive(Debug, Error)]
pub enum FactoryError {
    #[error("Factory operation failed: {0}")]
    OperationError(String),
    
    #[error("Invalid configuration: {0}")]
    InvalidConfiguration(String),
}
