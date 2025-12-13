//! State history service

use std::sync::Arc;
use crate::domain::state::history::entities::{StateHistoryEntry, HistoryOperation, StateChange};
use crate::domain::state::entities::{State, StateId};

/// State history service
pub struct HistoryService {
    history_repository: Arc<dyn HistoryRepository>,
    state_repository: Arc<dyn StateRepository>,
}

/// History repository trait
pub trait HistoryRepository: Send + Sync {
    fn save_entry(&self, entry: &StateHistoryEntry) -> Result<(), HistoryRepositoryError>;
    fn find_entries_by_state_id(&self, state_id: &StateId) -> Result<Vec<StateHistoryEntry>, HistoryRepositoryError>;
    fn find_entry_by_id(&self, entry_id: &str) -> Result<Option<StateHistoryEntry>, HistoryRepositoryError>;
    fn delete_entry(&self, entry_id: &str) -> Result<(), HistoryRepositoryError>;
}

/// State repository trait
pub trait StateRepository: Send + Sync {
    fn find_by_id(&self, state_id: &StateId) -> Result<Option<State>, StateRepositoryError>;
    fn save(&self, state: &State) -> Result<(), StateRepositoryError>;
}

/// History repository error
#[derive(Debug, thiserror::Error)]
pub enum HistoryRepositoryError {
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Entry not found: {0}")]
    EntryNotFound(String),
    #[error("Invalid entry data: {0}")]
    InvalidEntryData(String),
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

impl HistoryService {
    /// Create a new history service
    pub fn new(
        history_repository: Arc<dyn HistoryRepository>,
        state_repository: Arc<dyn StateRepository>,
    ) -> Self {
        Self {
            history_repository,
            state_repository,
        }
    }

    /// Record a state change
    pub async fn record_change(
        &self,
        state_id: StateId,
        operation: HistoryOperation,
        user_id: Option<String>,
        changes: Vec<StateChange>,
    ) -> Result<String, HistoryServiceError> {
        // Verify state exists
        let state = self.state_repository
            .find_by_id(&state_id)
            .map_err(|e| HistoryServiceError::StateRepositoryError(e.to_string()))?;
        
        if state.is_none() {
            return Err(HistoryServiceError::StateNotFound(state_id.0.to_string()));
        }

        // Create history entry
        let entry = StateHistoryEntry::new(state_id, operation, user_id, changes);
        
        // Save entry
        self.history_repository
            .save_entry(&entry)
            .map_err(|e| HistoryServiceError::HistoryRepositoryError(e.to_string()))?;

        Ok(entry.id.0.to_string())
    }

    /// Get history for a specific state
    pub async fn get_history(
        &self,
        state_id: StateId,
    ) -> Result<Vec<StateHistoryEntry>, HistoryServiceError> {
        self.history_repository
            .find_entries_by_state_id(&state_id)
            .map_err(|e| HistoryServiceError::HistoryRepositoryError(e.to_string()))
    }

    /// Get specific history entry
    pub async fn get_entry(
        &self,
        entry_id: &str,
    ) -> Result<Option<StateHistoryEntry>, HistoryServiceError> {
        self.history_repository
            .find_entry_by_id(entry_id)
            .map_err(|e| HistoryServiceError::HistoryRepositoryError(e.to_string()))
    }

    /// Delete history entry
    pub async fn delete_entry(
        &self,
        entry_id: &str,
    ) -> Result<(), HistoryServiceError> {
        self.history_repository
            .delete_entry(entry_id)
            .map_err(|e| HistoryServiceError::HistoryRepositoryError(e.to_string()))
    }

    /// Get creation history for a state
    pub async fn get_creation_history(
        &self,
        state_id: StateId,
    ) -> Result<Option<StateHistoryEntry>, HistoryServiceError> {
        let entries = self.get_history(state_id).await?;
        
        let creation_entry = entries
            .into_iter()
            .find(|entry| entry.is_creation());

        Ok(creation_entry)
    }

    /// Get recent updates for a state
    pub async fn get_recent_updates(
        &self,
        state_id: StateId,
        limit: usize,
    ) -> Result<Vec<StateHistoryEntry>, HistoryServiceError> {
        let mut entries = self.get_history(state_id).await?;
        
        // Filter update operations and sort by timestamp (newest first)
        entries.retain(|entry| entry.is_update());
        entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        
        // Take the most recent entries
        if entries.len() > limit {
            entries.truncate(limit);
        }

        Ok(entries)
    }
}

/// History service error
#[derive(Debug, thiserror::Error)]
pub enum HistoryServiceError {
    #[error("History repository error: {0}")]
    HistoryRepositoryError(String),
    #[error("State repository error: {0}")]
    StateRepositoryError(String),
    #[error("State not found: {0}")]
    StateNotFound(String),
    #[error("Invalid operation: {0}")]
    InvalidOperation(String),
}