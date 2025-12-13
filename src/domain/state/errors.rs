//! State domain errors

use thiserror::Error;

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("State not found: {0:?}")]
    StateNotFound(crate::domain::state::entities::StateId),
}