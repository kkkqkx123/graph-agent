//! State factory implementation

use std::sync::Arc;
use crate::domain::state::entities::{State, StateId};
use crate::domain::state::value_objects::StateType;

/// State factory
pub struct StateFactory {
    builders: std::collections::HashMap<StateType, Arc<dyn StateBuilder>>,
}

/// State builder trait
pub trait StateBuilder: Send + Sync {
    fn build_state(&self, state_type: StateType, initial_data: serde_json::Value) -> Result<State, StateBuilderError>;
}

/// State builder error
#[derive(Debug, thiserror::Error)]
pub enum StateBuilderError {
    #[error("Invalid state type: {0}")]
    InvalidStateType(String),
    #[error("Invalid initial data: {0}")]
    InvalidInitialData(String),
    #[error("Builder error: {0}")]
    BuilderError(String),
}

impl StateFactory {
    /// Create a new state factory
    pub fn new() -> Self {
        Self {
            builders: std::collections::HashMap::new(),
        }
    }

    /// Register a state builder for a specific state type
    pub fn register_builder(&mut self, state_type: StateType, builder: Arc<dyn StateBuilder>) {
        self.builders.insert(state_type, builder);
    }

    /// Create a state
    pub fn create_state(
        &self,
        state_type: StateType,
        initial_data: serde_json::Value,
    ) -> Result<State, StateFactoryError> {
        let builder = self.builders
            .get(&state_type)
            .ok_or_else(|| StateFactoryError::BuilderNotFound(state_type.to_string()))?;

        builder
            .build_state(state_type, initial_data)
            .map_err(|e| StateFactoryError::BuilderError(e.to_string()))
    }

    /// Create a workflow state
    pub fn create_workflow_state(
        &self,
        workflow_id: String,
        initial_data: serde_json::Value,
    ) -> Result<State, StateFactoryError> {
        let mut data = initial_data;
        
        // Add workflow-specific metadata
        if let serde_json::Value::Object(ref mut map) = data {
            map.insert("workflow_id".to_string(), serde_json::Value::String(workflow_id));
            map.insert("state_type".to_string(), serde_json::Value::String("workflow".to_string()));
            map.insert("created_at".to_string(), serde_json::Value::String(
                chrono::Utc::now().to_rfc3339()
            ));
        }

        self.create_state(StateType::Workflow, data)
    }

    /// Create a session state
    pub fn create_session_state(
        &self,
        session_id: String,
        initial_data: serde_json::Value,
    ) -> Result<State, StateFactoryError> {
        let mut data = initial_data;
        
        // Add session-specific metadata
        if let serde_json::Value::Object(ref mut map) = data {
            map.insert("session_id".to_string(), serde_json::Value::String(session_id));
            map.insert("state_type".to_string(), serde_json::Value::String("session".to_string()));
            map.insert("created_at".to_string(), serde_json::Value::String(
                chrono::Utc::now().to_rfc3339()
            ));
        }

        self.create_state(StateType::Session, data)
    }

    /// Create a thread state
    pub fn create_thread_state(
        &self,
        thread_id: String,
        initial_data: serde_json::Value,
    ) -> Result<State, StateFactoryError> {
        let mut data = initial_data;
        
        // Add thread-specific metadata
        if let serde_json::Value::Object(ref mut map) = data {
            map.insert("thread_id".to_string(), serde_json::Value::String(thread_id));
            map.insert("state_type".to_string(), serde_json::Value::String("thread".to_string()));
            map.insert("created_at".to_string(), serde_json::Value::String(
                chrono::Utc::now().to_rfc3339()
            ));
        }

        self.create_state(StateType::Thread, data)
    }

