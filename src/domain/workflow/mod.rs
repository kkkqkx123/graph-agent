//! Workflow domain module

pub mod entities;
pub mod value_objects;
pub mod events;
pub mod errors;
pub mod graph;
pub mod registry;
pub mod functions;
pub mod extensions;

// Re-export specific types to avoid ambiguity
pub use entities::{WorkflowId, Workflow};
pub use value_objects::NodeConfig as WorkflowNodeConfig;
pub use events::*;
pub use errors::*;
pub use registry::*;
pub use graph::{GraphId, Graph, Node, Edge, NodeType, EdgeType, Position, NodeMetadata, GraphMetadata, NodeId as GraphNodeId, EdgeId as GraphEdgeId, NodeConfig as GraphNodeConfig};
pub use extensions::{hooks, plugins, triggers as extension_triggers};
pub use functions::{conditions, routing, triggers as function_triggers};

// Also provide the workflow-specific IDs
pub use entities::{NodeId as WorkflowNodeId, EdgeId as WorkflowEdgeId};