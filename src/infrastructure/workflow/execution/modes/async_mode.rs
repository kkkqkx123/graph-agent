//! Asynchronous execution mode implementation

use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use futures::future::join_all;

use crate::domain::workflow::{
    entities::WorkflowId,
    graph::{entities::*, value_objects::*},
};
use super::executor::{NodeExecutor, ExecutionContextProvider, ExecutionError, ExecutionResult, NodeExecutionResult};

#[derive(Debug, Error)]
pub enum AsyncExecutionError {
    #[error("异步执行失败: {0}")]
    ExecutionFailed(String),
    #[error("节点执行超时: {0}")]
    NodeTimeout(String),
    #[error("并发控制错误: {0}")]
    ConcurrencyError(String),
}

pub type AsyncExecutionResult<T> = Result<T, AsyncExecutionError>;

#[derive(Debug, Clone)]
pub struct AsyncExecutionMode {
    node_executors: HashMap<NodeType, Arc<dyn NodeExecutor>>,
    execution_context: Arc<dyn ExecutionContextProvider>,
    timeout_ms: u64,
    max_concurrent_nodes: usize,
}

impl AsyncExecutionMode {
    pub fn new(
        execution_context: Arc<dyn ExecutionContextProvider>,
        timeout_ms: u64,
        max_concurrent_nodes: usize,
    ) -> Self {
        Self {
            node_executors: HashMap::new(),
            execution_context,
            timeout_ms,
            max_concurrent_nodes,
        }
    }

    pub fn register_node_executor(&mut self, node_type: NodeType, executor: Arc<dyn NodeExecutor>) {
        self.node_executors.insert(node_type, executor);
    }

    /// 异步执行工作流
    pub async fn execute(&self, workflow_id: &WorkflowId, input: AsyncExecutionInput) -> AsyncExecutionResult<AsyncExecutionOutput> {
        // 获取工作流图
        let graph = self.execution_context.get_workflow_graph(workflow_id).await
            .map_err(|e| AsyncExecutionError::ExecutionFailed(format!("获取工作流图失败: {}", e)))?
            .ok_or_else(|| AsyncExecutionError::ExecutionFailed("工作流不存在".to_string()))?;

        // 初始化执行上下文
        let mut context = ExecutionContext::default();
        for (key, value) in input.variables {
            context.set_variable(key, value);
        }

        // 执行工作流
        let execution_result = self.execute_workflow_graph(&graph, &mut context).await?;

        Ok(AsyncExecutionOutput {
            success: execution_result.success,
            output_variables: execution_result.output_variables,
            error_message: execution_result.error_message,
            execution_time_ms: execution_result.execution_time_ms,
            executed_nodes: execution_result.executed_nodes,
            parallel_groups: execution_result.parallel_groups,
        })
    }

