//! State builder service

use std::sync::Arc;
use crate::domain::state::entities::State;
use crate::domain::state::entities::StateId;
use crate::domain::state::value_objects::StateType;

/// State builder service
pub struct StateBuilderService {
    state_factory: Arc<dyn StateFactory>,
    validation_service: Arc<dyn StateValidationService>,
}

/// State factory trait
pub trait StateFactory: Send + Sync {
    fn create_state(&self, state_type: StateType, initial_data: serde_json::Value) -> Result<State, StateCreationError>;
}

/// State validation service trait
pub trait StateValidationService: Send + Sync {
    fn validate_state_data(&self, state_type: StateType, data: &serde_json::Value) -> Result<(), StateValidationError>;
}

/// State creation error
#[derive(Debug, thiserror::Error)]
pub enum StateCreationError {
    #[error("State validation failed: {0}")]
    ValidationError(String),
    #[error("State factory error: {0}")]
    FactoryError(String),
    #[error("Invalid state type: {0}")]
    InvalidStateType(String),
}

/// State validation error
#[derive(Debug, thiserror::Error)]
pub enum StateValidationError {
    #[error("Invalid state data: {0}")]
    InvalidData(String),
    #[error("Missing required field: {0}")]
    MissingField(String),
    #[error("Field type mismatch: {0}")]
    FieldTypeMismatch(String),
}

impl StateBuilderService {
    /// Create a new state builder service
    pub fn new(
        state_factory: Arc<dyn StateFactory>,
        validation_service: Arc<dyn StateValidationService>,
    ) -> Self {
        Self {
            state_factory,
            validation_service,
        }
    }

    /// Build workflow state
    pub async fn build_workflow_state(
        &self,
        workflow_id: String,
        initial_data: serde_json::Value,
    ) -> Result<State, StateCreationError> {
        // Validate workflow state data
        self.validation_service
            .validate_state_data(StateType::Workflow, &initial_data)
            .map_err(|e| StateCreationError::ValidationError(e.to_string()))?;

        // Create workflow state
        self.state_factory
            .create_state(StateType::Workflow, initial_data)
            .map_err(|e| StateCreationError::FactoryError(e.to_string()))
    }

    /// Build session state
    pub async fn build_session_state(
        &self,
        session_id: String,
        initial_data: serde_json::Value,
    ) -> Result<State, StateCreationError> {
        // Validate session state data
        self.validation_service
            .validate_state_data(StateType::Session, &initial_data)
            .map_err(|e| StateCreationError::ValidationError(e.to_string()))?;

        // Create session state
        self.state_factory
            .create_state(StateType::Session, initial_data)
            .map_err(|e| StateCreationError::FactoryError(e.to_string()))
    }

    /// Build thread state
    pub async fn build_thread_state(
        &self,
        thread_id: String,
        initial_data: serde_json::Value,
    ) -> Result<State, StateCreationError> {
        // Validate thread state data
        self.validation_service
            .validate_state_data(StateType::Thread, &initial_data)
            .map_err(|e| StateCreationError::ValidationError(e.to_string()))?;

        // Create thread state
        self.state_factory
            .create_state(StateType::Thread, initial_data)
            .map_err(|e| StateCreationError::FactoryError(e.to_string()))
    }

    /// Build tool state
    pub async fn build_tool_state(
        &self,
        tool_id: String,
        initial_data: serde_json::Value,
    ) -> Result<State, StateCreationError> {
        // Validate tool state data
        self.validation_service
            .validate_state_data(StateType::Tool, &initial_data)
            .map_err(|e| StateCreationError::ValidationError(e.to_string()))?;

        // Create tool state
        self.state_factory
            .create_state(StateType::Tool, initial_data)
            .map_err(|e| StateCreationError::FactoryError(e.to_string()))
    }
}