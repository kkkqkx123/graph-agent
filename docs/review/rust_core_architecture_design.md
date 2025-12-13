# Rust版本核心架构设计

## 1. 设计原则

### 1.1 基于Python版本问题的改进原则

#### 避免过度设计
- **简化分层**: 从5层简化为3层 (Domain + Application + Infrastructure)
- **减少抽象**: 避免不必要的接口细分
- **直接依赖**: 减少依赖注入容器的使用

#### 利用Rust特性
- **类型安全**: 编译时检查替代运行时检查
- **零成本抽象**: 在不损失性能的前提下实现良好设计
- **内存安全**: 利用所有权系统避免内存管理问题
- **并发安全**: 利用Send + Sync实现安全并发

### 1.2 架构设计原则

#### 单一职责原则 (SRP)
```rust
// 每个模块只负责一个明确的职责
pub mod workflow {
    pub mod domain;    // 工作流领域逻辑
    pub mod service;   // 工作流应用服务
    pub mod engine;    // 工作流执行引擎
}
```

#### 依赖倒置原则 (DIP)
```rust
// 高层模块不依赖低层模块，都依赖抽象
pub trait WorkflowEngine {
    fn execute(&self, workflow: &Workflow, initial_state: State) -> Result<ExecutionResult, EngineError>;
}

pub struct WorkflowService {
    engine: Box<dyn WorkflowEngine>,  // 依赖抽象，不依赖具体实现
}
```

#### 开闭原则 (OCP)
```rust
// 对扩展开放，对修改关闭
pub trait NodeExecutor {
    fn execute(&self, node: &Node, state: &mut State) -> Result<NodeResult, ExecutionError>;
}

// 可以添加新的执行器而不修改现有代码
pub struct LLMNodeExecutor {
    client: Box<dyn LLMClient>,
}

impl NodeExecutor for LLMNodeExecutor {
    fn execute(&self, node: &Node, state: &mut State) -> Result<NodeResult, ExecutionError> {
        // LLM节点执行逻辑
    }
}
```

## 2. 整体架构设计

### 2.1 三层架构

Application → Domain ← Infrastructure

### 2.2 模块依赖关系

```rust
// 依赖方向：Application → Domain ← Infrastructure
mod application {
    pub mod workflow_service;
    pub mod state_service;
    pub mod llm_service;
    
    // Application层依赖Domain层
    use crate::domain::*;
}

mod domain {
    pub mod workflow;
    pub mod state;
    pub mod llm;
    
    // Domain层定义接口，不依赖任何层
}

mod infrastructure {
    pub mod workflow_engine;
    pub mod state_storage;
    pub mod llm_client;
    
    // Infrastructure层实现Domain层的接口
    use crate::domain::*;
}
```

## 3. 核心领域模型设计

### 3.1 工作流领域模型

