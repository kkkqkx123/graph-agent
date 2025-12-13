//! Synchronous execution mode implementation

use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;

use crate::domain::workflow::{
    entities::WorkflowId,
    graph::{entities::*, value_objects::*},
};
use super::super::executor::{NodeExecutor, ExecutionContextProvider, ExecutionError, ExecutionResult, NodeExecutionResult, ExecutionContext};

#[derive(Debug, Error)]
pub enum SyncExecutionError {
    #[error("同步执行失败: {0}")]
    ExecutionFailed(String),
    #[error("节点执行超时: {0}")]
    NodeTimeout(String),
}

pub type SyncExecutionResult<T> = Result<T, SyncExecutionError>;

#[derive(Clone)]
pub struct SyncExecutionMode {
    node_executors: HashMap<NodeType, Arc<dyn NodeExecutor>>,
    execution_context: Arc<dyn ExecutionContextProvider>,
    timeout_ms: u64,
}

impl std::fmt::Debug for SyncExecutionMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SyncExecutionMode")
            .field("node_executors_count", &self.node_executors.len())
            .field("timeout_ms", &self.timeout_ms)
            .finish()
    }
}

impl SyncExecutionMode {
    pub fn new(
        execution_context: Arc<dyn ExecutionContextProvider>,
        timeout_ms: u64,
    ) -> Self {
        Self {
            node_executors: HashMap::new(),
            execution_context,
            timeout_ms,
        }
    }

    pub fn register_node_executor(&mut self, node_type: NodeType, executor: Arc<dyn NodeExecutor>) {
        self.node_executors.insert(node_type, executor);
    }

    /// 同步执行工作流
    pub async fn execute(&self, workflow_id: &WorkflowId, input: SyncExecutionInput) -> SyncExecutionResult<SyncExecutionOutput> {
        // 获取工作流图
        let graph = self.execution_context.get_workflow_graph(workflow_id).await
            .map_err(|e| SyncExecutionError::ExecutionFailed(format!("获取工作流图失败: {}", e)))?
            .ok_or_else(|| SyncExecutionError::ExecutionFailed("工作流不存在".to_string()))?;

        // 初始化执行上下文
        let mut context = ExecutionContext::default();
        for (key, value) in input.variables {
            context.set_variable(key, value);
        }

        // 执行工作流
        let execution_result = self.execute_workflow_graph(&graph, &mut context).await?;

        Ok(SyncExecutionOutput {
            success: execution_result.success,
            output_variables: execution_result.output_variables,
            error_message: execution_result.error_message,
            execution_time_ms: execution_result.execution_time_ms,
            executed_nodes: execution_result.executed_nodes,
        })
    }

    async fn execute_workflow_graph(
        &self,
        graph: &Graph,
        context: &mut ExecutionContext,
    ) -> SyncExecutionResult<SyncNodeExecutionResult> {
        // 找到所有开始节点
        let start_nodes: Vec<_> = graph.nodes
            .values()
            .filter(|node| matches!(node.node_type, NodeType::Start))
            .map(|node| node.id.clone())
            .collect();

        if start_nodes.is_empty() {
            return Err(SyncExecutionError::ExecutionFailed("没有找到开始节点".to_string()));
        }

        // 从开始节点开始执行
        let mut current_nodes = start_nodes;
        let mut executed_nodes = Vec::new();
        let mut final_result = SyncNodeExecutionResult {
            success: true,
            output_variables: HashMap::new(),
            error_message: None,
            execution_time_ms: 0,
            executed_nodes: Vec::new(),
        };

        while !current_nodes.is_empty() {
            let mut next_nodes = Vec::new();

            // 同步执行当前所有节点（按顺序）
            for node_id in current_nodes {
                if let Some(node) = graph.get_node(&node_id) {
                    let result = self.execute_node_with_timeout(node, context).await?;
                    
                    // 记录已执行的节点
                    executed_nodes.push(node_id.clone());
                    
                    // 更新上下文
                    for (key, value) in &result.output_variables {
                        context.set_variable(key.clone(), value.clone());
                    }

                    // 如果是结束节点，保存结果
                    if matches!(node.node_type, NodeType::End) {
                        final_result = result.clone();
                    }

                    // 获取下一个节点
                    let next = self.get_next_nodes(graph, &node_id, &result, context);
                    next_nodes.extend(next);
                }
            }

            current_nodes = next_nodes;
        }

        final_result.executed_nodes = executed_nodes;
        Ok(final_result)
    }

    async fn execute_node_with_timeout(
        &self,
        node: &Node,
        context: &ExecutionContext,
    ) -> SyncExecutionResult<SyncNodeExecutionResult> {
        let executor = self.node_executors.get(&node.node_type)
            .ok_or_else(|| SyncExecutionError::ExecutionFailed(
                format!("不支持的节点类型: {:?}", node.node_type)
            ))?;

        // 使用tokio::time::timeout实现超时控制
        match tokio::time::timeout(
            std::time::Duration::from_millis(self.timeout_ms),
            executor.execute(node, context)
        ).await {
            Ok(result) => {
                match result {
                    Ok(node_result) => Ok(SyncNodeExecutionResult {
                        success: node_result.success,
                        output_variables: node_result.output_variables,
                        error_message: node_result.error_message,
                        execution_time_ms: node_result.execution_time_ms,
                        executed_nodes: Vec::new(),
                    }),
                    Err(e) => Err(SyncExecutionError::ExecutionFailed(
                        format!("节点执行失败: {}", e)
                    )),
                }
            }
            Err(_) => Err(SyncExecutionError::NodeTimeout(
                format!("节点 {:?} 执行超时", node.id)
            )),
        }
    }

    fn get_next_nodes(
        &self,
        graph: &Graph,
        current_node_id: &NodeId,
        execution_result: &SyncNodeExecutionResult,
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
        execution_result: &SyncNodeExecutionResult,
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
        execution_result: &SyncNodeExecutionResult,
        context: &ExecutionContext,
    ) -> bool {
        if let Some(condition) = &edge.condition {
            return self.evaluate_condition(condition, execution_result, context);
        }

        true
    }
}

#[derive(Debug, Clone)]
pub struct SyncExecutionInput {
    pub variables: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct SyncExecutionOutput {
    pub success: bool,
    pub output_variables: HashMap<String, serde_json::Value>,
    pub error_message: Option<String>,
    pub execution_time_ms: u64,
    pub executed_nodes: Vec<NodeId>,
}

#[derive(Debug, Clone)]
pub struct SyncNodeExecutionResult {
    pub success: bool,
    pub output_variables: HashMap<String, serde_json::Value>,
    pub error_message: Option<String>,
    pub execution_time_ms: u64,
    pub executed_nodes: Vec<NodeId>,
}