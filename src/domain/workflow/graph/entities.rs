//! Workflow graph domain entities

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use crate::domain::common::timestamp::Timestamp;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GraphId(pub Uuid);

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct NodeId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct EdgeId(pub String);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Graph {
    pub id: GraphId,
    pub nodes: HashMap<NodeId, Node>,
    pub edges: Vec<Edge>,
    pub metadata: GraphMetadata,
}

impl Graph {
    pub fn new() -> Self {
        Self {
            id: GraphId(Uuid::new_v4()),
            nodes: HashMap::new(),
            edges: Vec::new(),
            metadata: GraphMetadata::default(),
        }
    }

    pub fn add_node(&mut self, node: Node) {
        self.nodes.insert(node.id.clone(), node);
    }

    pub fn add_edge(&mut self, edge: Edge) {
        self.edges.push(edge);
    }

    pub fn get_node(&self, node_id: &NodeId) -> Option<&Node> {
        self.nodes.get(node_id)
    }

    pub fn get_edges_from(&self, node_id: &NodeId) -> Vec<&Edge> {
        self.edges
            .iter()
            .filter(|edge| &edge.source == node_id)
            .collect()
    }

    pub fn get_edges_to(&self, node_id: &NodeId) -> Vec<&Edge> {
        self.edges
            .iter()
            .filter(|edge| &edge.target == node_id)
            .collect()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: NodeId,
    pub node_type: NodeType,
    pub config: NodeConfig,
    pub position: Position,
    pub metadata: NodeMetadata,
}

impl Node {
    pub fn new(id: String, node_type: NodeType, config: NodeConfig) -> Self {
        Self {
            id: NodeId(id),
            node_type,
            config,
            position: Position::default(),
            metadata: NodeMetadata::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NodeType {
    LLM,
    Tool,
    Condition,
    Wait,
    Start,
    End,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeConfig {
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

impl Default for Position {
    fn default() -> Self {
        Self { x: 0.0, y: 0.0 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeMetadata {
    pub name: Option<String>,
    pub description: Option<String>,
    pub tags: Vec<String>,
}

impl Default for NodeMetadata {
    fn default() -> Self {
        Self {
            name: None,
            description: None,
            tags: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub id: EdgeId,
    pub source: NodeId,
    pub target: NodeId,
    pub edge_type: EdgeType,
    pub condition: Option<String>,
}

impl Edge {
    pub fn new(id: String, source: NodeId, target: NodeId, edge_type: EdgeType) -> Self {
        Self {
            id: EdgeId(id),
            source,
            target,
            edge_type,
            condition: None,
        }
    }

    pub fn with_condition(mut self, condition: String) -> Self {
        self.condition = Some(condition);
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EdgeType {
    Simple,
    Conditional,
    FlexibleConditional,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphMetadata {
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: String,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

impl Default for GraphMetadata {
    fn default() -> Self {
        let now = Timestamp::now();
        Self {
            name: None,
            description: None,
            version: "1.0.0".to_string(),
            created_at: now.clone(),
            updated_at: now,
        }
    }
}