```rust
// domain/workflow.rs
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct WorkflowId(pub Uuid);

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct NodeId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct EdgeId(pub String);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: WorkflowId,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub nodes: BTreeMap<NodeId, Node>,
    pub edges: BTreeMap<EdgeId, Edge>,
    pub entry_point: Option<NodeId>,
}

impl Workflow {
    pub fn new(name: String) -> Self {
        Self {
            id: WorkflowId(Uuid::new_v4()),
            name,
            description: None,
            version: "1.0.0".to_string(),
            nodes: BTreeMap::new(),
            edges: BTreeMap::new(),
            entry_point: None,
        }
    }
    
    pub fn add_node(&mut self, node: Node) -> Result<(), DomainError> {
        if self.nodes.contains_key(&node.id) {
            return Err(DomainError::NodeAlreadyExists(node.id));
        }
        self.nodes.insert(node.id.clone(), node);
        Ok(())
    }
    
    pub fn add_edge(&mut self, edge: Edge) -> Result<(), DomainError> {
        if self.edges.contains_key(&edge.id) {
            return Err(DomainError::EdgeAlreadyExists(edge.id));
        }
        
        // 验证节点存在
        if !self.nodes.contains_key(&edge.from_node) {
            return Err(DomainError::NodeNotFound(edge.from_node));
        }
        if !self.nodes.contains_key(&edge.to_node) {
            return Err(DomainError::NodeNotFound(edge.to_node));
        }
        
        self.edges.insert(edge.id.clone(), edge);
        Ok(())
    }
    
    pub fn set_entry_point(&mut self, node_id: NodeId) -> Result<(), DomainError> {
        if !self.nodes.contains_key(&node_id) {
            return Err(DomainError::NodeNotFound(node_id));
        }
        self.entry_point = Some(node_id);
        Ok(())
    }
    
    pub fn validate(&self) -> Result<(), DomainError> {
        if self.entry_point.is_none() {
            return Err(DomainError::NoEntryPoint);
        }
        
        if self.nodes.is_empty() {
            return Err(DomainError::EmptyWorkflow);
        }
        
        // 验证所有边的节点都存在
        for edge in self.edges.values() {
            if !self.nodes.contains_key(&edge.from_node) {
                return Err(DomainError::NodeNotFound(edge.from_node.clone()));
            }
            if !self.nodes.contains_key(&edge.to_node) {
                return Err(DomainError::NodeNotFound(edge.to_node.clone()));
            }
        }
        
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: NodeId,
    pub name: String,
    pub node_type: NodeType,
    pub config: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NodeType {
    LLM(LLMNodeConfig),
    Tool(ToolNodeConfig),
    Condition(ConditionNodeConfig),
    Start,
    End,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMNodeConfig {
    pub model: String,
    pub prompt_template: String,
    pub temperature: f32,
    pub max_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolNodeConfig {
    pub tool_name: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionNodeConfig {
    pub condition: String,
    pub true_node: NodeId,
    pub false_node: NodeId,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub id: EdgeId,
    pub from_node: NodeId,
    pub to_node: NodeId,
    pub edge_type: EdgeType,
    pub condition: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EdgeType {
    Simple,
    Conditional,
    Parallel,
}

#[derive(Debug, thiserror::Error)]
pub enum DomainError {
    #[error("Node already exists: {0:?}")]
    NodeAlreadyExists(NodeId),
    
    #[error("Edge already exists: {0:?}")]
    EdgeAlreadyExists(EdgeId),
    
    #[error("Node not found: {0:?}")]
    NodeNotFound(NodeId),
    
    #[error("No entry point defined")]
    NoEntryPoint,
    
    #[error("Workflow is empty")]
    EmptyWorkflow,
    
    #[error("Invalid workflow structure: {0}")]
    InvalidStructure(String),
}
```

### 3.2 状态领域模型

```rust
// domain/state.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct State {
    pub id: StateId,
    pub workflow_id: WorkflowId,
    pub data: HashMap<String, serde_json::Value>,
    pub metadata: StateMetadata,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct StateId(pub Uuid);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateMetadata {
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub current_node: Option<NodeId>,
    pub status: ExecutionStatus,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExecutionStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

impl State {
    pub fn new(workflow_id: WorkflowId) -> Self {
        let now = Utc::now();
        Self {
            id: StateId(Uuid::new_v4()),
            workflow_id,
            data: HashMap::new(),
            metadata: StateMetadata {
                created_at: now,
                updated_at: now,
                current_node: None,
                status: ExecutionStatus::Pending,
                error: None,
            },
        }
    }
    
    pub fn set_data(&mut self, key: String, value: serde_json::Value) {
        self.data.insert(key, value);
        self.metadata.updated_at = Utc::now();
    }
    
    pub fn get_data(&self, key: &str) -> Option<&serde_json::Value> {
        self.data.get(key)
    }
    
    pub fn set_current_node(&mut self, node_id: NodeId) {
        self.metadata.current_node = Some(node_id);
        self.metadata.updated_at = Utc::now();
    }
    
    pub fn set_status(&mut self, status: ExecutionStatus) {
        self.metadata.status = status;
        self.metadata.updated_at = Utc::now();
    }
    
    pub fn set_error(&mut self, error: String) {
        self.metadata.error = Some(error);
        self.metadata.status = ExecutionStatus::Failed;
        self.metadata.updated_at = Utc::now();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateSnapshot {
    pub id: SnapshotId,
    pub state_id: StateId,
    pub snapshot_data: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SnapshotId(pub Uuid);
```

