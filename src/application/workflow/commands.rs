//! Workflow application commands

use crate::domain::workflow::entities::WorkflowId;

#[derive(Debug, Clone)]
pub struct CreateWorkflowCommand {
    pub name: String,
}

#[derive(Debug, Clone)]
pub struct ExecuteWorkflowCommand {
    pub workflow_id: WorkflowId,
}