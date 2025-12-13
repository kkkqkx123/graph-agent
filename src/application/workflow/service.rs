//! Workflow application service

use crate::domain::workflow::*;

pub struct WorkflowService;

impl WorkflowService {
    pub fn new() -> Self {
        Self
    }
    
    pub async fn create_workflow(&self, name: String) -> Result<Workflow, ServiceError> {
        let workflow = Workflow::new(name);
        Ok(workflow)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ServiceError {
    #[error("Domain error: {0}")]
    DomainError(#[from] crate::domain::workflow::errors::DomainError),
}