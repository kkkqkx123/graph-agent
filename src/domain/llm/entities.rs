//! LLM domain entities

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct RequestId(pub Uuid);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMRequest {
    pub id: RequestId,
    pub model: String,
    pub messages: Vec<LLMMessage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMMessage {
    pub role: String,
    pub content: String,
}