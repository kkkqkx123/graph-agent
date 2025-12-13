//! LLM domain events

use serde::{Deserialize, Serialize};
use crate::domain::llm::entities::RequestId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMRequestCompletedEvent {
    pub request_id: RequestId,
}