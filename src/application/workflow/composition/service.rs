//! Workflow composition service

use std::sync::Arc;
use thiserror::Error;

use crate::domain::common::timestamp::Timestamp;
use crate::domain::workflow::{
    entities::Workflow,
    graph::{entities::*, value_objects::*},
    registry::entities::*,
};

#[derive(Debug, Error)]
pub enum CompositionError {
    #[error("工作流组合验证失败: {0}")]
    ValidationFailed(String),
    #[error("节点不存在: {0}")]
    NodeNotFound(String),
    #[error("边连接无效: {0}")]
    InvalidEdgeConnection(String),
    #[error("图结构无效: {0}")]
    InvalidGraphStructure(String),
}

pub type CompositionResult<T> = Result<T, CompositionError>;

#[derive(Debug, Clone)]
pub struct CompositionService {
    workflow_repository: Arc<dyn WorkflowRepository>,
    graph_service: Arc<dyn GraphService>,
}

impl CompositionService {
    pub fn new(
        workflow_repository: Arc<dyn WorkflowRepository>,
        graph_service: Arc<dyn GraphService>,
    ) -> Self {
        Self {
            workflow_repository,
            graph_service,
        }
    }

    /// 组合工作流
    pub async fn compose_workflow(
        &self,
        request: ComposeWorkflowRequest,
    ) -> CompositionResult<Workflow> {
        // 验证组合请求
        self.validate_composition_request(&request)?;

        // 创建图
        let mut graph = Graph::new();

        // 添加节点
        for node_request in request.nodes {
            let node = Node::new(node_request.id, node_request.node_type, node_request.config);
            graph.add_node(node);
        }

        // 添加边
        for edge_request in request.edges {
            let edge = Edge::new(
                edge_request.id,
                edge_request.source,
                edge_request.target,
                edge_request.edge_type,
            );
            graph.add_edge(edge);
        }

        // 验证图结构
        self.validate_graph_structure(&graph)?;

        // 创建工作流
        let mut workflow = Workflow::new(request.name);
        workflow.description = request.description;

        // 保存工作流和图
        self.workflow_repository.save_workflow(&workflow).await?;
        self.graph_service.save_graph(&graph).await?;

        Ok(workflow)
    }

    /// 验证组合逻辑
    pub async fn validate_composition(
        &self,
        request: &ComposeWorkflowRequest,
    ) -> CompositionResult<()> {
        self.validate_composition_request(request)?;

        // 创建临时图进行验证
        let mut graph = Graph::new();

        // 添加节点
        for node_request in &request.nodes {
            let node = Node::new(
                node_request.id.clone(),
                node_request.node_type.clone(),
                node_request.config.clone(),
            );
            graph.add_node(node);
        }

        // 添加边
        for edge_request in &request.edges {
            let edge = Edge::new(
                edge_request.id.clone(),
                edge_request.source.clone(),
                edge_request.target.clone(),
                edge_request.edge_type.clone(),
            );
            graph.add_edge(edge);
        }

        self.validate_graph_structure(&graph)?;

        Ok(())
    }

    fn validate_composition_request(
        &self,
        request: &ComposeWorkflowRequest,
    ) -> CompositionResult<()> {
        if request.name.is_empty() {
            return Err(CompositionError::ValidationFailed(
                "工作流名称不能为空".to_string(),
            ));
        }

        if request.nodes.is_empty() {
            return Err(CompositionError::ValidationFailed(
                "工作流必须包含至少一个节点".to_string(),
            ));
        }

        // 检查节点ID唯一性
        let mut node_ids = std::collections::HashSet::new();
        for node in &request.nodes {
            if !node_ids.insert(&node.id) {
                return Err(CompositionError::ValidationFailed(format!(
                    "节点ID重复: {}",
                    node.id
                )));
            }
        }

        // 检查边ID唯一性
        let mut edge_ids = std::collections::HashSet::new();
        for edge in &request.edges {
            if !edge_ids.insert(&edge.id) {
                return Err(CompositionError::ValidationFailed(format!(
                    "边ID重复: {}",
                    edge.id
                )));
            }
        }

        Ok(())
    }

