# Rust版本模块划分和职责边界设计

## 1. 整体模块结构

### 1.1 项目目录结构

```
src/
├── Cargo.toml
├── README.md
├── src/
│   ├── lib.rs                    # 库根，公共导出
│   ├── main.rs                   # 二进制入口
│   ├── domain/                   # 领域层 - 纯业务逻辑
│   │   ├── mod.rs
│   │   ├── workflow/             # 工作流领域
│   │   │   ├── mod.rs
│   │   │   ├── entities.rs       # 工作流实体
│   │   │   ├── value_objects.rs  # 值对象
│   │   │   ├── events.rs         # 领域事件
│   │   │   └── errors.rs         # 领域错误
│   │   ├── state/                # 状态领域
│   │   │   ├── mod.rs
│   │   │   ├── entities.rs       # 状态实体
│   │   │   ├── value_objects.rs  # 值对象
│   │   │   ├── events.rs         # 领域事件
│   │   │   └── errors.rs         # 领域错误
│   │   ├── llm/                  # LLM领域
│   │   │   ├── mod.rs
│   │   │   ├── entities.rs       # LLM实体
│   │   │   ├── value_objects.rs  # 值对象
│   │   │   ├── events.rs         # 领域事件
│   │   │   └── errors.rs         # 领域错误
│   │   └── common/               # 通用领域组件
│   │       ├── mod.rs
│   │       ├── id.rs             # 标识符
│   │       ├── timestamp.rs      # 时间戳
│   │       └── errors.rs         # 通用领域错误
│   ├── application/              # 应用层 - 业务流程编排
│   │   ├── mod.rs
│   │   ├── workflow/             # 工作流应用服务
│   │   │   ├── mod.rs
│   │   │   ├── service.rs        # 工作流服务
│   │   │   ├── commands.rs       # 命令
│   │   │   ├── queries.rs        # 查询
│   │   │   └── dto.rs            # 数据传输对象
│   │   ├── state/                # 状态应用服务
│   │   │   ├── mod.rs
│   │   │   ├── service.rs        # 状态服务
│   │   │   ├── commands.rs       # 命令
│   │   │   ├── queries.rs        # 查询
│   │   │   └── dto.rs            # 数据传输对象
│   │   ├── llm/                  # LLM应用服务
│   │   │   ├── mod.rs
│   │   │   ├── service.rs        # LLM服务
│   │   │   ├── commands.rs       # 命令
│   │   │   ├── queries.rs        # 查询
│   │   │   └── dto.rs            # 数据传输对象
│   │   └── common/               # 通用应用组件
│   │       ├── mod.rs
│   │       ├── command_handler.rs # 命令处理器
│   │       ├── query_handler.rs   # 查询处理器
│   │       └── errors.rs         # 应用错误
│   ├── infrastructure/           # 基础设施层 - 技术实现
│   │   ├── mod.rs
│   │   ├── database/             # 数据库
│   │   │   ├── mod.rs
│   │   │   ├── connection.rs     # 连接管理
│   │   │   ├── repositories/     # 仓储实现
│   │   │   │   ├── mod.rs
│   │   │   │   ├── workflow.rs   # 工作流仓储
│   │   │   │   ├── state.rs      # 状态仓储
│   │   │   │   └── snapshot.rs   # 快照仓储
│   │   │   └── migrations/       # 数据库迁移
│   │   │       └── mod.rs
│   │   ├── llm/                  # LLM基础设施
│   │   │   ├── mod.rs
│   │   │   ├── clients/          # LLM客户端
│   │   │   │   ├── mod.rs
│   │   │   │   ├── openai.rs     # OpenAI客户端
│   │   │   │   ├── anthropic.rs  # Anthropic客户端
│   │   │   │   └── mock.rs       # 模拟客户端
│   │   │   ├── token_calculator/ # Token计算器
│   │   │   │   ├── mod.rs
│   │   │   │   ├── openai.rs     # OpenAI计算器
│   │   │   │   └── anthropic.rs  # Anthropic计算器
│   │   │   └── rate_limiter.rs   # 速率限制器
│   │   ├── workflow/             # 工作流基础设施
│   │   │   ├── mod.rs
│   │   │   ├── engine/           # 执行引擎
│   │   │   │   ├── mod.rs
│   │   │   │   ├── state_graph.rs # 状态图引擎
│   │   │   │   └── executors/    # 节点执行器
│   │   │   │       ├── mod.rs
│   │   │   │       ├── llm.rs    # LLM节点执行器
│   │   │   │       ├── tool.rs   # 工具节点执行器
│   │   │   │       └── condition.rs # 条件节点执行器
│   │   │   └── evaluators/       # 边评估器
│   │   │       ├── mod.rs
│   │   │       ├── simple.rs     # 简单边评估器
│   │   │       └── conditional.rs # 条件边评估器
│   │   ├── messaging/            # 消息传递
│   │   │   ├── mod.rs
│   │   │   ├── event_bus.rs      # 事件总线
│   │   │   ├── handlers/         # 事件处理器
│   │   │   └── in_memory.rs      # 内存事件总线
│   │   ├── config/               # 配置管理
│   │   │   ├── mod.rs
│   │   │   ├── loader.rs         # 配置加载器
│   │   │   └── sources.rs        # 配置源
│   │   └── common/               # 通用基础设施
│   │       ├── mod.rs
│   │       ├── logging.rs        # 日志
│   │       ├── metrics.rs        # 指标
│   │       └── telemetry.rs      # 遥测
│   └── interfaces/               # 接口层 - 对外接口
│       ├── mod.rs
│       ├── http/                 # HTTP接口
│       │   ├── mod.rs
│       │   ├── handlers/         # HTTP处理器
│       │   ├── middleware/       # 中间件
│       │   └── routes.rs         # 路由
│       ├── grpc/                 # gRPC接口
│       │   ├── mod.rs
│       │   ├── services/         # gRPC服务
│       │   └── handlers/         # gRPC处理器
│       └── cli/                  # 命令行接口
│           ├── mod.rs
│           └── commands/         # CLI命令
├── tests/                        # 集成测试
│   ├── integration/
│   └── e2e/
├── benches/                      # 性能测试
├── examples/                     # 示例代码
└── docs/                         # 文档
```

