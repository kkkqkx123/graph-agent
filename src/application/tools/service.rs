use std::collections::HashMap;
use std::sync::Arc;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error};

use crate::domain::common::id::ToolId;
use crate::domain::tools::{
    Tool, ToolType, ToolRegistry, ToolConfig, ToolMetadata, ToolExecutionResult,
    ToolError, ToolValidationError, ToolExecutionError, ToolRegistryError,
    SerializedValue, ParameterDefinition, ParameterType, ValidationError
};
use crate::application::tools::commands::{
    ExecuteToolCommand, RegisterToolCommand, UnregisterToolCommand, UpdateToolConfigCommand
};
use crate::application::tools::queries::{
    GetToolQuery, ListToolsQuery, GetToolsByTypeQuery, ToolFilters
};
use crate::application::tools::dto::{
    ExecuteToolRequest, ExecuteToolResponse, RegisterToolRequest, RegisterToolResponse,
    UpdateToolConfigRequest, UpdateToolConfigResponse, ToolDto
};

/// 工具仓储接口
#[async_trait]
pub trait ToolRepository: Send + Sync {
    /// 保存工具
    async fn save(&self, tool: &Tool) -> Result<(), ToolError>;
    
    /// 根据ID查找工具
    async fn find_by_id(&self, id: &ToolId) -> Result<Option<Tool>, ToolError>;
    
    /// 根据名称查找工具
    async fn find_by_name(&self, name: &str) -> Result<Option<Tool>, ToolError>;
    
    /// 获取所有工具
    async fn find_all(&self) -> Result<Vec<Tool>, ToolError>;
    
    /// 根据类型查找工具
    async fn find_by_type(&self, tool_type: &ToolType) -> Result<Vec<Tool>, ToolError>;
    
    /// 删除工具
    async fn delete(&self, id: &ToolId) -> Result<(), ToolError>;
    
    /// 检查工具名称是否存在
    async fn exists_by_name(&self, name: &str) -> Result<bool, ToolError>;
    
    /// 检查工具ID是否存在
    async fn exists_by_id(&self, id: &ToolId) -> Result<bool, ToolError>;
}

/// 工具执行器接口
#[async_trait]
pub trait ToolExecutor: Send + Sync {
    /// 执行工具
    async fn execute(
        &self,
        tool: &Tool,
        parameters: HashMap<String, SerializedValue>,
    ) -> Result<ToolExecutionResult, ToolExecutionError>;
    
    /// 验证工具是否可执行
    async fn can_execute(&self, tool: &Tool) -> Result<bool, ToolExecutionError>;
    
    /// 获取工具执行状态
    async fn get_execution_status(&self, execution_id: &str) -> Result<Option<String>, ToolExecutionError>;
}

/// 工具验证服务接口
#[async_trait]
pub trait ToolValidationService: Send + Sync {
    /// 验证工具配置
    async fn validate_tool_config(&self, config: &ToolConfig) -> Result<(), ToolValidationError>;
    
    /// 验证工具元数据
    async fn validate_tool_metadata(&self, metadata: &ToolMetadata) -> Result<(), ToolValidationError>;
    
    /// 验证工具参数
    async fn validate_parameters(
        &self,
        parameters: &HashMap<String, SerializedValue>,
        definitions: &[ParameterDefinition],
    ) -> Result<(), ValidationError>;
    
    /// 验证工具完整性
    async fn validate_tool_integrity(&self, tool: &Tool) -> Result<(), ToolValidationError>;
}

/// 工具服务
pub struct ToolService<TR, TE, TV>
where
    TR: ToolRepository + Send + Sync,
    TE: ToolExecutor + Send + Sync,
    TV: ToolValidationService + Send + Sync,
{
    tool_repository: Arc<TR>,
    tool_executor: Arc<TE>,
    validation_service: Arc<TV>,
    tool_registry: Arc<tokio::sync::RwLock<ToolRegistry>>,
}

