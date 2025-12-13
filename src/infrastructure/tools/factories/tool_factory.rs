use std::collections::HashMap;
use std::sync::Arc;
use async_trait::async_trait;
use tracing::{info, warn, error};

use crate::domain::tools::{
    Tool as DomainTool, ToolType, ToolConfig, ToolExecutionResult, ToolExecutionError,
    SerializedValue, ToolFactoryError
};
use crate::infrastructure::tools::executors::ToolExecutor;
use crate::infrastructure::tools::types::builtin::BuiltinTool;

/// 工具工厂
pub struct ToolFactory {
    /// 执行器映射
    executors: HashMap<ToolType, Arc<dyn ToolExecutor>>,
    /// 内置工具映射
    builtin_tools: HashMap<String, Arc<dyn BuiltinTool>>,
}

impl ToolFactory {
    /// 创建新的工具工厂
    pub fn new() -> Self {
        Self {
            executors: HashMap::new(),
            builtin_tools: HashMap::new(),
        }
    }

    /// 注册执行器
    pub fn register_executor(&mut self, tool_type: ToolType, executor: Arc<dyn ToolExecutor>) {
        if self.executors.contains_key(&tool_type) {
            warn!("执行器已存在，将被覆盖: {:?}", tool_type);
        }
        self.executors.insert(tool_type.clone(), executor);
        info!("注册执行器: {:?}", tool_type);
    }

    /// 注册内置工具
    pub fn register_builtin_tool(&mut self, tool: Arc<dyn BuiltinTool>) {
        let name = tool.name().to_string();
        if self.builtin_tools.contains_key(&name) {
            warn!("内置工具已存在，将被覆盖: {}", name);
        }
        self.builtin_tools.insert(name.clone(), tool);
        info!("注册内置工具: {}", name);
    }

    /// 创建工具实例
    pub async fn create_tool(
        &self,
        tool_type: ToolType,
        name: String,
        config: ToolConfig,
        metadata: crate::domain::tools::ToolMetadata,
    ) -> Result<Arc<dyn ToolInterface>, ToolFactoryError> {
        info!("创建工具: {} ({:?})", name, tool_type);

        // 根据工具类型创建不同的工具实例
        match tool_type {
            ToolType::Builtin => {
                // 获取内置工具实现
                let builtin_tool = self.builtin_tools.get(&name)
                    .ok_or_else(|| ToolFactoryError::creation_failed(
                        format!("未找到内置工具: {}", name)
                    ))?;
                
                // 创建内置工具实例
                let tool = BuiltinToolInstance::new(
                    name,
                    config,
                    metadata,
                    builtin_tool.clone(),
                );
                
                Ok(Arc::new(tool))
            }
            ToolType::Rest => {
                // 创建REST工具实例
                let executor = self.executors.get(&tool_type)
                    .ok_or_else(|| ToolFactoryError::unsupported_tool_type(
                        "未找到REST执行器".to_string()
                    ))?;
                
                let tool = RestToolInstance::new(
                    name,
                    config,
                    metadata,
                    executor.clone(),
                );
                
                Ok(Arc::new(tool))
            }
            ToolType::Native => {
                // 创建原生工具实例
                let executor = self.executors.get(&tool_type)
                    .ok_or_else(|| ToolFactoryError::unsupported_tool_type(
                        "未找到Native执行器".to_string()
                    ))?;
                
                let tool = NativeToolInstance::new(
                    name,
                    config,
                    metadata,
                    executor.clone(),
                );
                
                Ok(Arc::new(tool))
            }
            ToolType::Mcp => {
                // 创建MCP工具实例
                let executor = self.executors.get(&tool_type)
                    .ok_or_else(|| ToolFactoryError::unsupported_tool_type(
                        "未找到MCP执行器".to_string()
                    ))?;
                
                let tool = McpToolInstance::new(
                    name,
                    config,
                    metadata,
                    executor.clone(),
                );
                
                Ok(Arc::new(tool))
            }
        }
    }

    /// 检查是否支持指定的工具类型
    pub fn supports_tool_type(&self, tool_type: &ToolType) -> bool {
        self.executors.contains_key(tool_type) || *tool_type == ToolType::Builtin
    }

    /// 获取支持的工具类型列表
    pub fn supported_tool_types(&self) -> Vec<ToolType> {
        let mut types = self.executors.keys().cloned().collect::<Vec<_>>();
        if !self.builtin_tools.is_empty() && !types.contains(&ToolType::Builtin) {
            types.push(ToolType::Builtin);
        }
        types
    }
}

/// 工具接口
#[async_trait]
pub trait ToolInterface: Send + Sync {
    /// 获取工具名称
    fn name(&self) -> &str;
    