### 3.3 LLM领域模型

```rust
// domain/llm.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMRequest {
    pub id: RequestId,
    pub model: String,
    pub messages: Vec<Message>,
    pub parameters: LLMParameters,
    pub metadata: RequestMetadata,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct RequestId(pub Uuid);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: MessageRole,
    pub content: String,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageRole {
    System,
    User,
    Assistant,
    Tool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMParameters {
    pub temperature: f32,
    pub max_tokens: u32,
    pub top_p: f32,
    pub frequency_penalty: f32,
    pub presence_penalty: f32,
    pub stop_sequences: Vec<String>,
}

impl Default for LLMParameters {
    fn default() -> Self {
        Self {
            temperature: 0.7,
            max_tokens: 1000,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
            stop_sequences: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestMetadata {
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub workflow_id: Option<WorkflowId>,
    pub node_id: Option<NodeId>,
    pub user_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMResponse {
    pub id: ResponseId,
    pub request_id: RequestId,
    pub content: String,
    pub finish_reason: FinishReason,
    pub usage: TokenUsage,
    pub metadata: ResponseMetadata,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ResponseId(pub Uuid);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FinishReason {
    Stop,
    Length,
    ToolCall,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseMetadata {
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub model: String,
    pub processing_time_ms: u64,
    pub cost: f64,
}

impl LLMRequest {
    pub fn new(model: String, messages: Vec<Message>) -> Self {
        Self {
            id: RequestId(Uuid::new_v4()),
            model,
            messages,
            parameters: LLMParameters::default(),
            metadata: RequestMetadata {
                created_at: chrono::Utc::now(),
                workflow_id: None,
                node_id: None,
                user_id: None,
            },
        }
    }
    
    pub fn with_parameters(mut self, parameters: LLMParameters) -> Self {
        self.parameters = parameters;
        self
    }
    
    pub fn with_workflow_context(mut self, workflow_id: WorkflowId, node_id: NodeId) -> Self {
        self.metadata.workflow_id = Some(workflow_id);
        self.metadata.node_id = Some(node_id);
        self
    }
    
    pub fn estimate_tokens(&self) -> u32 {
        // 简化的token估算逻辑
        self.messages
            .iter()
            .map(|msg| msg.content.split_whitespace().count() as u32)
            .sum()
    }
    
    pub fn calculate_cost(&self, cost_per_token: f64) -> f64 {
        self.estimate_tokens() as f64 * cost_per_token
    }
}
```

## 4. 应用服务层设计

### 4.1 工作流应用服务

