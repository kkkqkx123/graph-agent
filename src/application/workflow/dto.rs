//! Workflow application DTOs

use serde::{Deserialize, Serialize};
use crate::domain::workflow::entities::WorkflowId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDto {
    pub id: WorkflowId,
    pub name: String,
}