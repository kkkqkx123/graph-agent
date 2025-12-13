//! Workflow domain events

use serde::{Deserialize, Serialize};
use crate::domain::workflow::entities::WorkflowId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowCreatedEvent {
    pub workflow_id: WorkflowId,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowExecutionStartedEvent {
    pub workflow_id: WorkflowId,
}