```rust
// application/workflow_service.rs
use crate::domain::workflow::*;
use crate::domain::state::*;
use crate::infrastructure::workflow_engine::*;
use std::sync::Arc;

pub struct WorkflowService {
    engine: Arc<dyn WorkflowEngine>,
    state_repository: Arc<dyn StateRepository>,
    workflow_repository: Arc<dyn WorkflowRepository>,
}

impl WorkflowService {
    pub fn new(
        engine: Arc<dyn WorkflowEngine>,
        state_repository: Arc<dyn StateRepository>,
        workflow_repository: Arc<dyn WorkflowRepository>,
    ) -> Self {
        Self {
            engine,
            state_repository,
            workflow_repository,
        }
    }
    
    pub async fn create_workflow(&self, name: String) -> Result<Workflow, ServiceError> {
        let mut workflow = Workflow::new(name);
        
        // 添加默认的开始和结束节点
        workflow.add_node(Node {
            id: NodeId("start".to_string()),
            name: "Start".to_string(),
            node_type: NodeType::Start,
            config: serde_json::Value::Null,
        })?;
        
        workflow.add_node(Node {
            id: NodeId("end".to_string()),
            name: "End".to_string(),
            node_type: NodeType::End,
            config: serde_json::Value::Null,
        })?;
        
        workflow.set_entry_point(NodeId("start".to_string()))?;
        
        // 保存工作流
        self.workflow_repository.save(&workflow).await?;
        
        Ok(workflow)
    }
    
    pub async fn execute_workflow(
        &self,
        workflow_id: WorkflowId,
        initial_data: HashMap<String, serde_json::Value>,
    ) -> Result<ExecutionResult, ServiceError> {
        // 加载工作流
        let workflow = self.workflow_repository
            .load(&workflow_id)
            .await?
            .ok_or(ServiceError::WorkflowNotFound(workflow_id))?;
        
        // 验证工作流
        workflow.validate()?;
        
        // 创建初始状态
        let mut state = State::new(workflow_id);
        state.data = initial_data;
        state.set_status(ExecutionStatus::Running);
        
        // 保存初始状态
        self.state_repository.save(&state).await?;
        
        // 执行工作流
        let result = self.engine.execute(&workflow, state).await?;
        
        // 保存最终状态
        self.state_repository.save(&result.final_state).await?;
        
        Ok(result)
    }
    
    pub async fn get_workflow_status(&self, workflow_id: WorkflowId) -> Result<WorkflowStatus, ServiceError> {
        let workflow = self.workflow_repository
            .load(&workflow_id)
            .await?
            .ok_or(ServiceError::WorkflowNotFound(workflow_id))?;
        
        let states = self.state_repository
            .load_by_workflow(&workflow_id)
            .await?;
        
        let latest_state = states
            .into_iter()
            .max_by_key(|s| s.metadata.updated_at);
        
        Ok(WorkflowStatus {
            workflow,
            latest_state,
        })
    }
}

#[derive(Debug, Clone)]
pub struct ExecutionResult {
    pub workflow_id: WorkflowId,
    pub final_state: State,
    pub execution_time_ms: u64,
    pub node_results: Vec<NodeResult>,
}

#[derive(Debug, Clone)]
pub struct NodeResult {
    pub node_id: NodeId,
    pub status: ExecutionStatus,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
    pub execution_time_ms: u64,
}

#[derive(Debug, Clone)]
pub struct WorkflowStatus {
    pub workflow: Workflow,
    pub latest_state: Option<State>,
}

#[derive(Debug, thiserror::Error)]
pub enum ServiceError {
    #[error("Workflow not found: {0:?}")]
    WorkflowNotFound(WorkflowId),
    
    #[error("Domain error: {0}")]
    DomainError(#[from] DomainError),
    
    #[error("Engine error: {0}")]
    EngineError(#[from] EngineError),
    
    #[error("Repository error: {0}")]
    RepositoryError(String),
}
```

### 4.2 状态应用服务

```rust
// application/state_service.rs
use crate::domain::state::*;
use std::sync::Arc;

pub struct StateService {
    repository: Arc<dyn StateRepository>,
    snapshot_repository: Arc<dyn SnapshotRepository>,
}

impl StateService {
    pub fn new(
        repository: Arc<dyn StateRepository>,
        snapshot_repository: Arc<dyn SnapshotRepository>,
    ) -> Self {
        Self {
            repository,
            snapshot_repository,
        }
    }
    
    pub async fn get_state(&self, state_id: StateId) -> Result<Option<State>, ServiceError> {
        self.repository.load(&state_id).await
            .map_err(ServiceError::RepositoryError)
    }
    
    pub async fn get_workflow_states(&self, workflow_id: WorkflowId) -> Result<Vec<State>, ServiceError> {
        self.repository.load_by_workflow(&workflow_id).await
            .map_err(ServiceError::RepositoryError)
    }
    
    pub async fn create_snapshot(
        &self,
        state_id: StateId,
        description: Option<String>,
    ) -> Result<StateSnapshot, ServiceError> {
        let state = self.repository.load(&state_id).await?
            .ok_or(ServiceError::StateNotFound(state_id))?;
        
        let snapshot = StateSnapshot {
            id: SnapshotId(Uuid::new_v4()),
            state_id,
            snapshot_data: serde_json::to_value(&state).unwrap(),
            created_at: chrono::Utc::now(),
            description,
        };
        
        self.snapshot_repository.save(&snapshot).await
            .map_err(ServiceError::RepositoryError)?;
        
        Ok(snapshot)
    }
    
    pub async fn restore_from_snapshot(
        &self,
        snapshot_id: SnapshotId,
    ) -> Result<State, ServiceError> {
        let snapshot = self.snapshot_repository.load(&snapshot_id).await?
            .ok_or(ServiceError::SnapshotNotFound(snapshot_id))?;
        
        let state: State = serde_json::from_value(snapshot.snapshot_data)
            .map_err(|e| ServiceError::RepositoryError(e.to_string()))?;
        
        // 保存恢复的状态
        self.repository.save(&state).await
            .map_err(ServiceError::RepositoryError)?;
        
        Ok(state)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ServiceError {
    #[error("State not found: {0:?}")]
    StateNotFound(StateId),
    
    #[error("Snapshot not found: {0:?}")]
    SnapshotNotFound(SnapshotId),
    
    #[error("Repository error: {0}")]
    RepositoryError(String),
}
```