## 2. 领域层模块设计

### 2.1 工作流领域模块

```rust
// domain/workflow/mod.rs
pub mod entities;
pub mod value_objects;
pub mod events;
pub mod errors;

// 重新导出公共接口
pub use entities::*;
pub use value_objects::*;
pub use events::*;
pub use errors::*;

// 领域服务
pub struct WorkflowDomainService;

impl WorkflowDomainService {
    pub fn validate_workflow_structure(workflow: &Workflow) -> Result<(), DomainError> {
        // 工作流结构验证逻辑
        if workflow.nodes.is_empty() {
            return Err(DomainError::EmptyWorkflow);
        }
        
        if workflow.entry_point.is_none() {
            return Err(DomainError::NoEntryPoint);
        }
        
        // 验证所有边的节点都存在
        for edge in workflow.edges.values() {
            if !workflow.nodes.contains_key(&edge.from_node) {
                return Err(DomainError::NodeNotFound(edge.from_node.clone()));
            }
            if !workflow.nodes.contains_key(&edge.to_node) {
                return Err(DomainError::NodeNotFound(edge.to_node.clone()));
            }
        }
        
        Ok(())
    }
    
    pub fn calculate_execution_path(workflow: &Workflow) -> Result<Vec<NodeId>, DomainError> {
        // 计算执行路径
        let mut path = Vec::new();
        let mut current = workflow.entry_point.clone()
            .ok_or(DomainError::NoEntryPoint)?;
        
        path.push(current.clone());
        
        // 简化的路径计算逻辑
        while let Some(next_node) = self.find_next_node(workflow, &current) {
            if path.contains(&next_node) {
                return Err(DomainError::CircularDependency);
            }
            path.push(next_node.clone());
            current = next_node;
            
            // 避免无限循环
            if path.len() > workflow.nodes.len() {
                return Err(DomainError::PathTooLong);
            }
        }
        
        Ok(path)
    }
    
    fn find_next_node(&self, workflow: &Workflow, current_node: &NodeId) -> Option<NodeId> {
        // 查找下一个节点的逻辑
        for edge in workflow.edges.values() {
            if edge.from_node == *current_node {
                return Some(edge.to_node.clone());
            }
        }
        None
    }
}
```

