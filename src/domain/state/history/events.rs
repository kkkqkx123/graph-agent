//! State history events

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StateHistoryEvent {
    StateCreated {
        state_id: String,
        timestamp: i64,
    },
    StateUpdated {
        state_id: String,
        timestamp: i64,
        changes: serde_json::Value,
    },
    StateDeleted {
        state_id: String,
        timestamp: i64,
    },
}