    async fn execute_workflow_graph(
        &self,
        graph: &Graph,
        context: &mut ExecutionContext,
    ) -> AsyncExecutionResult<AsyncNodeExecutionResult> {
        // 找到所有开始节点
        let start_nodes: Vec<_> = graph.nodes
            .values()
            .filter(|node| matches!(node.node_type, NodeType::Start))
            .map(|node| node.id.clone())
            .collect();

        if start_nodes.is_empty() {
            return Err(AsyncExecutionError::ExecutionFailed("没有找到开始节点".to_string()));
        }

        // 从开始节点开始执行
        let mut current_nodes = start_nodes;
        let mut executed_nodes = Vec::new();
        let mut parallel_groups = Vec::new();
        let mut final_result = AsyncNodeExecutionResult {
            success: true,
            output_variables: HashMap::new(),
            error_message: None,
            execution_time_ms: 0,
            executed_nodes: Vec::new(),
            parallel_groups: Vec::new(),
        };

        while !current_nodes.is_empty() {
            // 分析当前节点的依赖关系，确定可以并行执行的节点组
            let parallel_node_groups = self.analyze_parallel_execution(graph, &current_nodes);
            
            for group in parallel_node_groups {
                // 记录并行组
                parallel_groups.push(group.clone());
                
                // 并行执行当前组中的所有节点
                let group_results = self.execute_node_group_parallel(&group, graph, context).await?;
                
                // 处理执行结果
                let mut next_nodes = Vec::new();
                for (node_id, result) in group_results {
                    // 记录已执行的节点
                    executed_nodes.push(node_id.clone());
                    
                    // 更新上下文
                    for (key, value) in result.output_variables {
                        context.set_variable(key, value);
                    }

                    // 如果是结束节点，保存结果
                    if let Some(node) = graph.get_node(&node_id) {
                        if matches!(node.node_type, NodeType::End) {
                            final_result = AsyncNodeExecutionResult {
                                success: result.success,
                                output_variables: result.output_variables,
                                error_message: result.error_message,
                                execution_time_ms: result.execution_time_ms,
                                executed_nodes: Vec::new(),
                                parallel_groups: Vec::new(),
                            };
                        }
                    }

                    // 获取下一个节点
                    let next = self.get_next_nodes(graph, &node_id, &result, context);
                    next_nodes.extend(next);
                }
                
                current_nodes = next_nodes;
            }
        }

        final_result.executed_nodes = executed_nodes;
        final_result.parallel_groups = parallel_groups;
        Ok(final_result)
    }

    fn analyze_parallel_execution(&self, graph: &Graph, current_nodes: &[NodeId]) -> Vec<Vec<NodeId>> {
        // 分析节点之间的依赖关系，确定可以并行执行的节点组
        let mut groups = Vec::new();
        let mut remaining_nodes: Vec<_> = current_nodes.to_vec();
        
        while !remaining_nodes.is_empty() {
            let mut current_group = Vec::new();
            let mut nodes_to_remove = Vec::new();
            
            // 找出没有依赖关系的节点
            for node_id in &remaining_nodes {
                let has_dependency = remaining_nodes.iter().any(|other_id| {
                    if other_id == node_id {
                        return false;
                    }
                    
                    // 检查是否存在从other_id到node_id的边
                    graph.edges.iter().any(|edge| {
                        &edge.source == other_id && &edge.target == node_id
                    })
                });
                
                if !has_dependency {
                    current_group.push(node_id.clone());
                    nodes_to_remove.push(node_id.clone());
                }
            }
            
            // 限制并发节点数量
            if current_group.len() > self.max_concurrent_nodes {
                current_group.truncate(self.max_concurrent_nodes);
                nodes_to_remove.truncate(self.max_concurrent_nodes);
            }
            
            if current_group.is_empty() {
                // 如果没有找到无依赖的节点，可能存在循环依赖，强制选择一个节点
                current_group.push(remaining_nodes[0].clone());
                nodes_to_remove.push(remaining_nodes[0].clone());
            }
            
            groups.push(current_group);
            
            // 移除已处理的节点
            remaining_nodes.retain(|node_id| !nodes_to_remove.contains(node_id));
        }
        
        groups
    }

    async fn execute_node_group_parallel(
        &self,
        node_group: &[NodeId],
        graph: &Graph,
        context: &ExecutionContext,
    ) -> AsyncExecutionResult<Vec<(NodeId, AsyncNodeExecutionResult)>> {
        // 创建所有节点的执行任务
        let mut futures = Vec::new();
        
        for node_id in node_group {
            if let Some(node) = graph.get_node(node_id) {
                let future = self.execute_node_with_timeout(node, context);
                futures.push(async move {
                    let result = future.await?;
                    Ok::<(NodeId, AsyncNodeExecutionResult), AsyncExecutionError>((node_id.clone(), result))
                });
            }
        }
        
        // 并行执行所有节点
        let results = join_all(futures).await;
        
        // 处理结果
        let mut successful_results = Vec::new();
        for result in results {
            match result {
                Ok(node_result) => successful_results.push(node_result),
                Err(e) => return Err(e),
            }
        }
        
        Ok(successful_results)
    }