### 2.2 状态领域模块

```rust
// domain/state/mod.rs
pub mod entities;
pub mod value_objects;
pub mod events;
pub mod errors;

// 重新导出公共接口
pub use entities::*;
pub use value_objects::*;
pub use events::*;
pub use errors::*;

// 领域服务
pub struct StateDomainService;

impl StateDomainService {
    pub fn create_snapshot(state: &State, description: Option<String>) -> StateSnapshot {
        StateSnapshot {
            id: SnapshotId(uuid::Uuid::new_v4()),
            state_id: state.id.clone(),
            snapshot_data: serde_json::to_value(state).unwrap(),
            created_at: chrono::Utc::now(),
            description,
        }
    }
    
    pub fn restore_from_snapshot(snapshot: &StateSnapshot) -> Result<State, DomainError> {
        serde_json::from_value(snapshot.snapshot_data.clone())
            .map_err(|e| DomainError::InvalidSnapshot(e.to_string()))
    }
    
    pub fn merge_states(base: &State, overlay: &State) -> Result<State, DomainError> {
        if base.workflow_id != overlay.workflow_id {
            return Err(DomainError::StateMismatch);
        }
        
        let mut merged = base.clone();
        
        // 合并数据
        for (key, value) in &overlay.data {
            merged.data.insert(key.clone(), value.clone());
        }
        
        // 更新元数据
        merged.metadata.updated_at = chrono::Utc::now();
        
        Ok(merged)
    }
    
    pub fn calculate_state_diff(old: &State, new: &State) -> StateDiff {
        let mut changes = HashMap::new();
        
        // 找出变化的键
        for key in old.data.keys().chain(new.data.keys()) {
            let old_value = old.data.get(key);
            let new_value = new.data.get(key);
            
            if old_value != new_value {
                changes.insert(key.clone(), DataChange {
                    old: old_value.cloned(),
                    new: new_value.cloned(),
                });
            }
        }
        
        StateDiff {
            state_id: new.id.clone(),
            changes,
            timestamp: chrono::Utc::now(),
        }
    }
}
```

### 2.3 LLM领域模块

```rust
// domain/llm/mod.rs
pub mod entities;
pub mod value_objects;
pub mod events;
pub mod errors;

// 重新导出公共接口
pub use entities::*;
pub use value_objects::*;
pub use events::*;
pub use errors::*;

// 领域服务
pub struct LLMDomainService;

impl LLMDomainService {
    pub fn calculate_token_usage(messages: &[Message]) -> TokenUsage {
        // 简化的token计算逻辑
        let prompt_tokens: u32 = messages
            .iter()
            .map(|msg| self.estimate_tokens(&msg.content))
            .sum();
        
        TokenUsage {
            prompt_tokens,
            completion_tokens: 0, // 需要响应后才能计算
            total_tokens: prompt_tokens,
        }
    }
    
    pub fn calculate_cost(usage: &TokenUsage, model: &str) -> f64 {
        // 根据模型计算成本
        let (prompt_cost_per_1k, completion_cost_per_1k) = match model {
            "gpt-4" => (0.03, 0.06),
            "gpt-3.5-turbo" => (0.0015, 0.002),
            "claude-3" => (0.015, 0.075),
            _ => (0.001, 0.002),
        };
        
        let prompt_cost = (usage.prompt_tokens as f64 / 1000.0) * prompt_cost_per_1k;
        let completion_cost = (usage.completion_tokens as f64 / 1000.0) * completion_cost_per_1k;
        
        prompt_cost + completion_cost
    }
    
    pub fn validate_request(request: &LLMRequest) -> Result<(), DomainError> {
        if request.messages.is_empty() {
            return Err(DomainError::EmptyMessages);
        }
        
        if request.model.is_empty() {
            return Err(DomainError::InvalidModel);
        }
        
        // 验证消息格式
        for (i, message) in request.messages.iter().enumerate() {
            if message.content.is_empty() {
                return Err(DomainError::EmptyMessage(i));
            }
        }
        
        Ok(())
    }
    
    fn estimate_tokens(&self, text: &str) -> u32 {
        // 简化的token估算：大约4个字符 = 1个token
        (text.len() as f32 / 4.0).ceil() as u32
    }
}
```

