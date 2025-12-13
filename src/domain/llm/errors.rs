//! LLM domain errors

use thiserror::Error;

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("LLM request failed: {0}")]
    RequestFailed(String),
}