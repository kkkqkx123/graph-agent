//! Graph service implementation

use std::sync::Arc;
use thiserror::Error;

use crate::domain::workflow::graph::{entities::*, value_objects::*};

#[derive(Debug, Error)]
pub enum GraphServiceError {
    #[error("图创建失败: {0}")]
    CreationFailed(String),
    #[error("图验证失败: {0}")]
    ValidationFailed(String),
    #[error("图不存在: {0:?}")]
    GraphNotFound(GraphId),
    #[error("节点不存在: {0}")]
    NodeNotFound(String),
    #[error("边连接无效: {0}")]
    InvalidEdgeConnection(String),
    #[error("图结构无效: {0}")]
    InvalidGraphStructure(String),
}

pub type GraphServiceResult<T> = Result<T, GraphServiceError>;

#[derive(Clone)]
pub struct GraphService {
    graph_repository: Arc<dyn GraphRepository>,
    node_registry: Arc<dyn NodeRegistry>,
    edge_registry: Arc<dyn EdgeRegistry>,
}

impl std::fmt::Debug for GraphService {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("GraphService").finish()
    }
}

impl GraphService {
    pub fn new(
        graph_repository: Arc<dyn GraphRepository>,
        node_registry: Arc<dyn NodeRegistry>,
        edge_registry: Arc<dyn EdgeRegistry>,
    ) -> Self {
        Self {
            graph_repository,
            node_registry,
            edge_registry,
        }
    }

    /// 创建图
    pub async fn create_graph(&self, request: CreateGraphRequest) -> GraphServiceResult<Graph> {
        // 验证请求
        self.validate_create_request(&request)?;

        // 创建新图
        let mut graph = Graph::new();

        // 设置元数据
        if let Some(name) = request.name {
            graph.metadata.name = Some(name);
        }
        if let Some(description) = request.description {
            graph.metadata.description = Some(description);
        }
        if let Some(version) = request.version {
            graph.metadata.version = version;
        }

        // 添加节点
        for node_request in request.nodes {
            let node = self.create_node_from_request(node_request)?;
            graph.add_node(node);
        }

        // 添加边
        for edge_request in request.edges {
            let edge = self.create_edge_from_request(edge_request)?;
            graph.add_edge(edge);
        }

        // 验证图结构
        self.validate_graph_structure(&graph)?;

        // 保存图
        self.graph_repository.save(&graph).await?;

        Ok(graph)
    }

    /// 验证图
    pub async fn validate_graph(&self, graph: &Graph) -> GraphServiceResult<ValidationResult> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // 验证节点
        for (node_id, node) in &graph.nodes {
            if let Err(e) = self.node_registry.validate_node(node) {
                errors.push(format!("节点 {:?} 验证失败: {}", node_id, e));
            }
        }

        // 验证边
        for edge in &graph.edges {
            if let Err(e) = self.edge_registry.validate_edge(edge, graph) {
                errors.push(format!("边 {:?} 验证失败: {}", edge.id, e));
            }
        }

        // 验证图结构
        if let Err(e) = self.validate_graph_structure(graph) {
            errors.push(format!("图结构验证失败: {}", e));
        }

        // 检查警告
        if graph.nodes.is_empty() {
            warnings.push("图中没有节点".to_string());
        }

        if graph.edges.is_empty() {
            warnings.push("图中没有边".to_string());
        }

        // 检查孤立节点
        let connected_nodes = self.get_connected_nodes(graph);
        for node_id in graph.nodes.keys() {
            if !connected_nodes.contains(node_id) {
                warnings.push(format!("节点 {:?} 是孤立的，没有连接到任何边", node_id));
            }
        }

