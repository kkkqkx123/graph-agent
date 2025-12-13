//! State snapshots errors

use thiserror::Error;

#[derive(Debug, Error)]
pub enum SnapshotError {
    #[error("Snapshot creation failed: {0}")]
    CreationError(String),
    
    #[error("Snapshot retrieval failed: {0}")]
    RetrievalError(String),
    
    #[error("Snapshot expired")]
    SnapshotExpired,
}