## 5. 基础设施层设计

### 5.1 工作流执行引擎

```rust
// infrastructure/workflow_engine.rs
use crate::domain::workflow::*;
use crate::domain::state::*;
use async_trait::async_trait;
use std::collections::VecDeque;
use std::time::Instant;

#[async_trait]
pub trait WorkflowEngine: Send + Sync {
    async fn execute(&self, workflow: &Workflow, initial_state: State) -> Result<ExecutionResult, EngineError>;
}

pub struct StateGraphEngine {
    node_executors: HashMap<String, Box<dyn NodeExecutor>>,
    edge_evaluators: HashMap<String, Box<dyn EdgeEvaluator>>,
}

impl StateGraphEngine {
    pub fn new() -> Self {
        Self {
            node_executors: HashMap::new(),
            edge_evaluators: HashMap::new(),
        }
    }
    
    pub fn register_node_executor<N: NodeExecutor + 'static>(&mut self, name: String, executor: N) {
        self.node_executors.insert(name, Box::new(executor));
    }
    
    pub fn register_edge_evaluator<E: EdgeEvaluator + 'static>(&mut self, name: String, evaluator: E) {
        self.edge_evaluators.insert(name, Box::new(evaluator));
    }
}

#[async_trait]
impl WorkflowEngine for StateGraphEngine {
    async fn execute(&self, workflow: &Workflow, initial_state: State) -> Result<ExecutionResult, EngineError> {
        let start_time = Instant::now();
        let mut current_state = initial_state;
        let mut node_results = Vec::new();
        let mut execution_queue = VecDeque::new();
        
        // 从入口点开始
        if let Some(entry_point) = &workflow.entry_point {
            execution_queue.push_back(entry_point.clone());
        } else {
            return Err(EngineError::NoEntryPoint);
        }
        
        while let Some(node_id) = execution_queue.pop_front() {
            let node = workflow.nodes.get(&node_id)
                .ok_or(EngineError::NodeNotFound(node_id))?;
            
            // 执行节点
            let node_start_time = Instant::now();
            let node_result = self.execute_node(node, &mut current_state).await;
            let execution_time = node_start_time.elapsed().as_millis() as u64;
            
            match node_result {
                Ok(result) => {
                    node_results.push(NodeResult {
                        node_id: node_id.clone(),
                        status: ExecutionStatus::Completed,
                        result: Some(result.clone()),
                        error: None,
                        execution_time,
                    });
                    
                    // 更新状态
                    current_state.set_current_node(node_id.clone());
                    
                    // 找到下一个节点
                    let next_nodes = self.find_next_nodes(workflow, &node_id, &current_state).await?;
                    execution_queue.extend(next_nodes);
                }
                Err(e) => {
                    node_results.push(NodeResult {
                        node_id: node_id.clone(),
                        status: ExecutionStatus::Failed,
                        result: None,
                        error: Some(e.to_string()),
                        execution_time,
                    });
                    
                    current_state.set_error(e.to_string());
                    break;
                }
            }
        }
        
        let total_time = start_time.elapsed().as_millis() as u64;
        
        Ok(ExecutionResult {
            workflow_id: workflow.id.clone(),
            final_state: current_state,
            execution_time_ms: total_time,
            node_results,
        })
    }
}

impl StateGraphEngine {
    async fn execute_node(
        &self,
        node: &Node,
        state: &mut State,
    ) -> Result<serde_json::Value, EngineError> {
        let executor_name = match &node.node_type {
            NodeType::LLM(_) => "llm",
            NodeType::Tool(_) => "tool",
            NodeType::Condition(_) => "condition",
            NodeType::Start => "start",
            NodeType::End => "end",
        };
        
        let executor = self.node_executors.get(executor_name)
            .ok_or(EngineError::ExecutorNotFound(executor_name.to_string()))?;
        
        executor.execute(node, state).await
    }
    
    async fn find_next_nodes(
        &self,
        workflow: &Workflow,
        current_node_id: &NodeId,
        state: &State,
    ) -> Result<Vec<NodeId>, EngineError> {
        let mut next_nodes = Vec::new();
        
        for edge in workflow.edges.values() {
            if edge.from_node == *current_node_id {
                let evaluator_name = match edge.edge_type {
                    EdgeType::Simple => "simple",
                    EdgeType::Conditional => "conditional",
                    EdgeType::Parallel => "parallel",
                };
                
                let evaluator = self.edge_evaluators.get(evaluator_name)
                    .ok_or(EngineError::EvaluatorNotFound(evaluator_name.to_string()))?;
                
                if evaluator.can_traverse(edge, state).await? {
                    next_nodes.push(edge.to_node.clone());
                }
            }
        }
        
        Ok(next_nodes)
    }
}

#[async_trait]
pub trait NodeExecutor: Send + Sync {
    async fn execute(&self, node: &Node, state: &mut State) -> Result<serde_json::Value, EngineError>;
}

#[async_trait]
pub trait EdgeEvaluator: Send + Sync {
    async fn can_traverse(&self, edge: &Edge, state: &State) -> Result<bool, EngineError>;
}

#[derive(Debug, thiserror::Error)]
pub enum EngineError {
    #[error("No entry point defined")]
    NoEntryPoint,
    
    #[error("Node not found: {0:?}")]
    NodeNotFound(NodeId),
    
    #[error("Executor not found: {0}")]
    ExecutorNotFound(String),
    
    #[error("Evaluator not found: {0}")]
    EvaluatorNotFound(String),
    
    #[error("Execution error: {0}")]
    ExecutionError(String),
}
```