## 3. 应用层模块设计

### 3.1 工作流应用服务

```rust
// application/workflow/service.rs
use crate::domain::workflow::*;
use crate::domain::state::*;
use crate::infrastructure::workflow_engine::*;
use std::sync::Arc;

pub struct WorkflowService {
    engine: Arc<dyn WorkflowEngine>,
    workflow_repository: Arc<dyn WorkflowRepository>,
    state_repository: Arc<dyn StateRepository>,
    event_bus: Arc<dyn EventBus>,
}

impl WorkflowService {
    pub fn new(
        engine: Arc<dyn WorkflowEngine>,
        workflow_repository: Arc<dyn WorkflowRepository>,
        state_repository: Arc<dyn StateRepository>,
        event_bus: Arc<dyn EventBus>,
    ) -> Self {
        Self {
            engine,
            workflow_repository,
            state_repository,
            event_bus,
        }
    }
    
    pub async fn create_workflow(&self, command: CreateWorkflowCommand) -> Result<WorkflowDto, ServiceError> {
        // 创建工作流
        let mut workflow = Workflow::new(command.name);
        workflow.description = command.description;
        
        // 验证工作流
        WorkflowDomainService::validate_workflow_structure(&workflow)?;
        
        // 保存工作流
        self.workflow_repository.save(&workflow).await?;
        
        // 发布事件
        self.event_bus.publish(WorkflowCreatedEvent {
            workflow_id: workflow.id.clone(),
            name: workflow.name.clone(),
        }).await?;
        
        Ok(WorkflowDto::from(workflow))
    }
    
    pub async fn execute_workflow(&self, command: ExecuteWorkflowCommand) -> Result<ExecutionResultDto, ServiceError> {
        // 加载工作流
        let workflow = self.workflow_repository
            .load(&command.workflow_id)
            .await?
            .ok_or(ServiceError::WorkflowNotFound(command.workflow_id))?;
        
        // 验证工作流
        WorkflowDomainService::validate_workflow_structure(&workflow)?;
        
        // 创建初始状态
        let mut state = State::new(workflow.id.clone());
        state.data = command.initial_data;
        state.set_status(ExecutionStatus::Running);
        
        // 保存初始状态
        self.state_repository.save(&state).await?;
        
        // 发布开始事件
        self.event_bus.publish(WorkflowExecutionStartedEvent {
            workflow_id: workflow.id.clone(),
            state_id: state.id.clone(),
        }).await?;
        
        // 执行工作流
        let result = self.engine.execute(&workflow, state).await;
        
        match result {
            Ok(execution_result) => {
                // 保存最终状态
                self.state_repository.save(&execution_result.final_state).await?;
                
                // 发布完成事件
                self.event_bus.publish(WorkflowExecutionCompletedEvent {
                    workflow_id: workflow.id.clone(),
                    final_state_id: execution_result.final_state.id.clone(),
                    execution_time_ms: execution_result.execution_time_ms,
                }).await?;
                
                Ok(ExecutionResultDto::from(execution_result))
            }
            Err(e) => {
                // 发布失败事件
                self.event_bus.publish(WorkflowExecutionFailedEvent {
                    workflow_id: workflow.id.clone(),
                    error: e.to_string(),
                }).await?;
                
                Err(ServiceError::ExecutionError(e))
            }
        }
    }
    
    pub async fn get_workflow(&self, query: GetWorkflowQuery) -> Result<Option<WorkflowDto>, ServiceError> {
        let workflow = self.workflow_repository.load(&query.workflow_id).await?;
        Ok(workflow.map(WorkflowDto::from))
    }
    
    pub async fn list_workflows(&self, query: ListWorkflowsQuery) -> Result<Vec<WorkflowDto>, ServiceError> {
        let workflows = self.workflow_repository.list(query.pagination).await?;
        Ok(workflows.into_iter().map(WorkflowDto::from).collect())
    }
}

// 命令定义
#[derive(Debug, Clone)]
pub struct CreateWorkflowCommand {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ExecuteWorkflowCommand {
    pub workflow_id: WorkflowId,
    pub initial_data: HashMap<String, serde_json::Value>,
}

// 查询定义
#[derive(Debug, Clone)]
pub struct GetWorkflowQuery {
    pub workflow_id: WorkflowId,
}

#[derive(Debug, Clone)]
pub struct ListWorkflowsQuery {
    pub pagination: Pagination,
}

// DTO定义
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WorkflowDto {
    pub id: WorkflowId,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<Workflow> for WorkflowDto {
    fn from(workflow: Workflow) -> Self {
        Self {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            version: workflow.version,
            created_at: chrono::Utc::now(), // 应该从workflow获取
            updated_at: chrono::Utc::now(), // 应该从workflow获取
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExecutionResultDto {
    pub workflow_id: WorkflowId,
    pub final_state_id: StateId,
    pub execution_time_ms: u64,
    pub node_results: Vec<NodeResultDto>,
    pub status: ExecutionStatus,
}

impl From<ExecutionResult> for ExecutionResultDto {
    fn from(result: ExecutionResult) -> Self {
        Self {
            workflow_id: result.workflow_id,
            final_state_id: result.final_state.id,
            execution_time_ms: result.execution_time_ms,
            node_results: result.node_results.into_iter().map(NodeResultDto::from).collect(),
            status: result.final_state.metadata.status,
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct NodeResultDto {
    pub node_id: NodeId,
    pub status: ExecutionStatus,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
    pub execution_time_ms: u64,
}

impl From<NodeResult> for NodeResultDto {
    fn from(result: NodeResult) -> Self {
        Self {
            node_id: result.node_id,
            status: result.status,
            result: result.result,
            error: result.error,
            execution_time_ms: result.execution_time_ms,
        }
    }
}
```

