//! Workflow coordination service

use std::sync::Arc;
use thiserror::Error;

use crate::domain::workflow::{
    entities::WorkflowId,
    graph::{entities::*, value_objects::*},
};

#[derive(Debug, Error, Clone)]
pub enum CoordinationError {
    #[error("工作流执行失败: {0}")]
    ExecutionFailed(String),
    #[error("状态管理错误: {0}")]
    StateManagementError(String),
    #[error("工作流不存在: {0:?}")]
    WorkflowNotFound(WorkflowId),
    #[error("节点执行失败: {0}")]
    NodeExecutionFailed(String),
}

pub type CoordinationResult<T> = Result<T, CoordinationError>;

#[derive(Clone)]
pub struct CoordinationService<WE, SM>
where
    WE: WorkflowExecutor + Send + Sync,
    SM: StateManager + Send + Sync,
{
    workflow_executor: Arc<WE>,
    state_manager: Arc<SM>,
}

impl<WE, SM> std::fmt::Debug for CoordinationService<WE, SM>
where
    WE: WorkflowExecutor + Send + Sync,
    SM: StateManager + Send + Sync,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CoordinationService").finish()
    }
}

impl<WE, SM> CoordinationService<WE, SM>
where
    WE: WorkflowExecutor + Send + Sync,
    SM: StateManager + Send + Sync,
{
    pub fn new(
        workflow_executor: Arc<WE>,
        state_manager: Arc<SM>,
    ) -> Self {
        Self {
            workflow_executor,
            state_manager,
        }
    }

    /// 协调工作流执行
    pub async fn coordinate_execution(&self, request: CoordinateExecutionRequest) -> CoordinationResult<ExecutionResult> {
        // 获取工作流图
        let graph = self.workflow_executor.get_workflow_graph(&request.workflow_id).await?
            .ok_or(CoordinationError::WorkflowNotFound(request.workflow_id.clone()))?;

        // 初始化执行状态
        let mut graph_state = GraphState::new();
        
        // 找到所有开始节点
        let start_nodes: Vec<_> = graph.nodes
            .values()
            .filter(|node| matches!(node.node_type, NodeType::Start))
            .map(|node| node.id.clone())
            .collect();

        if start_nodes.is_empty() {
            return Err(CoordinationError::ExecutionFailed("没有找到开始节点".to_string()));
        }

        // 将开始节点添加到当前执行节点
        for start_node in start_nodes {
            graph_state.add_current_node(start_node);
        }

        // 设置执行上下文
        for (key, value) in request.initial_context {
            graph_state.execution_context.set_variable(key, value);
        }

        // 保存初始状态
        self.state_manager.save_state(&request.workflow_id, &graph_state).await?;

        // 执行工作流
        let execution_result = self.execute_workflow_loop(&graph, &mut graph_state).await?;

        // 保存最终状态
        self.state_manager.save_state(&request.workflow_id, &graph_state).await?;

        Ok(execution_result)
    }

    /// 暂停工作流执行
    pub async fn pause_execution(&self, workflow_id: &WorkflowId) -> CoordinationResult<()> {
        self.workflow_executor.pause_execution(workflow_id).await
    }

    /// 恢复工作流执行
    pub async fn resume_execution(&self, workflow_id: &WorkflowId) -> CoordinationResult<()> {
        // 获取当前状态
        let graph_state = self.state_manager.load_state(workflow_id).await?
            .ok_or(CoordinationError::StateManagementError("找不到工作流状态".to_string()))?;

        // 获取工作流图
        let graph = self.workflow_executor.get_workflow_graph(workflow_id).await?
            .ok_or(CoordinationError::WorkflowNotFound(workflow_id.clone()))?;

        // 继续执行
        let mut mutable_state = graph_state;
        let _execution_result = self.execute_workflow_loop(&graph, &mut mutable_state).await?;

        // 保存状态
        self.state_manager.save_state(workflow_id, &mutable_state).await?;

        Ok(())
    }

    /// 停止工作流执行
    pub async fn stop_execution(&self, workflow_id: &WorkflowId) -> CoordinationResult<()> {
        self.workflow_executor.stop_execution(workflow_id).await?;
        self.state_manager.clear_state(workflow_id).await?;
        Ok(())
    }

    /// 获取工作流执行状态
    pub async fn get_execution_status(&self, workflow_id: &WorkflowId) -> CoordinationResult<ExecutionStatus> {
        let graph_state = self.state_manager.load_state(workflow_id).await?;
        
        match graph_state {
            Some(state) => {
                if state.current_nodes.is_empty() {
                    // 检查是否有结束节点已完成
                    let has_completed_end_nodes = state.node_states.iter().any(|(_, node_state)| {
                        matches!(node_state, NodeState::Completed)
                    });
                    
                    if has_completed_end_nodes {
                        Ok(ExecutionStatus::Completed)
                    } else {
                        Ok(ExecutionStatus::Failed)
                    }
                } else {
                    Ok(ExecutionStatus::Running)
                }
            }
            None => Ok(ExecutionStatus::NotStarted),
        }
    }

    async fn execute_workflow_loop(
        &self,
        graph: &Graph,
        graph_state: &mut GraphState,
    ) -> CoordinationResult<ExecutionResult> {
        let mut completed_nodes = Vec::new();
        let mut failed_nodes = Vec::new();
        let mut execution_results = Vec::new();

        while !graph_state.current_nodes.is_empty() {
            // 获取当前要执行的节点
            let current_nodes = graph_state.current_nodes.clone();
            graph_state.current_nodes.clear();

            // 并行执行当前节点
            let mut node_futures = Vec::new();
            
            for node_id in current_nodes {
                if let Some(node) = graph.get_node(&node_id) {
                    // 克隆执行上下文以避免借用冲突
                    let execution_context = graph_state.execution_context.clone();
                    let future = self.execute_node_with_context(node, execution_context);
                    node_futures.push((node_id.clone(), future));
                }
            }

            // 等待所有节点执行完成
            for (node_id, future) in node_futures {
                match future.await {
                    Ok(result) => {
                        execution_results.push((node_id.clone(), result.clone()));
                        
                        // 更新节点状态
                        graph_state.set_node_state(node_id.clone(), NodeState::Completed);
                        let node_id_clone = node_id.clone();
                        completed_nodes.push(node_id_clone);

                        // 处理执行结果，更新执行上下文
                        for (key, value) in &result.output_variables {
                            graph_state.execution_context.set_variable(key.clone(), value.clone());
                        }

                        // 找到下一个要执行的节点
                        let next_nodes = self.get_next_nodes(graph, &node_id, &result, graph_state);
                        for next_node in next_nodes {
                            graph_state.add_current_node(next_node);
                        }
                    }
                    Err(error) => {
                        graph_state.set_node_state(node_id.clone(), NodeState::Failed);
                        let node_id_clone = node_id.clone();
                        failed_nodes.push((node_id_clone, error));
                        
                        // 如果是关键节点失败，停止执行
                        if self.is_critical_node(graph, &node_id) {
                            return Err(CoordinationError::NodeExecutionFailed(
                                format!("关键节点 {:?} 执行失败", node_id)
                            ));
                        }
                    }
                }
            }

            // 保存中间状态
            // 注意：在实际实现中，可能需要根据配置决定是否保存每个步骤的状态
        }

        Ok(ExecutionResult {
            completed_nodes,
            failed_nodes,
            execution_results,
            final_context: graph_state.execution_context.clone(),
        })
    }

    async fn execute_node(
        &self,
        node: &Node,
        graph_state: &GraphState,
    ) -> CoordinationResult<NodeExecutionResult> {
        self.workflow_executor.execute_node(node, &graph_state.execution_context).await
    }

    async fn execute_node_with_context(
        &self,
        node: &Node,
        execution_context: ExecutionContext,
    ) -> CoordinationResult<NodeExecutionResult> {
        self.workflow_executor.execute_node(node, &execution_context).await
    }

    fn get_next_nodes(
        &self,
        graph: &Graph,
        current_node_id: &NodeId,
        execution_result: &NodeExecutionResult,
        graph_state: &GraphState,
    ) -> Vec<NodeId> {
        let mut next_nodes = Vec::new();
        
        for edge in graph.get_edges_from(current_node_id) {
            match &edge.edge_type {
                EdgeType::Simple => {
                    next_nodes.push(edge.target.clone());
                }
                EdgeType::Conditional => {
                    if let Some(condition) = &edge.condition {
                        if self.evaluate_condition(condition, &execution_result, graph_state) {
                            next_nodes.push(edge.target.clone());
                        }
                    }
                }
                EdgeType::FlexibleConditional => {
                    // 灵活条件边，可以根据执行结果动态决定
                    if self.should_traverse_edge(edge, execution_result, graph_state) {
                        next_nodes.push(edge.target.clone());
                    }
                }
            }
        }

        next_nodes
    }

    fn evaluate_condition(
        &self,
        condition: &str,
        execution_result: &NodeExecutionResult,
        graph_state: &GraphState,
    ) -> bool {
        // 简单的条件评估实现
        // 在实际实现中，可能需要更复杂的表达式解析器
        
        // 检查条件是否引用了执行结果中的变量
        if condition.starts_with("result.") {
            let var_name = condition.trim_start_matches("result.");
            if let Some(value) = execution_result.output_variables.get(var_name) {
                // 简单的布尔值检查
                if let Some(bool_val) = value.as_bool() {
                    return bool_val;
                }
            }
        }

        // 检查条件是否引用了执行上下文中的变量
        if let Some(value) = graph_state.execution_context.get_variable(condition) {
            if let Some(bool_val) = value.as_bool() {
                return bool_val;
            }
        }

        false
    }

    fn should_traverse_edge(
        &self,
        edge: &Edge,
        execution_result: &NodeExecutionResult,
        graph_state: &GraphState,
    ) -> bool {
        // 灵活条件边的评估逻辑
        // 可以根据边的条件、执行结果和上下文动态决定
        
        if let Some(condition) = &edge.condition {
            return self.evaluate_condition(condition, execution_result, graph_state);
        }

        // 如果没有条件，默认遍历
        true
    }

    fn is_critical_node(&self, graph: &Graph, node_id: &NodeId) -> bool {
        // 判断节点是否是关键节点
        // 关键节点的失败会导致整个工作流失败
        
        if let Some(node) = graph.get_node(node_id) {
            match node.node_type {
                NodeType::Start | NodeType::End => true,
                _ => false,
            }
        } else {
            false
        }
    }
}