        Ok(ValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
        })
    }

    /// 获取图
    pub async fn get_graph(&self, graph_id: &GraphId) -> GraphServiceResult<Option<Graph>> {
        self.graph_repository.find_by_id(graph_id).await
    }

    /// 更新图
    pub async fn update_graph(
        &self,
        graph_id: &GraphId,
        request: UpdateGraphRequest,
    ) -> GraphServiceResult<Graph> {
        // 获取现有图
        let mut graph = self
            .graph_repository
            .find_by_id(graph_id)
            .await?
            .ok_or(GraphServiceError::GraphNotFound(graph_id.clone()))?;

        // 更新元数据
        if let Some(name) = request.name {
            graph.metadata.name = Some(name);
        }
        if let Some(description) = request.description {
            graph.metadata.description = Some(description);
        }
        if let Some(version) = request.version {
            graph.metadata.version = version;
        }

        // 更新时间戳
        graph.metadata.updated_at = crate::domain::common::timestamp::Timestamp::now();

        // 保存更新
        self.graph_repository.save(&graph).await?;

        Ok(graph)
    }

    /// 删除图
    pub async fn delete_graph(&self, graph_id: &GraphId) -> GraphServiceResult<()> {
        // 验证图是否存在
        let _graph = self
            .graph_repository
            .find_by_id(graph_id)
            .await?
            .ok_or(GraphServiceError::GraphNotFound(graph_id.clone()))?;

        // 删除图
        self.graph_repository.delete(graph_id).await?;

        Ok(())
    }

    /// 列出所有图
    pub async fn list_graphs(
        &self,
        filters: Option<GraphFilters>,
    ) -> GraphServiceResult<Vec<Graph>> {
        self.graph_repository.find_all(filters).await
    }

    /// 添加节点到图
    pub async fn add_node(
        &self,
        graph_id: &GraphId,
        request: AddNodeRequest,
    ) -> GraphServiceResult<Node> {
        // 获取图
        let mut graph = self
            .graph_repository
            .find_by_id(graph_id)
            .await?
            .ok_or(GraphServiceError::GraphNotFound(graph_id.clone()))?;

        // 创建节点
        let node = self.create_node_from_request(request.node)?;

        // 验证节点
        self.node_registry.validate_node(&node)?;

        // 检查节点ID是否已存在
        if graph.nodes.contains_key(&node.id) {
            return Err(GraphServiceError::CreationFailed(format!(
                "节点ID已存在: {:?}",
                node.id
            )));
        }

        // 添加节点
        graph.add_node(node.clone());

        // 保存图
        self.graph_repository.save(&graph).await?;

        Ok(node)
    }

    /// 从图中移除节点
    pub async fn remove_node(
        &self,
        graph_id: &GraphId,
        node_id: &NodeId,
    ) -> GraphServiceResult<()> {
        // 获取图
        let mut graph = self
            .graph_repository
            .find_by_id(graph_id)
            .await?
            .ok_or(GraphServiceError::GraphNotFound(graph_id.clone()))?;

        // 检查节点是否存在
        if !graph.nodes.contains_key(node_id) {
            return Err(GraphServiceError::NodeNotFound(format!(
                "节点不存在: {:?}",
                node_id
            )));
        }

        // 移除相关的边
        graph
            .edges
            .retain(|edge| &edge.source != node_id && &edge.target != node_id);

        // 移除节点
        graph.nodes.remove(node_id);

        // 保存图
        self.graph_repository.save(&graph).await?;

        Ok(())
    }

    /// 添加边到图
    pub async fn add_edge(
        &self,
        graph_id: &GraphId,
        request: AddEdgeRequest,
    ) -> GraphServiceResult<Edge> {
        // 获取图
        let mut graph = self
            .graph_repository
            .find_by_id(graph_id)
            .await?
            .ok_or(GraphServiceError::GraphNotFound(graph_id.clone()))?;

        // 创建边
        let edge = self.create_edge_from_request(request.edge)?;

        // 验证边
        self.edge_registry.validate_edge(&edge, &graph)?;

        // 检查边ID是否已存在
        if graph.edges.iter().any(|e| e.id == edge.id) {
            return Err(GraphServiceError::CreationFailed(format!(
                "边ID已存在: {:?}",
                edge.id
            )));
        }

        // 添加边
        graph.add_edge(edge.clone());

        // 保存图
        self.graph_repository.save(&graph).await?;

        Ok(edge)
    }

    /// 从图中移除边
    pub async fn remove_edge(
        &self,
        graph_id: &GraphId,
        edge_id: &EdgeId,
    ) -> GraphServiceResult<()> {
        // 获取图
        let mut graph = self
            .graph_repository
            .find_by_id(graph_id)
            .await?
            .ok_or(GraphServiceError::GraphNotFound(graph_id.clone()))?;

        // 检查边是否存在
        let edge_index = graph
            .edges
            .iter()
            .position(|e| &e.id == edge_id)
            .ok_or_else(|| GraphServiceError::NodeNotFound(format!("边不存在: {:?}", edge_id)))?;

        // 移除边
        graph.edges.remove(edge_index);

        // 保存图
        self.graph_repository.save(&graph).await?;

        Ok(())
    }

    fn validate_create_request(&self, request: &CreateGraphRequest) -> GraphServiceResult<()> {
        // 检查节点ID唯一性
        let mut node_ids = std::collections::HashSet::new();
        for node in &request.nodes {
            if !node_ids.insert(&node.id) {
                return Err(GraphServiceError::CreationFailed(format!(
                    "节点ID重复: {}",
                    node.id
                )));
            }
        }

        // 检查边ID唯一性
        let mut edge_ids = std::collections::HashSet::new();
        for edge in &request.edges {
            if !edge_ids.insert(&edge.id) {
                return Err(GraphServiceError::CreationFailed(format!(
                    "边ID重复: {}",
                    edge.id
                )));
            }
        }

        Ok(())
    }

    fn create_node_from_request(&self, request: NodeRequest) -> GraphServiceResult<Node> {
        let node = Node::new(request.id, request.node_type, request.config);

        Ok(node)
    }

    fn create_edge_from_request(&self, request: EdgeRequest) -> GraphServiceResult<Edge> {
        let edge = Edge::new(
            request.id,
            request.source,
            request.target,
            request.edge_type,
        );

        Ok(edge)
    }

    fn validate_graph_structure(&self, graph: &Graph) -> GraphServiceResult<()> {
        // 检查边的源节点和目标节点是否存在
        for edge in &graph.edges {
            if !graph.nodes.contains_key(&edge.source) {
                return Err(GraphServiceError::NodeNotFound(format!(
                    "源节点不存在: {:?}",
                    edge.source
                )));
            }
            if !graph.nodes.contains_key(&edge.target) {
                return Err(GraphServiceError::NodeNotFound(format!(
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
            return Err(GraphServiceError::InvalidGraphStructure(
                "工作流必须包含至少一个开始节点".to_string(),
            ));
        }

        // 检查是否有结束节点
        let has_end_node = graph
            .nodes
            .values()
            .any(|node| matches!(node.node_type, NodeType::End));
        if !has_end_node {
            return Err(GraphServiceError::InvalidGraphStructure(
                "工作流必须包含至少一个结束节点".to_string(),
            ));
        }

        // 检查图的连通性
        self.validate_graph_connectivity(graph)?;

        Ok(())
    }

    fn validate_graph_connectivity(&self, graph: &Graph) -> GraphServiceResult<()> {
        // 找到所有开始节点
        let start_nodes: Vec<_> = graph
            .nodes
            .values()
            .filter(|node| matches!(node.node_type, NodeType::Start))
            .map(|node| node.id.clone())
            .collect();

        if start_nodes.is_empty() {
            return Err(GraphServiceError::InvalidGraphStructure(
                "没有找到开始节点".to_string(),
            ));
        }

        // 从每个开始节点开始，检查是否可以到达结束节点
        for start_node in &start_nodes {
            if !self.can_reach_end_node(graph, start_node) {
                return Err(GraphServiceError::InvalidGraphStructure(format!(
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

    fn get_connected_nodes(&self, graph: &Graph) -> std::collections::HashSet<NodeId> {
        let mut connected_nodes = std::collections::HashSet::new();

        for edge in &graph.edges {
            connected_nodes.insert(edge.source.clone());
            connected_nodes.insert(edge.target.clone());
        }

        connected_nodes
    }
}

#[derive(Debug, Clone)]
pub struct CreateGraphRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub nodes: Vec<NodeRequest>,
    pub edges: Vec<EdgeRequest>,
}

#[derive(Debug, Clone)]
pub struct UpdateGraphRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone)]
pub struct AddNodeRequest {
    pub node: NodeRequest,
}

#[derive(Debug, Clone)]
pub struct AddEdgeRequest {
    pub edge: EdgeRequest,
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

#[derive(Debug, Clone)]
pub struct GraphFilters {
    pub name: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

// 仓储和注册表接口定义
#[async_trait::async_trait]
pub trait GraphRepository: Send + Sync {
    async fn save(&self, graph: &Graph) -> GraphServiceResult<()>;
    async fn find_by_id(&self, graph_id: &GraphId) -> GraphServiceResult<Option<Graph>>;
    async fn find_all(&self, filters: Option<GraphFilters>) -> GraphServiceResult<Vec<Graph>>;
    async fn delete(&self, graph_id: &GraphId) -> GraphServiceResult<()>;
}

pub trait NodeRegistry: Send + Sync {
    fn validate_node(&self, node: &Node) -> GraphServiceResult<()>;
}

pub trait EdgeRegistry: Send + Sync {
    fn validate_edge(&self, edge: &Edge, graph: &Graph) -> GraphServiceResult<()>;
}