## 4. 基础设施层模块设计

### 4.1 数据库模块

```rust
// infrastructure/database/mod.rs
pub mod connection;
pub mod repositories;
pub mod migrations;

// 重新导出
pub use connection::*;
pub use repositories::*;

// 连接管理
pub struct DatabaseManager {
    pool: sqlx::PgPool,
}

impl DatabaseManager {
    pub async fn new(config: &DatabaseConfig) -> Result<Self, DatabaseError> {
        let pool = sqlx::PgPool::connect(&config.url).await?;
        
        // 运行迁移
        sqlx::migrate!("./migrations").run(&pool).await?;
        
        Ok(Self { pool })
    }
    
    pub fn pool(&self) -> &sqlx::PgPool {
        &self.pool
    }
    
    pub async fn health_check(&self) -> Result<(), DatabaseError> {
        sqlx::query("SELECT 1")
            .fetch_one(&self.pool)
            .await?;
        Ok(())
    }
}

// 仓储基类
#[async_trait::async_trait]
pub trait Repository<T, ID> {
    async fn save(&self, entity: &T) -> Result<(), RepositoryError>;
    async fn load(&self, id: &ID) -> Result<Option<T>, RepositoryError>;
    async fn delete(&self, id: &ID) -> Result<(), RepositoryError>;
}

// 工作流仓储实现
pub struct PostgresWorkflowRepository {
    pool: sqlx::PgPool,
}

impl PostgresWorkflowRepository {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait::async_trait]
impl Repository<Workflow, WorkflowId> for PostgresWorkflowRepository {
    async fn save(&self, workflow: &Workflow) -> Result<(), RepositoryError> {
        let query = r#"
            INSERT INTO workflows (id, name, description, version, nodes, edges, entry_point)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                version = EXCLUDED.version,
                nodes = EXCLUDED.nodes,
                edges = EXCLUDED.edges,
                entry_point = EXCLUDED.entry_point
        "#;
        
        sqlx::query(query)
            .bind(workflow.id.0)
            .bind(&workflow.name)
            .bind(&workflow.description)
            .bind(&workflow.version)
            .bind(serde_json::to_value(&workflow.nodes)?)
            .bind(serde_json::to_value(&workflow.edges)?)
            .bind(&workflow.entry_point.map(|id| id.0))
            .execute(&self.pool)
            .await?;
        
        Ok(())
    }
    
    async fn load(&self, id: &WorkflowId) -> Result<Option<Workflow>, RepositoryError> {
        let query = r#"
            SELECT id, name, description, version, nodes, edges, entry_point
            FROM workflows
            WHERE id = $1
        "#;
        
        let row = sqlx::query(query)
            .bind(id.0)
            .fetch_optional(&self.pool)
            .await?;
        
        if let Some(row) = row {
            let workflow = Workflow {
                id: WorkflowId(row.get("id")),
                name: row.get("name"),
                description: row.get("description"),
                version: row.get("version"),
                nodes: serde_json::from_value(row.get("nodes"))?,
                edges: serde_json::from_value(row.get("edges"))?,
                entry_point: row.get::<Option<String>, _>("entry_point")
                    .map(NodeId),
            };
            Ok(Some(workflow))
        } else {
            Ok(None)
        }
    }
    
    async fn delete(&self, id: &WorkflowId) -> Result<(), RepositoryError> {
        let query = "DELETE FROM workflows WHERE id = $1";
        
        sqlx::query(query)
            .bind(id.0)
            .execute(&self.pool)
            .await?;
        
        Ok(())
    }
}

impl PostgresWorkflowRepository {
    pub async fn list(&self, pagination: Pagination) -> Result<Vec<Workflow>, RepositoryError> {
        let query = r#"
            SELECT id, name, description, version, nodes, edges, entry_point
            FROM workflows
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        "#;
        
        let rows = sqlx::query(query)
            .bind(pagination.limit)
            .bind(pagination.offset)
            .fetch_all(&self.pool)
            .await?;
        
        let mut workflows = Vec::new();
        for row in rows {
            let workflow = Workflow {
                id: WorkflowId(row.get("id")),
                name: row.get("name"),
                description: row.get("description"),
                version: row.get("version"),
                nodes: serde_json::from_value(row.get("nodes"))?,
                edges: serde_json::from_value(row.get("edges"))?,
                entry_point: row.get::<Option<String>, _>("entry_point")
                    .map(NodeId),
            };
            workflows.push(workflow);
        }
        
        Ok(workflows)
    }
}
```