#[derive(Debug, Clone)]
pub struct CoordinateExecutionRequest {
    pub workflow_id: WorkflowId,
    pub initial_context: std::collections::HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct ExecutionResult {
    pub completed_nodes: Vec<NodeId>,
    pub failed_nodes: Vec<(NodeId, CoordinationError)>,
    pub execution_results: Vec<(NodeId, NodeExecutionResult)>,
    pub final_context: ExecutionContext,
}

#[derive(Debug, Clone)]
pub struct NodeExecutionResult {
    pub success: bool,
    pub output_variables: std::collections::HashMap<String, serde_json::Value>,
    pub error_message: Option<String>,
    pub execution_time_ms: u64,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ExecutionStatus {
    NotStarted,
    Running,
    Completed,
    Failed,
    Paused,
}

// 服务接口定义
#[async_trait::async_trait]
pub trait WorkflowExecutor: Send + Sync {
    async fn get_workflow_graph(&self, workflow_id: &WorkflowId) -> CoordinationResult<Option<Graph>>;
    async fn execute_node(&self, node: &Node, context: &ExecutionContext) -> CoordinationResult<NodeExecutionResult>;
    async fn pause_execution(&self, workflow_id: &WorkflowId) -> CoordinationResult<()>;
    async fn stop_execution(&self, workflow_id: &WorkflowId) -> CoordinationResult<()>;
}

#[async_trait::async_trait]
pub trait StateManager: Send + Sync {
    async fn save_state(&self, workflow_id: &WorkflowId, state: &GraphState) -> CoordinationResult<()>;
    async fn load_state(&self, workflow_id: &WorkflowId) -> CoordinationResult<Option<GraphState>>;
    async fn clear_state(&self, workflow_id: &WorkflowId) -> CoordinationResult<()>;
}