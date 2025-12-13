//! State snapshots service

use std::sync::Arc;
use crate::domain::state::snapshots::entities::{StateSnapshot, StateSnapshotId, SnapshotMetadata};
use crate::domain::state::entities::{State, StateId};

/// State snapshot service
pub struct SnapshotService {
    snapshot_repository: Arc<dyn SnapshotRepository>,
    state_repository: Arc<dyn StateRepository>,
}

/// Snapshot repository trait
pub trait SnapshotRepository: Send + Sync {
    fn save_snapshot(&self, snapshot: &StateSnapshot) -> Result<(), SnapshotRepositoryError>;
    fn find_snapshot_by_id(&self, snapshot_id: &StateSnapshotId) -> Result<Option<StateSnapshot>, SnapshotRepositoryError>;
    fn find_snapshots_by_state_id(&self, state_id: &StateId) -> Result<Vec<StateSnapshot>, SnapshotRepositoryError>;
    fn delete_snapshot(&self, snapshot_id: &StateSnapshotId) -> Result<(), SnapshotRepositoryError>;
    fn find_expired_snapshots(&self) -> Result<Vec<StateSnapshot>, SnapshotRepositoryError>;
}

/// State repository trait
pub trait StateRepository: Send + Sync {
    fn find_by_id(&self, state_id: &StateId) -> Result<Option<State>, StateRepositoryError>;
    fn save(&self, state: &State) -> Result<(), StateRepositoryError>;
}

/// Snapshot repository error
#[derive(Debug, thiserror::Error)]
pub enum SnapshotRepositoryError {
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Snapshot not found: {0}")]
    SnapshotNotFound(String),
    #[error("Invalid snapshot data: {0}")]
    InvalidSnapshotData(String),
}

/// State repository error
#[derive(Debug, thiserror::Error)]
pub enum StateRepositoryError {
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("State not found: {0}")]
    StateNotFound(String),
    #[error("Invalid state data: {0}")]
    InvalidStateData(String),
}

impl SnapshotService {
    /// Create a new snapshot service
    pub fn new(
        snapshot_repository: Arc<dyn SnapshotRepository>,
        state_repository: Arc<dyn StateRepository>,
    ) -> Self {
        Self {
            snapshot_repository,
            state_repository,
        }
    }

    /// Create a snapshot for a state
    pub async fn create_snapshot(
        &self,
        state_id: StateId,
        name: String,
        description: Option<String>,
        tags: Vec<String>,
        expires_at: Option<crate::domain::common::timestamp::Timestamp>,
    ) -> Result<StateSnapshotId, SnapshotServiceError> {
        // Get the current state
        let state = self.state_repository
            .find_by_id(&state_id)
            .map_err(|e| SnapshotServiceError::StateRepositoryError(e.to_string()))?;
        
        let state = state.ok_or_else(|| SnapshotServiceError::StateNotFound(state_id.0.to_string()))?;

        // Calculate snapshot size
        let size_bytes = serde_json::to_vec(&state.data)
            .map_err(|e| SnapshotServiceError::SerializationError(e.to_string()))?
            .len() as u64;

        // Create snapshot metadata
        let metadata = SnapshotMetadata::new(name, description, tags, size_bytes);

        // Create snapshot
        let snapshot = StateSnapshot::new(
            state_id,
            state.data.clone(),
            metadata,
            expires_at,
        );

        // Save snapshot
        self.snapshot_repository
            .save_snapshot(&snapshot)
            .map_err(|e| SnapshotServiceError::SnapshotRepositoryError(e.to_string()))?;

        Ok(snapshot.id)
    }