### 4.2 LLM客户端模块

```rust
// infrastructure/llm/mod.rs
pub mod clients;
pub mod token_calculator;
pub mod rate_limiter;

// 重新导出
pub use clients::*;
pub use token_calculator::*;
pub use rate_limiter::*;

// LLM客户端接口
#[async_trait::async_trait]
pub trait LLMClient: Send + Sync {
    async fn generate(&self, request: &LLMRequest) -> Result<LLMResponse, LLMError>;
    async fn generate_stream(&self, request: &LLMRequest) -> Result<BoxStream<Result<String, LLMError>>, LLMError>;
}

// OpenAI客户端实现
pub struct OpenAIClient {
    client: reqwest::Client,
    api_key: String,
    base_url: String,
    rate_limiter: Arc<dyn RateLimiter>,
}

impl OpenAIClient {
    pub fn new(config: &LLMConfig) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key: config.api_key.clone(),
            base_url: config.base_url.clone(),
            rate_limiter: Arc::new(TokenBucketRateLimiter::new(
                config.requests_per_minute,
                config.tokens_per_minute,
            )),
        }
    }
}

#[async_trait::async_trait]
impl LLMClient for OpenAIClient {
    async fn generate(&self, request: &LLMRequest) -> Result<LLMResponse, LLMError> {
        // 速率限制
        self.rate_limiter.acquire().await?;
        
        // 构建请求
        let openai_request = OpenAIRequest {
            model: request.model.clone(),
            messages: request.messages.iter().map(|msg| OpenAIMessage {
                role: match msg.role {
                    MessageRole::System => "system".to_string(),
                    MessageRole::User => "user".to_string(),
                    MessageRole::Assistant => "assistant".to_string(),
                    MessageRole::Tool => "tool".to_string(),
                },
                content: msg.content.clone(),
            }).collect(),
            temperature: request.parameters.temperature,
            max_tokens: Some(request.parameters.max_tokens),
            top_p: Some(request.parameters.top_p),
            frequency_penalty: Some(request.parameters.frequency_penalty),
            presence_penalty: Some(request.parameters.presence_penalty),
            stop: if request.parameters.stop_sequences.is_empty() {
                None
            } else {
                Some(request.parameters.stop_sequences.clone())
            },
        };
        
        // 发送请求
        let response = self.client
            .post(&format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&openai_request)
            .send()
            .await?;
        
        if !response.status().is_success() {
            return Err(LLMError::ApiError(response.status().as_u16()));
        }
        
        let openai_response: OpenAIResponse = response.json().await?;
        
        // 转换为领域模型
        let llm_response = LLMResponse {
            id: ResponseId(uuid::Uuid::new_v4()),
            request_id: request.id.clone(),
            content: openai_response.choices[0].message.content.clone(),
            finish_reason: match openai_response.choices[0].finish_reason.as_str() {
                "stop" => FinishReason::Stop,
                "length" => FinishReason::Length,
                "tool_calls" => FinishReason::ToolCall,
                _ => FinishReason::Error,
            },
            usage: TokenUsage {
                prompt_tokens: openai_response.usage.prompt_tokens,
                completion_tokens: openai_response.usage.completion_tokens,
                total_tokens: openai_response.usage.total_tokens,
            },
            metadata: ResponseMetadata {
                created_at: chrono::Utc::now(),
                model: openai_response.model,
                processing_time_ms: 0, // 需要测量
                cost: LLMDomainService::calculate_cost(
                    &TokenUsage {
                        prompt_tokens: openai_response.usage.prompt_tokens,
                        completion_tokens: openai_response.usage.completion_tokens,
                        total_tokens: openai_response.usage.total_tokens,
                    },
                    &openai_response.model,
                ),
            },
        };
        
        Ok(llm_response)
    }
    
    async fn generate_stream(&self, request: &LLMRequest) -> Result<BoxStream<Result<String, LLMError>>, LLMError> {
        // 流式生成实现
        todo!("流式生成待实现")
    }
}

// 速率限制器接口
#[async_trait::async_trait]
pub trait RateLimiter: Send + Sync {
    async fn acquire(&self) -> Result<(), RateLimitError>;
}

// 令牌桶速率限制器
pub struct TokenBucketRateLimiter {
    tokens: Arc<Mutex<TokenBucket>>,
}

impl TokenBucketRateLimiter {
    pub fn new(requests_per_minute: u32, tokens_per_minute: u32) -> Self {
        Self {
            tokens: Arc::new(Mutex::new(TokenBucket::new(
                requests_per_minute,
                tokens_per_minute,
            ))),
        }
    }
}

#[async_trait::async_trait]
impl RateLimiter for TokenBucketRateLimiter {
    async fn acquire(&self) -> Result<(), RateLimitError> {
        let mut bucket = self.tokens.lock().await;
        bucket.acquire().await
    }
}

struct TokenBucket {
    requests: u32,
    tokens: u32,
    last_refill: Instant,
}

impl TokenBucket {
    fn new(requests_per_minute: u32, tokens_per_minute: u32) -> Self {
        Self {
            requests: requests_per_minute,
            tokens: tokens_per_minute,
            last_refill: Instant::now(),
        }
    }
    
    async fn acquire(&mut self) -> Result<(), RateLimitError> {
        self.refill();
        
        if self.requests > 0 && self.tokens > 0 {
            self.requests -= 1;
            self.tokens -= 1;
            Ok(())
        } else {
            Err(RateLimitError::RateLimited)
        }
    }
    
    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill);
        
        if elapsed >= Duration::from_secs(60) {
            self.requests = self.requests.max_value(); // 重置为最大值
            self.tokens = self.tokens.max_value(); // 重置为最大值
            self.last_refill = now;
        }
    }
}
```

