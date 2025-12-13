//! State history DTOs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateHistoryEntry {
    pub timestamp: i64,
    pub state_snapshot: serde_json::Value,
    pub change_description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateHistoryResponse {
    pub entries: Vec<StateHistoryEntry>,
    pub total_count: usize,
}
