//! State history errors

use thiserror::Error;

#[derive(Debug, Error)]
pub enum StateHistoryError {
    #[error("History entry not found")]
    EntryNotFound,
    
    #[error("Invalid version: {0}")]
    InvalidVersion(String),
}
