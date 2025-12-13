//! State history errors

use thiserror::Error;

#[derive(Debug, Error)]
pub enum StateHistoryError {
    #[error("History retrieval failed: {0}")]
    RetrievalError(String),
    
    #[error("History query failed: {0}")]
    QueryError(String),
}
