//! Workflow graph domain value objects

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::entities::NodeId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphState {
    pub current_nodes: Vec<NodeId>,
    pub node_states: HashMap<NodeId, NodeState>,
    pub execution_context: ExecutionContext,
}

impl GraphState {
    pub fn new() -> Self {
        Self {
            current_nodes: Vec::new(),
            node_states: HashMap::new(),
            execution_context: ExecutionContext::default(),
        }
    }

    pub fn add_current_node(&mut self, node_id: NodeId) {
        if !self.current_nodes.contains(&node_id) {
            self.current_nodes.push(node_id);
        }
    }

    pub fn remove_current_node(&mut self, node_id: &NodeId) {
        self.current_nodes.retain(|id| id != node_id);
    }

    pub fn set_node_state(&mut self, node_id: NodeId, state: NodeState) {
        self.node_states.insert(node_id, state);
    }

    pub fn get_node_state(&self, node_id: &NodeId) -> Option<&NodeState> {
        self.node_states.get(node_id)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NodeState {
    Pending,
    Running,
    Completed,
    Failed,
    Skipped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionContext {
    pub variables: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, String>,
}

impl Default for ExecutionContext {
    fn default() -> Self {
        Self {
            variables: HashMap::new(),
            metadata: HashMap::new(),
        }
    }
}

impl ExecutionContext {
    pub fn set_variable(&mut self, key: String, value: serde_json::Value) {
        self.variables.insert(key, value);
    }

    pub fn get_variable(&self, key: &str) -> Option<&serde_json::Value> {
        self.variables.get(key)
    }

    pub fn set_metadata(&mut self, key: String, value: String) {
        self.metadata.insert(key, value);
    }

    pub fn get_metadata(&self, key: &str) -> Option<&String> {
        self.metadata.get(key)
    }
}