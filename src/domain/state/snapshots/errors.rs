//! State snapshots errors

use thiserror::Error;

#[derive(Debug, Error)]
pub enum SnapshotError {
    #[error("Snapshot not found")]
    SnapshotNotFound,
    
    #[error("Snapshot expired")]
    SnapshotExpired,
}