    /// 获取工具类型
    fn tool_type(&self) -> ToolType;
    
    /// 获取工具配置
    fn config(&self) -> &ToolConfig;
    
    /// 获取工具元数据
    fn metadata(&self) -> &crate::domain::tools::ToolMetadata;
    
    /// 执行工具
    async fn execute(&self, parameters: HashMap<String, SerializedValue>) -> Result<ToolExecutionResult, ToolExecutionError>;
    
    /// 验证工具是否可执行
    async fn can_execute(&self) -> Result<bool, ToolExecutionError>;
}

/// 内置工具实例
pub struct BuiltinToolInstance {
    name: String,
    config: ToolConfig,
    metadata: crate::domain::tools::ToolMetadata,
    builtin_tool: Arc<dyn BuiltinTool>,
}

impl BuiltinToolInstance {
    pub fn new(
        name: String,
        config: ToolConfig,
        metadata: crate::domain::tools::ToolMetadata,
        builtin_tool: Arc<dyn BuiltinTool>,
    ) -> Self {
        Self {
            name,
            config,
            metadata,
            builtin_tool,
        }
    }
}

#[async_trait]
impl ToolInterface for BuiltinToolInstance {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn tool_type(&self) -> ToolType {
        ToolType::Builtin
    }
    
    fn config(&self) -> &ToolConfig {
        &self.config
    }
    
    fn metadata(&self) -> &crate::domain::tools::ToolMetadata {
        &self.metadata
    }
    
    async fn execute(&self, parameters: HashMap<String, SerializedValue>) -> Result<ToolExecutionResult, ToolExecutionError> {
        self.builtin_tool.execute(parameters).await
            .map(|result| ToolExecutionResult::success(result, std::time::Duration::from_millis(0)))
            .map_err(|e| {
                // 转换错误类型
                match e {
                    ToolExecutionError::EnvironmentError(msg) =>
                        ToolExecutionError::environment_error(msg),
                    ToolExecutionError::SerializationError(msg) =>
                        ToolExecutionError::serialization_error(msg),
                    _ => e,
                }
            })
    }
    
    async fn can_execute(&self) -> Result<bool, ToolExecutionError> {
        Ok(true) // 内置工具总是可执行的
    }
}

/// REST工具实例
pub struct RestToolInstance {
    name: String,
    config: ToolConfig,
    metadata: crate::domain::tools::ToolMetadata,
    executor: Arc<dyn ToolExecutor>,
}

impl RestToolInstance {
    pub fn new(
        name: String,
        config: ToolConfig,
        metadata: crate::domain::tools::ToolMetadata,
        executor: Arc<dyn ToolExecutor>,
    ) -> Self {
        Self {
            name,
            config,
            metadata,
            executor,
        }
    }
}

#[async_trait]
impl ToolInterface for RestToolInstance {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn tool_type(&self) -> ToolType {
        ToolType::Rest
    }
    
    fn config(&self) -> &ToolConfig {
        &self.config
    }
    
    fn metadata(&self) -> &crate::domain::tools::ToolMetadata {
        &self.metadata
    }
    
