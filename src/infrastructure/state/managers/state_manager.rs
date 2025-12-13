//! State manager implementation

use std::sync::Arc;
use crate::domain::state::entities::{State, StateId};

/// State manager
pub struct StateManager {
    state_repository: Arc<dyn StateRepository>,
    cache_adapter: Arc<dyn CacheAdapter>,
    serializer: Arc<dyn StateSerializer>,
}

/// State repository trait
pub trait StateRepository: Send + Sync {
    fn save(&self, state: &State) -> Result<(), StateRepositoryError>;
    fn find_by_id(&self, state_id: &StateId) -> Result<Option<State>, StateRepositoryError>;
    fn delete(&self, state_id: &StateId) -> Result<(), StateRepositoryError>;
}

/// Cache adapter trait
pub trait CacheAdapter: Send + Sync {
    fn get(&self, key: &str) -> Result<Option<Vec<u8>>, CacheError>;
    fn set(&self, key: &str, value: &[u8], ttl: Option<std::time::Duration>) -> Result<(), CacheError>;
    fn delete(&self, key: &str) -> Result<(), CacheError>;
}

/// State serializer trait
pub trait StateSerializer: Send + Sync {
    fn serialize(&self, state: &State) -> Result<Vec<u8>, SerializationError>;
    fn deserialize(&self, data: &[u8]) -> Result<State, SerializationError>;
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

/// Cache error
#[derive(Debug, thiserror::Error)]
pub enum CacheError {
    #[error("Cache connection error: {0}")]
    ConnectionError(String),
    #[error("Cache operation error: {0}")]
    OperationError(String),
    #[error("Cache serialization error: {0}")]
    SerializationError(String),
}

/// Serialization error
#[derive(Debug, thiserror::Error)]
pub enum SerializationError {
    #[error("Serialization error: {0}")]
    SerializationError(String),
    #[error("Deserialization error: {0}")]
    DeserializationError(String),
}

impl StateManager {
    /// Create a new state manager
    pub fn new(
        state_repository: Arc<dyn StateRepository>,
        cache_adapter: Arc<dyn CacheAdapter>,
        serializer: Arc<dyn StateSerializer>,
    ) -> Self {
        Self {
            state_repository,
            cache_adapter,
            serializer,
        }
    }

    /// Save state with caching
    pub async fn save_state(&self, state: &State) -> Result<(), StateManagerError> {
        // Save to database
        self.state_repository
            .save(state)
            .map_err(|e| StateManagerError::RepositoryError(e.to_string()))?;

        // Cache the state
        let cache_key = format!("state:{}", state.id.0);
        let serialized_state = self.serializer
            .serialize(state)
            .map_err(|e| StateManagerError::SerializationError(e.to_string()))?;

        self.cache_adapter
            .set(&cache_key, &serialized_state, Some(std::time::Duration::from_secs(3600)))
            .map_err(|e| StateManagerError::CacheError(e.to_string()))?;

        Ok(())
    }

    /// Load state with cache fallback
    pub async fn load_state(&self, state_id: StateId) -> Result<Option<State>, StateManagerError> {
        let cache_key = format!("state:{}", state_id.0);

        // Try to load from cache first
        if let Some(cached_data) = self.cache_adapter
            .get(&cache_key)
            .map_err(|e| StateManagerError::CacheError(e.to_string()))? 
        {
            let state = self.serializer
                .deserialize(&cached_data)
                .map_err(|e| StateManagerError::SerializationError(e.to_string()))?;
            return Ok(Some(state));
        }

        // If not in cache, load from database
        let state = self.state_repository
            .find_by_id(&state_id)
            .map_err(|e| StateManagerError::RepositoryError(e.to_string()))?;

        // If found in database, cache it
        if let Some(ref state) = state {
            let serialized_state = self.serializer
                .serialize(state)
                .map_err(|e| StateManagerError::SerializationError(e.to_string()))?;

            self.cache_adapter
                .set(&cache_key, &serialized_state, Some(std::time::Duration::from_secs(3600)))
                .map_err(|e| StateManagerError::CacheError(e.to_string()))?;
        }

        Ok(state)
    }

    /// Delete state and clear cache
    pub async fn delete_state(&self, state_id: StateId) -> Result<(), StateManagerError> {
        // Delete from database
        self.state_repository
            .delete(&state_id)
            .map_err(|e| StateManagerError::RepositoryError(e.to_string()))?;

        // Clear from cache
        let cache_key = format!("state:{}", state_id.0);
        self.cache_adapter
            .delete(&cache_key)
            .map_err(|e| StateManagerError::CacheError(e.to_string()))?;

        Ok(())
    }

    /// Update state with cache invalidation
    pub async fn update_state(
        &self,
        state_id: StateId,
        new_data: serde_json::Value,
    ) -> Result<State, StateManagerError> {
        // Load existing state
        let mut state = self.load_state(state_id.clone())
            .await?
            .ok_or_else(|| StateManagerError::StateNotFound(state_id.0.to_string()))?;

        // Update state data
        state.data = new_data;

        // Save updated state
        self.save_state(&state).await?;

        Ok(state)
    }

    /// Bulk save states
    pub async fn save_states(&self, states: &[State]) -> Result<(), StateManagerError> {
        for state in states {
            self.save_state(state).await?;
        }
        Ok(())
    }

    /// Bulk load states
    pub async fn load_states(&self, state_ids: &[StateId]) -> Result<Vec<State>, StateManagerError> {
        let mut states = Vec::new();
        
        for state_id in state_ids {
            if let Some(state) = self.load_state(state_id.clone()).await? {
                states.push(state);
            }
        }

        Ok(states)
    }

    /// Clear cache for a specific state
    pub async fn clear_cache(&self, state_id: StateId) -> Result<(), StateManagerError> {
        let cache_key = format!("state:{}", state_id.0);
        self.cache_adapter
            .delete(&cache_key)
            .map_err(|e| StateManagerError::CacheError(e.to_string()))
    }

    /// Clear all state caches
    pub async fn clear_all_caches(&self) -> Result<(), StateManagerError> {
        // This would typically require a more sophisticated cache implementation
        // For now, we'll just log that this operation is not fully implemented
        eprintln!("clear_all_caches: This operation requires cache-specific implementation");
        Ok(())
    }
}

/// State manager error
#[derive(Debug, thiserror::Error)]
pub enum StateManagerError {
    #[error("Repository error: {0}")]
    RepositoryError(String),
    #[error("Cache error: {0}")]
    CacheError(String),
    #[error("Serialization error: {0}")]
    SerializationError(String),
    #[error("State not found: {0}")]
    StateNotFound(String),
    #[error("Invalid operation: {0}")]
    InvalidOperation(String),
}