## 5. 模块职责边界总结

### 5.1 领域层职责

| 模块 | 职责 | 不包含 |
|------|------|--------|
| workflow | 工作流实体、业务规则、领域服务 | 数据库操作、HTTP处理 |
| state | 状态实体、状态转换、快照逻辑 | 持久化、序列化 |
| llm | LLM请求/响应实体、Token计算、成本计算 | HTTP客户端、API调用 |
| common | 通用值对象、标识符、时间戳 | 技术实现细节 |

### 5.2 应用层职责

| 模块 | 职责 | 不包含 |
|------|------|--------|
| workflow | 工作流业务流程、命令处理、查询处理 | 工作流执行、数据持久化 |
| state | 状态管理流程、快照管理、状态查询 | 状态存储、序列化 |
| llm | LLM调用流程、请求验证、响应处理 | HTTP通信、Token计算 |
| common | 命令/查询处理器、DTO转换、错误处理 | 具体业务逻辑、技术实现 |

### 5.3 基础设施层职责

| 模块 | 职责 | 不包含 |
|------|------|--------|
| database | 数据持久化、连接管理、事务处理 | 业务逻辑、领域规则 |
| llm | HTTP客户端、API通信、速率限制 | 业务规则、成本计算 |
| workflow | 工作流执行引擎、节点执行器 | 业务流程、状态管理 |
| messaging | 事件总线、消息传递、事件处理 | 业务逻辑、领域事件定义 |