    /// Restore state from a snapshot
    pub async fn restore_snapshot(
        &self,
        snapshot_id: StateSnapshotId,
    ) -> Result<StateId, SnapshotServiceError> {
        // Get the snapshot
        let snapshot = self.snapshot_repository
            .find_snapshot_by_id(&snapshot_id)
            .map_err(|e| SnapshotServiceError::SnapshotRepositoryError(e.to_string()))?;
        
        let snapshot = snapshot.ok_or_else(|| SnapshotServiceError::SnapshotNotFound(snapshot_id.0.to_string()))?;

        // Check if snapshot is expired
        if snapshot.is_expired() {
            return Err(SnapshotServiceError::SnapshotExpired(snapshot_id.0.to_string()));
        }

        // Create new state from snapshot data
        let restored_state = State {
            id: StateId(uuid::Uuid::new_v4()),
            data: snapshot.snapshot_data.clone(),
        };

        // Save the restored state
        self.state_repository
            .save(&restored_state)
            .map_err(|e| SnapshotServiceError::StateRepositoryError(e.to_string()))?;

        Ok(restored_state.id)
    }

    /// Get snapshot by ID
    pub async fn get_snapshot(
        &self,
        snapshot_id: StateSnapshotId,
    ) -> Result<Option<StateSnapshot>, SnapshotServiceError> {
        self.snapshot_repository
            .find_snapshot_by_id(&snapshot_id)
            .map_err(|e| SnapshotServiceError::SnapshotRepositoryError(e.to_string()))
    }

    /// Get all snapshots for a state
    pub async fn get_snapshots_by_state(
        &self,
        state_id: StateId,
    ) -> Result<Vec<StateSnapshot>, SnapshotServiceError> {
        self.snapshot_repository
            .find_snapshots_by_state_id(&state_id)
            .map_err(|e| SnapshotServiceError::SnapshotRepositoryError(e.to_string()))
    }

    /// Delete a snapshot
    pub async fn delete_snapshot(
        &self,
        snapshot_id: StateSnapshotId,
    ) -> Result<(), SnapshotServiceError> {
        self.snapshot_repository
            .delete_snapshot(&snapshot_id)
            .map_err(|e| SnapshotServiceError::SnapshotRepositoryError(e.to_string()))
    }

    /// Clean up expired snapshots
    pub async fn cleanup_expired_snapshots(&self) -> Result<usize, SnapshotServiceError> {
        let expired_snapshots = self.snapshot_repository
            .find_expired_snapshots()
            .map_err(|e| SnapshotServiceError::SnapshotRepositoryError(e.to_string()))?;

        let mut deleted_count = 0;
        for snapshot in &expired_snapshots {
            match self.snapshot_repository.delete_snapshot(&snapshot.id) {
                Ok(()) => deleted_count += 1,
                Err(e) => {
                    // Log error but continue with other snapshots
                    eprintln!("Failed to delete expired snapshot {}: {}", snapshot.id.0, e);
                }
            }
        }

        Ok(deleted_count)
    }

    /// Get snapshots by tag
    pub async fn get_snapshots_by_tag(
        &self,
        tag: &str,
    ) -> Result<Vec<StateSnapshot>, SnapshotServiceError> {
        // This would typically require a more sophisticated repository method
        // For now, we'll get all snapshots and filter by tag
        // In a real implementation, this should be handled at the repository level
        let all_snapshots = self.snapshot_repository
            .find_expired_snapshots()
            .map_err(|e| SnapshotServiceError::SnapshotRepositoryError(e.to_string()))?;

        let filtered_snapshots = all_snapshots
            .into_iter()
            .filter(|snapshot| snapshot.metadata.has_tag(tag))
            .collect();

        Ok(filtered_snapshots)
    }
}

/// Snapshot service error
#[derive(Debug, thiserror::Error)]
pub enum SnapshotServiceError {
    #[error("Snapshot repository error: {0}")]
    SnapshotRepositoryError(String),
    #[error("State repository error: {0}")]
    StateRepositoryError(String),
    #[error("State not found: {0}")]
    StateNotFound(String),
    #[error("Snapshot not found: {0}")]
    SnapshotNotFound(String),
    #[error("Snapshot expired: {0}")]
    SnapshotExpired(String),
    #[error("Serialization error: {0}")]
    SerializationError(String),
}