    async fn execute(&self, parameters: HashMap<String, SerializedValue>) -> Result<ToolExecutionResult, ToolExecutionError> {
        // 创建临时工具实体
        let tool = DomainTool {
            id: crate::domain::common::id::ToolId::new(),
            name: self.name.clone(),
            tool_type: ToolType::Rest,
            config: self.config.clone(),
            metadata: self.metadata.clone(),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        self.executor.execute(&tool, parameters).await
    }
    
    async fn can_execute(&self) -> Result<bool, ToolExecutionError> {
        // 创建临时工具实体
        let tool = DomainTool {
            id: crate::domain::common::id::ToolId::new(),
            name: self.name.clone(),
            tool_type: ToolType::Rest,
            config: self.config.clone(),
            metadata: self.metadata.clone(),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        self.executor.can_execute(&tool).await
    }
}

/// 原生工具实例
pub struct NativeToolInstance {
    name: String,
    config: ToolConfig,
    metadata: crate::domain::tools::ToolMetadata,
    executor: Arc<dyn ToolExecutor>,
}

impl NativeToolInstance {
    pub fn new(
        name: String,
        config: ToolConfig,
        metadata: crate::domain::tools::ToolMetadata,
        executor: Arc<dyn ToolExecutor>,
    ) -> Self {
        Self {
            name,
            config,
            metadata,
            executor,
        }
    }
}

#[async_trait]
impl ToolInterface for NativeToolInstance {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn tool_type(&self) -> ToolType {
        ToolType::Native
    }
    
    fn config(&self) -> &ToolConfig {
        &self.config
    }
    
    fn metadata(&self) -> &crate::domain::tools::ToolMetadata {
        &self.metadata
    }
    
    async fn execute(&self, parameters: HashMap<String, SerializedValue>) -> Result<ToolExecutionResult, ToolExecutionError> {
        // 创建临时工具实体
        let tool = DomainTool {
            id: crate::domain::common::id::ToolId::new(),
            name: self.name.clone(),
            tool_type: ToolType::Native,
            config: self.config.clone(),
            metadata: self.metadata.clone(),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        self.executor.execute(&tool, parameters).await
    }
    
    async fn can_execute(&self) -> Result<bool, ToolExecutionError> {
        // 创建临时工具实体
        let tool = DomainTool {
            id: crate::domain::common::id::ToolId::new(),
            name: self.name.clone(),
            tool_type: ToolType::Native,
            config: self.config.clone(),
            metadata: self.metadata.clone(),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        self.executor.can_execute(&tool).await
    }
}

/// MCP工具实例
pub struct McpToolInstance {
    name: String,
    config: ToolConfig,
    metadata: crate::domain::tools::ToolMetadata,
    executor: Arc<dyn ToolExecutor>,
}

impl McpToolInstance {
    pub fn new(
        name: String,
        config: ToolConfig,
        metadata: crate::domain::tools::ToolMetadata,
        executor: Arc<dyn ToolExecutor>,
    ) -> Self {
        Self {
            name,
            config,
            metadata,
            executor,
        }
    }
}

#[async_trait]
impl ToolInterface for McpToolInstance {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn tool_type(&self) -> ToolType {
        ToolType::Mcp
    }
    
    fn config(&self) -> &ToolConfig {
        &self.config
    }
    
    fn metadata(&self) -> &crate::domain::tools::ToolMetadata {
        &self.metadata
    }
    
    async fn execute(&self, parameters: HashMap<String, SerializedValue>) -> Result<ToolExecutionResult, ToolExecutionError> {
        // 创建临时工具实体
        let tool = DomainTool {
            id: crate::domain::common::id::ToolId::new(),
            name: self.name.clone(),
            tool_type: ToolType::Mcp,
            config: self.config.clone(),
            metadata: self.metadata.clone(),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        self.executor.execute(&tool, parameters).await
    }
    
    async fn can_execute(&self) -> Result<bool, ToolExecutionError> {
        // 创建临时工具实体
        let tool = DomainTool {
            id: crate::domain::common::id::ToolId::new(),
            name: self.name.clone(),
            tool_type: ToolType::Mcp,
            config: self.config.clone(),
            metadata: self.metadata.clone(),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        self.executor.can_execute(&tool).await
    }
}

impl Default for ToolFactory {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::tools::executors::{BuiltinToolExecutor, RestToolExecutor};
    use crate::infrastructure::tools::types::builtin::MockBuiltinTool;

    #[tokio::test]
    async fn test_tool_factory() {
        let mut factory = ToolFactory::new();
        
        // 注册执行器
        factory.register_executor(ToolType::Builtin, Arc::new(BuiltinToolExecutor::new()));
        factory.register_executor(ToolType::Rest, Arc::new(RestToolExecutor::new()));
        
        // 注册内置工具
        let mock_tool = Arc::new(MockBuiltinTool::new("test_tool".to_string()));
        factory.register_builtin_tool(mock_tool);
        
        // 测试支持的类型
        assert!(factory.supports_tool_type(&ToolType::Builtin));
        assert!(factory.supports_tool_type(&ToolType::Rest));
        assert!(!factory.supports_tool_type(&ToolType::Native));
        
        // 创建内置工具
        let config = crate::domain::tools::ToolConfig::new();
        let metadata = crate::domain::tools::ToolMetadata::new(
            "测试工具".to_string(),
            "1.0.0".parse().unwrap(),
        );
        
        let tool = factory.create_tool(
            ToolType::Builtin,
            "test_tool".to_string(),
            config.clone(),
            metadata.clone(),
        ).await.unwrap();
        
        assert_eq!(tool.name(), "test_tool");
        assert_eq!(tool.tool_type(), ToolType::Builtin);
        
        // 创建不存在的工具
        let result = factory.create_tool(
            ToolType::Builtin,
            "nonexistent_tool".to_string(),
            config,
            metadata,
        ).await;
        
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_tool_factory_unsupported_type() {
        let factory = ToolFactory::new();
        
        let config = crate::domain::tools::ToolConfig::new();
        let metadata = crate::domain::tools::ToolMetadata::new(
            "测试工具".to_string(),
            "1.0.0".parse().unwrap(),
        );
        
        // 尝试创建不支持的类型
        let result = factory.create_tool(
            ToolType::Native,
            "test_tool".to_string(),
            config,
            metadata,
        ).await;
        
        assert!(result.is_err());
    }
}