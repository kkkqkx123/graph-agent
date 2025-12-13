//! Workflow domain errors

use thiserror::Error;

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("Workflow not found: {0:?}")]
    WorkflowNotFound(crate::domain::workflow::entities::WorkflowId),

    #[error("Invalid workflow structure: {0}")]
    InvalidStructure(String),
}
