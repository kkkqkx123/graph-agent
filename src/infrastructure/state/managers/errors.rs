//! State manager errors

use thiserror::Error;

#[derive(Debug, Error)]
pub enum StateManagerError {
    #[error("Manager operation failed: {0}")]
    OperationError(String),
}
