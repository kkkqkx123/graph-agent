//! Workflow executor implementation

use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;

use crate::domain::workflow::{
    entities::WorkflowId,
    graph::{entities::*, value_objects::*},
};

#[derive(Debug, Error)]
pub enum ExecutionError {
    #[error("节点执行失败: {0}")]
    NodeExecutionFailed(String),
    #[error("节点类型不支持: {0:?}")]
    UnsupportedNodeType(NodeType),
    #[error("执行上下文错误: {0}")]
    ContextError(String),
    #[error("工作流不存在: {0:?}")]
    WorkflowNotFound(WorkflowId),
}

pub type ExecutionResult<T> = Result<T, ExecutionError>;

#[derive(Debug, Clone, Default)]
pub struct ExecutionContext {
    pub variables: HashMap<String, serde_json::Value>,
}

impl ExecutionContext {
    pub fn set_variable(&mut self, key: String, value: serde_json::Value) {
        self.variables.insert(key, value);
    }

    pub fn get_variable(&self, key: &str) -> Option<&serde_json::Value> {
        self.variables.get(key)
    }
}

#[derive(Clone)]
pub struct WorkflowExecutor {
    node_executors: HashMap<NodeType, Arc<dyn NodeExecutor>>,
    execution_context: Arc<dyn ExecutionContextProvider>,
}

impl std::fmt::Debug for WorkflowExecutor {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("WorkflowExecutor")
            .field("node_executors_count", &self.node_executors.len())
            .finish()
    }
}

impl WorkflowExecutor {
    pub fn new(execution_context: Arc<dyn ExecutionContextProvider>) -> Self {
        Self {
            node_executors: HashMap::new(),
            execution_context,
        }
    }

    pub fn register_node_executor(&mut self, node_type: NodeType, executor: Arc<dyn NodeExecutor>) {
        self.node_executors.insert(node_type, executor);
    }

    /// 执行工作流
    pub async fn execute(
        &self,
        workflow_id: &WorkflowId,
        input: WorkflowInput,
    ) -> ExecutionResult<WorkflowOutput> {
        // 获取工作流图
        let graph = self
            .execution_context
            .get_workflow_graph(workflow_id)
            .await?
            .ok_or(ExecutionError::WorkflowNotFound(workflow_id.clone()))?;

        // 初始化执行上下文
        let mut context = ExecutionContext::default();
        for (key, value) in input.variables {
            context.set_variable(key, value);
        }

        // 执行工作流
        let execution_result = self.execute_workflow_graph(&graph, &mut context).await?;

        Ok(WorkflowOutput {
            success: execution_result.success,
            output_variables: execution_result.output_variables,
            error_message: execution_result.error_message,
            execution_time_ms: execution_result.execution_time_ms,
        })
    }