### 5.2 状态存储实现

```rust
// infrastructure/state_storage.rs
use crate::domain::state::*;
use async_trait::async_trait;
use sqlx::{PgPool, Row};
use std::sync::Arc;

#[async_trait]
pub trait StateRepository: Send + Sync {
    async fn save(&self, state: &State) -> Result<(), RepositoryError>;
    async fn load(&self, state_id: &StateId) -> Result<Option<State>, RepositoryError>;
    async fn load_by_workflow(&self, workflow_id: &WorkflowId) -> Result<Vec<State>, RepositoryError>;
    async fn delete(&self, state_id: &StateId) -> Result<(), RepositoryError>;
}

pub struct PostgresStateRepository {
    pool: Arc<PgPool>,
}

impl PostgresStateRepository {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl StateRepository for PostgresStateRepository {
    async fn save(&self, state: &State) -> Result<(), RepositoryError> {
        let query = r#"
            INSERT INTO states (id, workflow_id, data, metadata)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE SET
                data = EXCLUDED.data,
                metadata = EXCLUDED.metadata
        "#;
        
        sqlx::query(query)
            .bind(state.id.0)
            .bind(state.workflow_id.0)
            .bind(serde_json::to_value(&state.data)?)
            .bind(serde_json::to_value(&state.metadata)?)
            .execute(&*self.pool)
            .await?;
        
        Ok(())
    }
    
    async fn load(&self, state_id: &StateId) -> Result<Option<State>, RepositoryError> {
        let query = r#"
            SELECT id, workflow_id, data, metadata
            FROM states
            WHERE id = $1
        "#;
        
        let row = sqlx::query(query)
            .bind(state_id.0)
            .fetch_optional(&*self.pool)
            .await?;
        
        if let Some(row) = row {
            let state = State {
                id: StateId(row.get("id")),
                workflow_id: WorkflowId(row.get("workflow_id")),
                data: serde_json::from_value(row.get("data"))?,
                metadata: serde_json::from_value(row.get("metadata"))?,
            };
            Ok(Some(state))
        } else {
            Ok(None)
        }
    }
    
    async fn load_by_workflow(&self, workflow_id: &WorkflowId) -> Result<Vec<State>, RepositoryError> {
        let query = r#"
            SELECT id, workflow_id, data, metadata
            FROM states
            WHERE workflow_id = $1
            ORDER BY metadata->>'updated_at' DESC
        "#;
        
        let rows = sqlx::query(query)
            .bind(workflow_id.0)
            .fetch_all(&*self.pool)
            .await?;
        
        let mut states = Vec::new();
        for row in rows {
            let state = State {
                id: StateId(row.get("id")),
                workflow_id: WorkflowId(row.get("workflow_id")),
                data: serde_json::from_value(row.get("data"))?,
                metadata: serde_json::from_value(row.get("metadata"))?,
            };
            states.push(state);
        }
        
        Ok(states)
    }
    
    async fn delete(&self, state_id: &StateId) -> Result<(), RepositoryError> {
        let query = "DELETE FROM states WHERE id = $1";
        
        sqlx::query(query)
            .bind(state_id.0)
            .execute(&*self.pool)
            .await?;
        
        Ok(())
    }
}

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
    
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
}
```