    fn validate_graph_structure(&self, graph: &Graph) -> CompositionResult<()> {
        // 检查边的源节点和目标节点是否存在
        for edge in &graph.edges {
            if !graph.nodes.contains_key(&edge.source) {
                return Err(CompositionError::NodeNotFound(format!(
                    "源节点不存在: {:?}",
                    edge.source
                )));
            }
            if !graph.nodes.contains_key(&edge.target) {
                return Err(CompositionError::NodeNotFound(format!(
                    "目标节点不存在: {:?}",
                    edge.target
                )));
            }
        }

        // 检查是否有开始节点
        let has_start_node = graph
            .nodes
            .values()
            .any(|node| matches!(node.node_type, NodeType::Start));
        if !has_start_node {
            return Err(CompositionError::InvalidGraphStructure(
                "工作流必须包含至少一个开始节点".to_string(),
            ));
        }

        // 检查是否有结束节点
        let has_end_node = graph
            .nodes
            .values()
            .any(|node| matches!(node.node_type, NodeType::End));
        if !has_end_node {
            return Err(CompositionError::InvalidGraphStructure(
                "工作流必须包含至少一个结束节点".to_string(),
            ));
        }

        // 检查图的连通性
        self.validate_graph_connectivity(graph)?;

        Ok(())
    }

    fn validate_graph_connectivity(&self, graph: &Graph) -> CompositionResult<()> {
        // 找到所有开始节点
        let start_nodes: Vec<_> = graph
            .nodes
            .values()
            .filter(|node| matches!(node.node_type, NodeType::Start))
            .map(|node| node.id.clone())
            .collect();

        if start_nodes.is_empty() {
            return Err(CompositionError::InvalidGraphStructure(
                "没有找到开始节点".to_string(),
            ));
        }

        // 从每个开始节点开始，检查是否可以到达结束节点
        for start_node in &start_nodes {
            if !self.can_reach_end_node(graph, start_node) {
                return Err(CompositionError::InvalidGraphStructure(format!(
                    "从开始节点 {:?} 无法到达任何结束节点",
                    start_node
                )));
            }
        }

        Ok(())
    }

    fn can_reach_end_node(&self, graph: &Graph, start_node: &NodeId) -> bool {
        let mut visited = std::collections::HashSet::new();
        let mut stack = vec![start_node.clone()];

        while let Some(current) = stack.pop() {
            if visited.contains(&current) {
                continue;
            }
            visited.insert(current.clone());

            // 检查当前节点是否是结束节点
            if let Some(node) = graph.get_node(&current) {
                if matches!(node.node_type, NodeType::End) {
                    return true;
                }
            }

            // 添加所有相邻节点到栈中
            for edge in graph.get_edges_from(&current) {
                stack.push(edge.target.clone());
            }
        }

        false
    }
}

#[derive(Debug, Clone)]
pub struct ComposeWorkflowRequest {
    pub name: String,
    pub description: Option<String>,
    pub nodes: Vec<NodeRequest>,
    pub edges: Vec<EdgeRequest>,
}

#[derive(Debug, Clone)]
pub struct NodeRequest {
    pub id: String,
    pub node_type: NodeType,
    pub config: NodeConfig,
}

#[derive(Debug, Clone)]
pub struct EdgeRequest {
    pub id: String,
    pub source: NodeId,
    pub target: NodeId,
    pub edge_type: EdgeType,
}

// 仓储和服务接口定义
#[async_trait::async_trait]
pub trait WorkflowRepository: Send + Sync {
    async fn save_workflow(&self, workflow: &Workflow) -> CompositionResult<()>;
    async fn get_workflow(&self, workflow_id: &WorkflowId) -> CompositionResult<Option<Workflow>>;
    async fn delete_workflow(&self, workflow_id: &WorkflowId) -> CompositionResult<()>;
}

#[async_trait::async_trait]
pub trait GraphService: Send + Sync {
    async fn save_graph(&self, graph: &Graph) -> CompositionResult<()>;
    async fn get_graph(&self, graph_id: &GraphId) -> CompositionResult<Option<Graph>>;
    async fn delete_graph(&self, graph_id: &GraphId) -> CompositionResult<()>;
}