impl<TR, TE, TV> ToolService<TR, TE, TV>
where
    TR: ToolRepository + Send + Sync,
    TE: ToolExecutor + Send + Sync,
    TV: ToolValidationService + Send + Sync,
{
    /// 创建新的工具服务
    pub fn new(
        tool_repository: Arc<TR>,
        tool_executor: Arc<TE>,
        validation_service: Arc<TV>,
    ) -> Self {
        Self {
            tool_repository,
            tool_executor,
            validation_service,
            tool_registry: Arc::new(tokio::sync::RwLock::new(ToolRegistry::new())),
        }
    }

    /// 执行工具
    pub async fn execute_tool(&self, request: ExecuteToolRequest) -> Result<ExecuteToolResponse, ToolError> {
        info!("执行工具: {}", request.tool_identifier);
        
        // 获取工具
        let tool = self.get_tool_by_id_or_name(&request.tool_identifier).await?;
        
        // 验证参数
        self.validation_service
            .validate_parameters(&request.parameters, &tool.config.parameters.values().cloned().collect::<Vec<_>>())
            .await
            .map_err(|e| ToolError::parameter_validation_failed(e.to_string()))?;
        
        // 检查工具是否可执行
        let can_execute = self.tool_executor.can_execute(&tool).await
            .map_err(|e| ToolError::execution_failed(e.to_string()))?;
        
        if !can_execute {
            return Err(ToolError::tool_state_error("工具当前不可执行"));
        }
        
        // 执行工具
        let result = self.tool_executor.execute(&tool, request.parameters).await
            .map_err(|e| ToolError::execution_failed(e.to_string()))?;
        
        info!("工具执行完成: {}, 成功: {}", tool.id, result.success);
        
        Ok(ExecuteToolResponse {
            tool_id: tool.id,
            tool_name: tool.name,
            result,
        })
    }

    /// 注册工具
    pub async fn register_tool(&self, request: RegisterToolRequest) -> Result<RegisterToolResponse, ToolError> {
        info!("注册工具: {}", request.name);
        
        // 验证工具配置
        self.validation_service
            .validate_tool_config(&request.config)
            .await
            .map_err(|e| ToolError::invalid_tool_config(e.to_string()))?;
        
        // 验证工具元数据
        self.validation_service
            .validate_tool_metadata(&request.metadata)
            .await
            .map_err(|e| ToolError::invalid_tool_config(e.to_string()))?;
        
        // 检查工具名称是否已存在
        let exists = self.tool_repository.exists_by_name(&request.name).await?;
        if exists {
            return Err(ToolError::registration_failed("工具名称已存在"));
        }
        
        // 创建工具实体
        let tool = Tool {
            id: ToolId::new(),
            name: request.name.clone(),
            tool_type: request.tool_type,
            config: request.config,
            metadata: request.metadata,
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        // 验证工具完整性
        self.validation_service
            .validate_tool_integrity(&tool)
            .await
            .map_err(|e| ToolError::registration_failed(e.to_string()))?;
        
        // 保存工具
        self.tool_repository.save(&tool).await?;
        
        // 注册到内存注册表
        {
            let mut registry = self.tool_registry.write().await;
            registry.register_tool(tool.clone()).map_err(|e| {
                match e {
                    ToolRegistryError::ToolNameAlreadyExists(_) =>
                        ToolError::registration_failed("工具名称已存在于内存注册表"),
                    ToolRegistryError::ToolIdAlreadyExists(_) =>
                        ToolError::registration_failed("工具ID已存在于内存注册表"),
                    ToolRegistryError::ToolNotFound(_) =>
                        ToolError::internal_error("内存注册表状态不一致"),
                    ToolRegistryError::RegistryFull =>
                        ToolError::internal_error("内存注册表已满"),
                    ToolRegistryError::RegistryUnavailable(msg) =>
                        ToolError::internal_error(format!("内存注册表不可用: {}", msg)),
                }
            })?;
        }
        
        info!("工具注册成功: {} ({})", tool.name, tool.id);
        
        Ok(RegisterToolResponse {
            tool_id: tool.id,
            tool_name: tool.name,
        })
    }

    /// 注销工具
    pub async fn unregister_tool(&self, command: UnregisterToolCommand) -> Result<(), ToolError> {
        info!("注销工具: {}", command.tool_id);
        
        // 检查工具是否存在
        let tool = self.tool_repository.find_by_id(&command.tool_id).await?
            .ok_or_else(|| ToolError::tool_not_found(command.tool_id))?;
        
        // 从数据库删除
        self.tool_repository.delete(&command.tool_id).await?;
        
        // 从内存注册表删除
        {
            let mut registry = self.tool_registry.write().await;
            registry.unregister_tool(&command.tool_id).map_err(|e| {
                match e {
                    ToolRegistryError::ToolNotFound(_) =>
                        warn!("工具不存在于内存注册表中: {}", command.tool_id),
                    _ =>
                        error!("从内存注册表删除工具失败: {:?}", e),
                }
                // 即使内存注册表删除失败，也不影响整体操作
                ToolError::internal_error("内存注册表操作失败")
            })?;
        }
        
        info!("工具注销成功: {} ({})", tool.name, tool.id);
        
        Ok(())
    }

    /// 更新工具配置
    pub async fn update_tool_config(&self, request: UpdateToolConfigRequest) -> Result<UpdateToolConfigResponse, ToolError> {
        info!("更新工具配置: {}", request.tool_id);
        
        // 获取现有工具
        let mut tool = self.tool_repository.find_by_id(&request.tool_id).await?
            .ok_or_else(|| ToolError::tool_not_found(request.tool_id))?;
        
        // 验证新配置
        self.validation_service
            .validate_tool_config(&request.config)
            .await
            .map_err(|e| ToolError::invalid_tool_config(e.to_string()))?;
        
        // 更新配置
        let old_version = tool.metadata.version.to_string();
        tool.config = request.config;
        tool.updated_at = crate::domain::common::timestamp::Timestamp::now();
        
        // 保存更新
        self.tool_repository.save(&tool).await?;
        
        // 更新内存注册表
        {
            let mut registry = self.tool_registry.write().await;
            // 先删除旧的，再注册新的
            registry.unregister_tool(&tool.id).map_err(|e| {
                error!("从内存注册表删除工具失败: {:?}", e);
                ToolError::internal_error("内存注册表操作失败")
            })?;
            registry.register_tool(tool.clone()).map_err(|e| {
                error!("向内存注册表注册工具失败: {:?}", e);
                ToolError::internal_error("内存注册表操作失败")
            })?;
        }
        
        let new_version = tool.metadata.version.to_string();
        
        info!("工具配置更新成功: {} ({})", tool.name, tool.id);
        
        Ok(UpdateToolConfigResponse {
            tool_id: tool.id,
            tool_name: tool.name,
            old_version,
            new_version,
        })
    }

    /// 获取工具
    pub async fn get_tool(&self, query: GetToolQuery) -> Result<Option<ToolDto>, ToolError> {
        let tool = self.get_tool_by_id_or_name(&query.tool_identifier).await?;
        Ok(Some(ToolDto::from(tool)))
    }

    /// 列出工具
    pub async fn list_tools(&self, query: ListToolsQuery) -> Result<Vec<ToolDto>, ToolError> {
        let tools = if let Some(ref tool_type) = query.filters.tool_type {
            self.tool_repository.find_by_type(&tool_type).await?
        } else {
            self.tool_repository.find_all().await?
        };
        
        // 应用过滤器
        let filtered_tools = self.apply_filters(tools, &query.filters.clone());
        
        Ok(filtered_tools.into_iter().map(ToolDto::from).collect())
    }

    /// 根据类型获取工具
    pub async fn get_tools_by_type(&self, query: GetToolsByTypeQuery) -> Result<Vec<ToolDto>, ToolError> {
        let tools = self.tool_repository.find_by_type(&query.tool_type).await?;
        Ok(tools.into_iter().map(ToolDto::from).collect())
    }

    /// 根据ID或名称获取工具
    async fn get_tool_by_id_or_name(&self, identifier: &str) -> Result<Tool, ToolError> {
        // 尝试解析为ToolId
        if let Ok(tool_id) = identifier.parse::<ToolId>() {
            // 先从内存注册表查找
            {
                let registry = self.tool_registry.read().await;
                if let Some(tool) = registry.get_tool_by_id(&tool_id) {
                    return Ok(tool.clone());
                }
            }
            
            // 从数据库查找
            if let Some(tool) = self.tool_repository.find_by_id(&tool_id).await? {
                return Ok(tool);
            }
        }
        
        // 按名称查找
        {
            let registry = self.tool_registry.read().await;
            if let Some(tool) = registry.get_tool_by_name(identifier) {
                return Ok(tool.clone());
            }
        }
        
        // 从数据库按名称查找
        if let Some(tool) = self.tool_repository.find_by_name(identifier).await? {
            return Ok(tool);
        }
        
        Err(ToolError::tool_not_found(ToolId::new())) // 使用临时ID表示未找到
    }

    /// 应用过滤器
    fn apply_filters(&self, tools: Vec<Tool>, filters: &ToolFilters) -> Vec<Tool> {
        tools.into_iter()
            .filter(|tool| {
                // 名称过滤
                if let Some(name_pattern) = &filters.name_pattern {
                    if !tool.name.contains(name_pattern) {
                        return false;
                    }
                }
                
                // 标签过滤
                if !filters.tags.is_empty() {
                    let tool_tags: std::collections::HashSet<_> = tool.metadata.tags.iter().collect();
                    let filter_tags: std::collections::HashSet<_> = filters.tags.iter().collect();
                    if !tool_tags.is_superset(&filter_tags) {
                        return false;
                    }
                }
                
                // 作者过滤
                if let Some(author) = &filters.author {
                    if tool.metadata.author.as_ref() != Some(author) {
                        return false;
                    }
                }
                
                true
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::domain::common::timestamp::Timestamp;
    use crate::domain::tools::value_objects::{ToolError as ToolExecutionErrorValue, TokenUsage};
    use std::time::Duration;

    // 模拟实现
    struct MockToolRepository {
        tools: Arc<tokio::sync::RwLock<HashMap<ToolId, Tool>>>,
        name_to_id: Arc<tokio::sync::RwLock<HashMap<String, ToolId>>>,
    }

    #[async_trait]
    impl ToolRepository for MockToolRepository {
        async fn save(&self, tool: &Tool) -> Result<(), ToolError> {
            let mut tools = self.tools.write().await;
            let mut name_to_id = self.name_to_id.write().await;
            
            tools.insert(tool.id, tool.clone());
            name_to_id.insert(tool.name.clone(), tool.id);
            
            Ok(())
        }
        
        async fn find_by_id(&self, id: &ToolId) -> Result<Option<Tool>, ToolError> {
            let tools = self.tools.read().await;
            Ok(tools.get(id).cloned())
        }
        
        async fn find_by_name(&self, name: &str) -> Result<Option<Tool>, ToolError> {
            let name_to_id = self.name_to_id.read().await;
            if let Some(id) = name_to_id.get(name) {
                let tools = self.tools.read().await;
                Ok(tools.get(id).cloned())
            } else {
                Ok(None)
            }
        }
        
        async fn find_all(&self) -> Result<Vec<Tool>, ToolError> {
            let tools = self.tools.read().await;
            Ok(tools.values().cloned().collect())
        }
        
        async fn find_by_type(&self, tool_type: &ToolType) -> Result<Vec<Tool>, ToolError> {
            let tools = self.tools.read().await;
            Ok(tools.values()
                .filter(|tool| &tool.tool_type == tool_type)
                .cloned()
                .collect())
        }
        
        async fn delete(&self, id: &ToolId) -> Result<(), ToolError> {
            let mut tools = self.tools.write().await;
            let mut name_to_id = self.name_to_id.write().await;
            
            if let Some(tool) = tools.remove(id) {
                name_to_id.remove(&tool.name);
            }
            
            Ok(())
        }
        
        async fn exists_by_name(&self, name: &str) -> Result<bool, ToolError> {
            let name_to_id = self.name_to_id.read().await;
            Ok(name_to_id.contains_key(name))
        }
        
        async fn exists_by_id(&self, id: &ToolId) -> Result<bool, ToolError> {
            let tools = self.tools.read().await;
            Ok(tools.contains_key(id))
        }
    }

    struct MockToolExecutor;

    #[async_trait]
    impl ToolExecutor for MockToolExecutor {
        async fn execute(
            &self,
            tool: &Tool,
            parameters: HashMap<String, SerializedValue>,
        ) -> Result<ToolExecutionResult, ToolExecutionError> {
            // 简单模拟执行
            let output = SerializedValue::String(format!("执行工具: {}", tool.name));
            Ok(ToolExecutionResult::success(output, Duration::from_millis(100)))
        }
        
        async fn can_execute(&self, _tool: &Tool) -> Result<bool, ToolExecutionError> {
            Ok(true)
        }
        
        async fn get_execution_status(&self, _execution_id: &str) -> Result<Option<String>, ToolExecutionError> {
            Ok(Some("completed".to_string()))
        }
    }

    struct MockToolValidationService;

    #[async_trait]
    impl ToolValidationService for MockToolValidationService {
        async fn validate_tool_config(&self, _config: &ToolConfig) -> Result<(), ToolValidationError> {
            Ok(())
        }
        
        async fn validate_tool_metadata(&self, _metadata: &ToolMetadata) -> Result<(), ToolValidationError> {
            Ok(())
        }
        
        async fn validate_parameters(
            &self,
            _parameters: &HashMap<String, SerializedValue>,
            _definitions: &[ParameterDefinition],
        ) -> Result<(), ValidationError> {
            Ok(())
        }
        
        async fn validate_tool_integrity(&self, _tool: &Tool) -> Result<(), ToolValidationError> {
            Ok(())
        }
    }

    #[tokio::test]
    async fn test_register_tool() {
        let repository = Arc::new(MockToolRepository {
            tools: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
            name_to_id: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        });
        
        let executor = Arc::new(MockToolExecutor);
        let validation_service = Arc::new(MockToolValidationService);
        
        let service = ToolService::<MockToolRepository, MockToolExecutor, MockToolValidationService>::new(repository, executor, validation_service);
        
        let request = RegisterToolRequest {
            name: "test_tool".to_string(),
            tool_type: ToolType::Builtin,
            config: ToolConfig::new(),
            metadata: ToolMetadata::new("测试工具".to_string(), "1.0.0".parse().unwrap()),
        };
        
        let response = service.register_tool(request).await.unwrap();
        
        // 验证工具已注册
        let tool = service.get_tool(GetToolQuery {
            tool_identifier: response.tool_name.clone(),
            include_details: false,
        }).await.unwrap().unwrap();
        
        assert_eq!(tool.name, "test_tool");
        assert_eq!(tool.tool_type, ToolType::Builtin);
    }

    #[tokio::test]
    async fn test_execute_tool() {
        let repository = Arc::new(MockToolRepository {
            tools: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
            name_to_id: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        });
        
        let executor = Arc::new(MockToolExecutor);
        let validation_service = Arc::new(MockToolValidationService);
        
        let service = ToolService::<MockToolRepository, MockToolExecutor, MockToolValidationService>::new(repository, executor, validation_service);
        
        // 先注册工具
        let register_request = RegisterToolRequest {
            name: "test_tool".to_string(),
            tool_type: ToolType::Builtin,
            config: ToolConfig::new(),
            metadata: ToolMetadata::new("测试工具".to_string(), "1.0.0".parse().unwrap()),
        };
        
        let register_response = service.register_tool(register_request).await.unwrap();
        
        // 执行工具
        let execute_request = ExecuteToolRequest {
            tool_identifier: register_response.tool_name,
            parameters: HashMap::new(),
            context: None,
            timeout_ms: None,
        };
        
        let response = service.execute_tool(execute_request).await.unwrap();
        
        assert_eq!(response.tool_name, "test_tool");
        assert!(response.result.success);
    }
}