## 6. 配置管理设计

### 6.1 简化的配置系统

```rust
// infrastructure/config.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub database: DatabaseConfig,
    pub llm: LLMConfig,
    pub workflow: WorkflowConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub connection_timeout: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMConfig {
    pub default_model: String,
    pub api_key: String,
    pub base_url: String,
    pub timeout: u64,
    pub max_retries: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowConfig {
    pub max_execution_time: u64,
    pub max_nodes: u32,
    pub enable_snapshots: bool,
}

impl Config {
    pub fn load() -> Result<Self, ConfigError> {
        // 从环境变量或配置文件加载
        let config = Config {
            database: DatabaseConfig {
                url: std::env::var("DATABASE_URL")
                    .map_err(|_| ConfigError::MissingEnv("DATABASE_URL"))?,
                max_connections: std::env::var("DB_MAX_CONNECTIONS")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(10),
                connection_timeout: std::env::var("DB_CONNECTION_TIMEOUT")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(30),
            },
            llm: LLMConfig {
                default_model: std::env::var("LLM_DEFAULT_MODEL")
                    .unwrap_or_else(|_| "gpt-3.5-turbo".to_string()),
                api_key: std::env::var("LLM_API_KEY")
                    .map_err(|_| ConfigError::MissingEnv("LLM_API_KEY"))?,
                base_url: std::env::var("LLM_BASE_URL")
                    .unwrap_or_else(|_| "https://api.openai.com/v1".to_string()),
                timeout: std::env::var("LLM_TIMEOUT")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(60),
                max_retries: std::env::var("LLM_MAX_RETRIES")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(3),
            },
            workflow: WorkflowConfig {
                max_execution_time: std::env::var("WORKFLOW_MAX_EXECUTION_TIME")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(3600),
                max_nodes: std::env::var("WORKFLOW_MAX_NODES")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(100),
                enable_snapshots: std::env::var("WORKFLOW_ENABLE_SNAPSHOTS")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(true),
            },
        };
        
        Ok(config)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("Missing environment variable: {0}")]
    MissingEnv(&'static str),
    
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}
```

## 7. 总结

### 7.1 架构优势

1. **简化分层**: 从5层简化为3层，减少复杂性
2. **类型安全**: 利用Rust类型系统在编译时捕获错误
3. **零成本抽象**: 在不损失性能的前提下实现良好设计
4. **内存安全**: 利用所有权系统避免内存管理问题
5. **并发安全**: 利用Send + Sync实现安全并发

### 7.2 避免的Python版本问题

1. **避免过度抽象**: 不再细分接口，保持简洁
2. **避免复杂依赖注入**: 使用直接依赖，编译时检查
3. **避免配置系统过度设计**: 简化为环境变量配置
4. **避免业务逻辑与技术实现混合**: 清晰的分层和接口

### 7.3 性能优势

1. **编译时优化**: Rust编译器进行大量优化
2. **零拷贝**: 利用所有权系统避免不必要的数据复制
3. **内存效率**: 没有垃圾回收的开销
4. **并发性能**: 高效的并发模型

这个架构设计为Rust版本提供了坚实的基础，避免了Python版本的过度设计问题。