    /// Create a tool state
    pub fn create_tool_state(
        &self,
        tool_id: String,
        initial_data: serde_json::Value,
    ) -> Result<State, StateFactoryError> {
        let mut data = initial_data;
        
        // Add tool-specific metadata
        if let serde_json::Value::Object(ref mut map) = data {
            map.insert("tool_id".to_string(), serde_json::Value::String(tool_id));
            map.insert("state_type".to_string(), serde_json::Value::String("tool".to_string()));
            map.insert("created_at".to_string(), serde_json::Value::String(
                chrono::Utc::now().to_rfc3339()
            ));
        }

        self.create_state(StateType::Tool, data)
    }

    /// Check if a builder is registered for a state type
    pub fn has_builder(&self, state_type: StateType) -> bool {
        self.builders.contains_key(&state_type)
    }

    /// Get all registered state types
    pub fn get_registered_types(&self) -> Vec<StateType> {
        self.builders.keys().cloned().collect()
    }

    /// Remove a builder
    pub fn remove_builder(&mut self, state_type: StateType) -> Option<Arc<dyn StateBuilder>> {
        self.builders.remove(&state_type)
    }
}

/// Default state builder
pub struct DefaultStateBuilder;

impl StateBuilder for DefaultStateBuilder {
    fn build_state(&self, state_type: StateType, initial_data: serde_json::Value) -> Result<State, StateBuilderError> {
        // Validate initial data
        if !initial_data.is_object() {
            return Err(StateBuilderError::InvalidInitialData(
                "Initial data must be a JSON object".to_string()
            ));
        }

        // Create state with unique ID
        let state = State {
            id: StateId(uuid::Uuid::new_v4()),
            data: initial_data,
        };

        Ok(state)
    }
}

/// Workflow state builder
pub struct WorkflowStateBuilder;

impl StateBuilder for WorkflowStateBuilder {
    fn build_state(&self, state_type: StateType, initial_data: serde_json::Value) -> Result<State, StateBuilderError> {
        if state_type != StateType::Workflow {
            return Err(StateBuilderError::InvalidStateType(
                "WorkflowStateBuilder can only build workflow states".to_string()
            ));
        }

        let mut data = initial_data;
        
        // Ensure workflow state has required fields
        if let serde_json::Value::Object(ref mut map) = data {
            if !map.contains_key("workflow_id") {
                return Err(StateBuilderError::InvalidInitialData(
                    "Workflow state must contain workflow_id".to_string()
                ));
            }
            
            // Add workflow-specific default fields
            map.insert("status".to_string(), serde_json::Value::String("pending".to_string()));
            map.insert("current_node".to_string(), serde_json::Value::Null);
            map.insert("execution_count".to_string(), serde_json::Value::Number(0.into()));
        }

        let state = State {
            id: StateId(uuid::Uuid::new_v4()),
            data,
        };

        Ok(state)
    }
}

/// Session state builder
pub struct SessionStateBuilder;

impl StateBuilder for SessionStateBuilder {
    fn build_state(&self, state_type: StateType, initial_data: serde_json::Value) -> Result<State, StateBuilderError> {
        if state_type != StateType::Session {
            return Err(StateBuilderError::InvalidStateType(
                "SessionStateBuilder can only build session states".to_string()
            ));
        }

        let mut data = initial_data;
        
        // Ensure session state has required fields
        if let serde_json::Value::Object(ref mut map) = data {
            if !map.contains_key("session_id") {
                return Err(StateBuilderError::InvalidInitialData(
                    "Session state must contain session_id".to_string()
                ));
            }
            
            // Add session-specific default fields
            map.insert("status".to_string(), serde_json::Value::String("active".to_string()));
            map.insert("last_activity".to_string(), serde_json::Value::String(
                chrono::Utc::now().to_rfc3339()
            ));
        }

        let state = State {
            id: StateId(uuid::Uuid::new_v4()),
            data,
        };

        Ok(state)
    }
}

/// State factory error
#[derive(Debug, thiserror::Error)]
pub enum StateFactoryError {
    #[error("Builder not found for state type: {0}")]
    BuilderNotFound(String),
    #[error("Builder error: {0}")]
    BuilderError(String),
    #[error("Invalid state type: {0}")]
    InvalidStateType(String),
}