    async fn execute_workflow_graph(
        &self,
        graph: &Graph,
        context: &mut ExecutionContext,
    ) -> ExecutionResult<NodeExecutionResult> {
        // 找到所有开始节点
        let start_nodes: Vec<_> = graph
            .nodes
            .values()
            .filter(|node| matches!(node.node_type, NodeType::Start))
            .map(|node| node.id.clone())
            .collect();

        if start_nodes.is_empty() {
            return Err(ExecutionError::ContextError("没有找到开始节点".to_string()));
        }

        // 从开始节点开始执行
        let mut current_nodes = start_nodes;
        let mut final_result = NodeExecutionResult {
            success: true,
            output_variables: HashMap::new(),
            error_message: None,
            execution_time_ms: 0,
        };

        while !current_nodes.is_empty() {
            let mut next_nodes = Vec::new();

            // 执行当前所有节点
            for node_id in current_nodes {
                if let Some(node) = graph.get_node(&node_id) {
                    let result = self.execute_node(node, context).await?;

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

        Ok(final_result)
    }

    async fn execute_node(
        &self,
        node: &Node,
        context: &ExecutionContext,
    ) -> ExecutionResult<NodeExecutionResult> {
        let executor = self
            .node_executors
            .get(&node.node_type)
            .ok_or(ExecutionError::UnsupportedNodeType(node.node_type.clone()))?;

        executor.execute(node, context).await
    }

    fn get_next_nodes(
        &self,
        graph: &Graph,
        current_node_id: &NodeId,
        execution_result: &NodeExecutionResult,
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
        execution_result: &NodeExecutionResult,
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
        execution_result: &NodeExecutionResult,
        context: &ExecutionContext,
    ) -> bool {
        if let Some(condition) = &edge.condition {
            return self.evaluate_condition(condition, execution_result, context);
        }

        true
    }
}

#[derive(Debug, Clone)]
pub struct WorkflowInput {
    pub variables: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct WorkflowOutput {
    pub success: bool,
    pub output_variables: HashMap<String, serde_json::Value>,
    pub error_message: Option<String>,
    pub execution_time_ms: u64,
}

#[derive(Debug, Clone)]
pub struct NodeExecutionResult {
    pub success: bool,
    pub output_variables: HashMap<String, serde_json::Value>,
    pub error_message: Option<String>,
    pub execution_time_ms: u64,
}

// 节点执行器接口
#[async_trait::async_trait]
pub trait NodeExecutor: Send + Sync {
    async fn execute(
        &self,
        node: &Node,
        context: &ExecutionContext,
    ) -> ExecutionResult<NodeExecutionResult>;
}

// 执行上下文提供者接口
#[async_trait::async_trait]
pub trait ExecutionContextProvider: Send + Sync {
    async fn get_workflow_graph(&self, workflow_id: &WorkflowId) -> ExecutionResult<Option<Graph>>;
}

// LLM节点执行器示例
pub struct LLMNodeExecutor {
    llm_client: Arc<dyn LLMClient>,
}

impl LLMNodeExecutor {
    pub fn new(llm_client: Arc<dyn LLMClient>) -> Self {
        Self { llm_client }
    }
}

#[async_trait::async_trait]
impl NodeExecutor for LLMNodeExecutor {
    async fn execute(
        &self,
        node: &Node,
        context: &ExecutionContext,
    ) -> ExecutionResult<NodeExecutionResult> {
        let start_time = std::time::Instant::now();

        // 从节点配置中获取提示词
        let prompt = node
            .config
            .parameters
            .get("prompt")
            .and_then(|p| p.as_str())
            .ok_or_else(|| ExecutionError::ContextError("LLM节点缺少提示词".to_string()))?;

        // 处理提示词中的变量替换
        let processed_prompt = self.process_prompt_template(prompt, context)?;

        // 调用LLM
        let response = self
            .llm_client
            .generate(&processed_prompt)
            .await
            .map_err(|e| ExecutionError::NodeExecutionFailed(format!("LLM调用失败: {}", e)))?;

        let execution_time = start_time.elapsed().as_millis() as u64;

        Ok(NodeExecutionResult {
            success: true,
            output_variables: {
                let mut vars = HashMap::new();
                vars.insert("response".to_string(), serde_json::Value::String(response));
                vars
            },
            error_message: None,
            execution_time_ms: execution_time,
        })
    }
}

impl LLMNodeExecutor {
    fn process_prompt_template(
        &self,
        prompt: &str,
        context: &ExecutionContext,
    ) -> ExecutionResult<String> {
        let mut result = prompt.to_string();

        // 简单的变量替换，格式为 {{variable_name}}
        for (key, value) in &context.variables {
            let placeholder = format!("{{{{{}}}}}", key);
            if let Some(value_str) = value.as_str() {
                result = result.replace(&placeholder, value_str);
            } else {
                result = result.replace(&placeholder, &value.to_string());
            }
        }

        Ok(result)
    }
}

// 工具节点执行器示例
pub struct ToolNodeExecutor {
    tool_registry: Arc<dyn ToolRegistry>,
}

impl ToolNodeExecutor {
    pub fn new(tool_registry: Arc<dyn ToolRegistry>) -> Self {
        Self { tool_registry }
    }
}

#[async_trait::async_trait]
impl NodeExecutor for ToolNodeExecutor {
    async fn execute(
        &self,
        node: &Node,
        context: &ExecutionContext,
    ) -> ExecutionResult<NodeExecutionResult> {
        let start_time = std::time::Instant::now();

        // 从节点配置中获取工具名称和参数
        let tool_name = node
            .config
            .parameters
            .get("tool_name")
            .and_then(|t| t.as_str())
            .ok_or_else(|| ExecutionError::ContextError("工具节点缺少工具名称".to_string()))?;

        let tool_params = node
            .config
            .parameters
            .get("parameters")
            .and_then(|p| p.as_object())
            .ok_or_else(|| ExecutionError::ContextError("工具节点缺少参数".to_string()))?;

        // 处理参数中的变量替换
        let mut processed_params = serde_json::Map::new();
        for (key, value) in tool_params {
            if let Some(str_value) = value.as_str() {
                if str_value.starts_with("{{") && str_value.ends_with("}}") {
                    let var_name = str_value.trim_start_matches("{{").trim_end_matches("}}");
                    if let Some(context_value) = context.get_variable(var_name) {
                        processed_params.insert(key.clone(), context_value.clone());
                    } else {
                        return Err(ExecutionError::ContextError(format!(
                            "上下文中找不到变量: {}",
                            var_name
                        )));
                    }
                } else {
                    processed_params.insert(key.clone(), value.clone());
                }
            } else {
                processed_params.insert(key.clone(), value.clone());
            }
        }

        // 执行工具
        let result = self
            .tool_registry
            .execute_tool(tool_name, serde_json::Value::Object(processed_params))
            .await
            .map_err(|e| ExecutionError::NodeExecutionFailed(format!("工具执行失败: {}", e)))?;

        let execution_time = start_time.elapsed().as_millis() as u64;

        Ok(NodeExecutionResult {
            success: true,
            output_variables: {
                let mut vars = HashMap::new();
                vars.insert("result".to_string(), result);
                vars
            },
            error_message: None,
            execution_time_ms: execution_time,
        })
    }
}

// 条件节点执行器示例
pub struct ConditionNodeExecutor;

#[async_trait::async_trait]
impl NodeExecutor for ConditionNodeExecutor {
    async fn execute(
        &self,
        node: &Node,
        context: &ExecutionContext,
    ) -> ExecutionResult<NodeExecutionResult> {
        let start_time = std::time::Instant::now();

        // 从节点配置中获取条件表达式
        let condition = node
            .config
            .parameters
            .get("condition")
            .and_then(|c| c.as_str())
            .ok_or_else(|| ExecutionError::ContextError("条件节点缺少条件表达式".to_string()))?;

        // 评估条件
        let result = self.evaluate_condition_expression(condition, context)?;

        let execution_time = start_time.elapsed().as_millis() as u64;

        Ok(NodeExecutionResult {
            success: true,
            output_variables: {
                let mut vars = HashMap::new();
                vars.insert(
                    "condition_result".to_string(),
                    serde_json::Value::Bool(result),
                );
                vars
            },
            error_message: None,
            execution_time_ms: execution_time,
        })
    }
}

impl ConditionNodeExecutor {
    fn evaluate_condition_expression(
        &self,
        expression: &str,
        context: &ExecutionContext,
    ) -> ExecutionResult<bool> {
        // 简单的条件表达式评估
        // 支持格式: variable == value, variable != value, etc.

        if let Some((left, op, right)) = self.parse_simple_condition(expression) {
            let left_value = context.get_variable(&left).ok_or_else(|| {
                ExecutionError::ContextError(format!("条件表达式中找不到变量: {}", left))
            })?;

            let right_value = if right.starts_with('"') && right.ends_with('"') {
                serde_json::Value::String(right.trim_matches('"').to_string())
            } else if let Ok(num) = right.parse::<f64>() {
                serde_json::Value::Number(serde_json::Number::from_f64(num).unwrap())
            } else if let Ok(bool_val) = right.parse::<bool>() {
                serde_json::Value::Bool(bool_val)
            } else {
                // 尝试作为变量
                context
                    .get_variable(&right)
                    .ok_or_else(|| {
                        ExecutionError::ContextError(format!("条件表达式中找不到变量: {}", right))
                    })?
                    .clone()
            };

            match op {
                "==" => Ok(*left_value == right_value),
                "!=" => Ok(*left_value != right_value),
                ">" => {
                    if let (Some(left_num), Some(right_num)) =
                        (left_value.as_f64(), right_value.as_f64())
                    {
                        Ok(left_num > right_num)
                    } else {
                        Err(ExecutionError::ContextError(
                            "数值比较需要数值类型".to_string(),
                        ))
                    }
                }
                "<" => {
                    if let (Some(left_num), Some(right_num)) =
                        (left_value.as_f64(), right_value.as_f64())
                    {
                        Ok(left_num < right_num)
                    } else {
                        Err(ExecutionError::ContextError(
                            "数值比较需要数值类型".to_string(),
                        ))
                    }
                }
                ">=" => {
                    if let (Some(left_num), Some(right_num)) =
                        (left_value.as_f64(), right_value.as_f64())
                    {
                        Ok(left_num >= right_num)
                    } else {
                        Err(ExecutionError::ContextError(
                            "数值比较需要数值类型".to_string(),
                        ))
                    }
                }
                "<=" => {
                    if let (Some(left_num), Some(right_num)) =
                        (left_value.as_f64(), right_value.as_f64())
                    {
                        Ok(left_num <= right_num)
                    } else {
                        Err(ExecutionError::ContextError(
                            "数值比较需要数值类型".to_string(),
                        ))
                    }
                }
                _ => Err(ExecutionError::ContextError(format!(
                    "不支持的操作符: {}",
                    op
                ))),
            }
        } else {
            Err(ExecutionError::ContextError(
                "无法解析条件表达式".to_string(),
            ))
        }
    }

    fn parse_simple_condition<'a>(&self, expression: &'a str) -> Option<(String, &'a str, String)> {
        // 简单解析: variable operator value
        let parts: Vec<&str> = expression.split_whitespace().collect();
        if parts.len() == 3 {
            Some((parts[0].to_string(), parts[1], parts[2].to_string()))
        } else {
            None
        }
    }
}

// LLM客户端接口
#[async_trait::async_trait]
pub trait LLMClient: Send + Sync {
    async fn generate(
        &self,
        prompt: &str,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>>;
}

// 工具注册表接口
#[async_trait::async_trait]
pub trait ToolRegistry: Send + Sync {
    async fn execute_tool(
        &self,
        tool_name: &str,
        parameters: serde_json::Value,
    ) -> Result<serde_json::Value, Box<dyn std::error::Error + Send + Sync>>;
}
