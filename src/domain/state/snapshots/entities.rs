//! State snapshots domain entities

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::domain::state::entities::StateId;
use crate::domain::common::timestamp::Timestamp;

/// State snapshot ID
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct StateSnapshotId(pub Uuid);

/// Snapshot metadata
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SnapshotMetadata {
    pub name: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub size_bytes: u64,
}

impl SnapshotMetadata {
    /// Create new snapshot metadata
    pub fn new(name: String, description: Option<String>, tags: Vec<String>, size_bytes: u64) -> Self {
        Self {
            name,
            description,
            tags,
            size_bytes,
        }
    }

    /// Check if snapshot has specific tag
    pub fn has_tag(&self, tag: &str) -> bool {
        self.tags.iter().any(|t| t == tag)
    }

    /// Add tag to snapshot
    pub fn add_tag(&mut self, tag: String) {
        if !self.has_tag(&tag) {
            self.tags.push(tag);
        }
    }

    /// Remove tag from snapshot
    pub fn remove_tag(&mut self, tag: &str) {
        self.tags.retain(|t| t != tag);
    }
}

/// State snapshot entity
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct StateSnapshot {
    pub id: StateSnapshotId,
    pub state_id: StateId,
    pub snapshot_data: serde_json::Value,
    pub created_at: Timestamp,
    pub expires_at: Option<Timestamp>,
    pub metadata: SnapshotMetadata,
}

impl StateSnapshot {
    /// Create a new state snapshot
    pub fn new(
        state_id: StateId,
        snapshot_data: serde_json::Value,
        metadata: SnapshotMetadata,
        expires_at: Option<Timestamp>,
    ) -> Self {
        Self {
            id: StateSnapshotId(Uuid::new_v4()),
            state_id,
            snapshot_data,
            created_at: Timestamp::now(),
            expires_at,
            metadata,
        }
    }

    /// Check if snapshot is expired
    pub fn is_expired(&self) -> bool {
        match &self.expires_at {
            Some(expires_at) => Timestamp::now() > *expires_at,
            None => false,
        }
    }

    /// Check if snapshot will expire within given duration
    pub fn will_expire_within(&self, duration: std::time::Duration) -> bool {
        match &self.expires_at {
            Some(expires_at) => {
                let now = Timestamp::now();
                let expiration_threshold = now + duration;
                *expires_at <= expiration_threshold
            }
            None => false,
        }
    }

    /// Get snapshot size in bytes
    pub fn size_bytes(&self) -> u64 {
        self.metadata.size_bytes
    }

    /// Get snapshot name
    pub fn name(&self) -> &str {
        &self.metadata.name
    }

    /// Get snapshot description
    pub fn description(&self) -> Option<&str> {
        self.metadata.description.as_deref()
    }

    /// Get snapshot tags
    pub fn tags(&self) -> &[String] {
        &self.metadata.tags
    }
}