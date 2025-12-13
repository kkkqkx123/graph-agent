//! State history domain entities

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::domain::state::entities::StateId;
use crate::domain::common::timestamp::Timestamp;

/// State history entry ID
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct StateHistoryEntryId(pub Uuid);

/// History operation type
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum HistoryOperation {
    Create,
    Update,
    Delete,
    Restore,
}

/// State change record
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct StateChange {
    pub field_path: String,
    pub old_value: Option<serde_json::Value>,
    pub new_value: Option<serde_json::Value>,
}

/// State history entry entity
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct StateHistoryEntry {
    pub id: StateHistoryEntryId,
    pub state_id: StateId,
    pub operation: HistoryOperation,
    pub timestamp: Timestamp,
    pub user_id: Option<String>,
    pub changes: Vec<StateChange>,
}

impl StateHistoryEntry {
    /// Create a new state history entry
    pub fn new(
        state_id: StateId,
        operation: HistoryOperation,
        user_id: Option<String>,
        changes: Vec<StateChange>,
    ) -> Self {
        Self {
            id: StateHistoryEntryId(Uuid::new_v4()),
            state_id,
            operation,
            timestamp: Timestamp::now(),
            user_id,
            changes,
        }
    }

    /// Check if this entry represents a creation operation
    pub fn is_creation(&self) -> bool {
        matches!(self.operation, HistoryOperation::Create)
    }

    /// Check if this entry represents an update operation
    pub fn is_update(&self) -> bool {
        matches!(self.operation, HistoryOperation::Update)
    }

    /// Check if this entry represents a deletion operation
    pub fn is_deletion(&self) -> bool {
        matches!(self.operation, HistoryOperation::Delete)
    }

    /// Check if this entry represents a restore operation
    pub fn is_restore(&self) -> bool {
        matches!(self.operation, HistoryOperation::Restore)
    }
}