### 5.4 接口层职责

| 模块 | 职责 | 不包含 |
|------|------|--------|
| http | HTTP路由、请求处理、响应格式化 | 业务逻辑、数据验证 |
| grpc | gRPC服务、协议处理、流式处理 | 业务逻辑、数据转换 |
| cli | 命令行解析、参数验证、输出格式 | 业务逻辑、状态管理 |

## 6. 模块间依赖关系

### 6.1 依赖图

```
interfaces
    ↓
application
    ↓
domain ← infrastructure
```

### 6.2 具体依赖

```rust
// application 依赖 domain
use crate::domain::workflow::*;
use crate::domain::state::*;
use crate::domain::llm::*;

// infrastructure 依赖 domain
use crate::domain::workflow::*;
use crate::domain::state::*;
use crate::domain::llm::*;

// interfaces 依赖 application
use crate::application::workflow::*;
use crate::application::state::*;
use crate::application::llm::*;
```

### 6.3 依赖规则

1. **领域层**: 不依赖任何其他层
2. **应用层**: 只依赖领域层
3. **基础设施层**: 只依赖领域层
4. **接口层**: 只依赖应用层

## 7. 总结

### 7.1 模块设计优势

1. **职责清晰**: 每个模块都有明确的职责边界
2. **依赖简单**: 遵循依赖倒置原则，避免循环依赖
3. **易于测试**: 每个模块都可以独立测试
4. **易于扩展**: 新功能可以通过添加新模块实现

### 7.2 避免的Python版本问题

1. **避免过度细分**: 不再创建过多的子模块
2. **避免职责重叠**: 每个模块都有明确的职责
3. **避免复杂依赖**: 简化的依赖关系
4. **避免技术泄露**: 领域层不包含技术实现

### 7.3 Rust特性利用

1. **模块系统**: 利用Rust的模块系统组织代码
2. **类型安全**: 编译时检查模块间依赖
3. **零成本抽象**: 模块边界不影响运行时性能
4. **并发安全**: 模块间安全的数据共享

这个模块设计为Rust版本提供了清晰的组织结构，避免了Python版本的过度设计问题。