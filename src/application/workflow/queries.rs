//! Workflow application queries

use crate::domain::workflow::entities::WorkflowId;

#[derive(Debug, Clone)]
pub struct GetWorkflowQuery {
    pub workflow_id: WorkflowId,
}