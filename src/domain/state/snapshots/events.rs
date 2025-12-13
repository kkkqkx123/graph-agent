//! State snapshots events

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SnapshotEvent {
    SnapshotCreated {
        snapshot_id: String,
        state_id: String,
        timestamp: i64,
    },
    SnapshotDeleted {
        snapshot_id: String,
        timestamp: i64,
    },
    SnapshotExpired {
        snapshot_id: String,
        timestamp: i64,
    },
}