    async fn execute_node_with_timeout(
        &self,
        node: &Node,
        context: &ExecutionContext,
    ) -> AsyncExecutionResult<AsyncNodeExecutionResult> {
        let executor = self.node_executors.get(&node.node_type)
            .ok_or_else(|| AsyncExecutionError::ExecutionFailed(
                format!("不支持的节点类型: {:?}", node.node_type)
            ))?;

        // 使用tokio::time::timeout实现超时控制
        match tokio::time::timeout(
            std::time::Duration::from_millis(self.timeout_ms),
            executor.execute(node, context)
        ).await {
            Ok(result) => {
                match result {
                    Ok(node_result) => Ok(AsyncNodeExecutionResult {
                        success: node_result.success,
                        output_variables: node_result.output_variables,
                        error_message: node_result.error_message,
                        execution_time_ms: node_result.execution_time_ms,
                        executed_nodes: Vec::new(),
                        parallel_groups: Vec::new(),
                    }),
                    Err(e) => Err(AsyncExecutionError::ExecutionFailed(
                        format!("节点执行失败: {}", e)
                    )),
                }
            }
            Err(_) => Err(AsyncExecutionError::NodeTimeout(
                format!("节点 {:?} 执行超时", node.id)
            )),
        }
    }

    fn get_next_nodes(
        &self,
        graph: &Graph,
        current_node_id: &NodeId,
        execution_result: &AsyncNodeExecutionResult,
        context: &ExecutionContext,
    ) -> Vec<NodeId> {
        let mut next_nodes = Vec::new();
        
        for edge in graph.get_edges_from(current_node_id) {
            match &edge.edge_type {
                EdgeType::Simple => {
                    next_nodes.push(edge.target.clone());
                }
                EdgeType::Conditional => {
                    if let Some(condition) = &edge.condition {
                        if self.evaluate_condition(condition, execution_result, context) {
                            next_nodes.push(edge.target.clone());
                        }
                    }
                }
                EdgeType::FlexibleConditional => {
                    if self.should_traverse_edge(edge, execution_result, context) {
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
        execution_result: &AsyncNodeExecutionResult,
        context: &ExecutionContext,
    ) -> bool {
        // 简单的条件评估实现
        if condition.starts_with("result.") {
            let var_name = condition.trim_start_matches("result.");
            if let Some(value) = execution_result.output_variables.get(var_name) {
                if let Some(bool_val) = value.as_bool() {
                    return bool_val;
                }
            }
        }

        if let Some(value) = context.get_variable(condition) {
            if let Some(bool_val) = value.as_bool() {
                return bool_val;
            }
        }

        false
    }

    fn should_traverse_edge(
        &self,
        edge: &Edge,
        execution_result: &AsyncNodeExecutionResult,
        context: &ExecutionContext,
    ) -> bool {
        if let Some(condition) = &edge.condition {
            return self.evaluate_condition(condition, execution_result, context);
        }

        true
    }
}

#[derive(Debug, Clone)]
pub struct AsyncExecutionInput {
    pub variables: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct AsyncExecutionOutput {
    pub success: bool,
    pub output_variables: HashMap<String, serde_json::Value>,
    pub error_message: Option<String>,
    pub execution_time_ms: u64,
    pub executed_nodes: Vec<NodeId>,
    pub parallel_groups: Vec<Vec<NodeId>>,
}

#[derive(Debug, Clone)]
pub struct AsyncNodeExecutionResult {
    pub success: bool,
    pub output_variables: HashMap<String, serde_json::Value>,
    pub error_message: Option<String>,
    pub execution_time_ms: u64,
    pub executed_nodes: Vec<NodeId>,
    pub parallel_groups: Vec<Vec<NodeId>>,
}