use std::collections::HashMap;
use std::sync::Arc;
use async_trait::async_trait;
use tracing::{info, warn, error};

use crate::domain::tools::{
    Tool, ToolExecutionResult, ToolExecutionError, SerializedValue, ToolType
};
use crate::infrastructure::tools::executors::ToolExecutor;
use crate::infrastructure::tools::types::builtin::BuiltinTool;

/// 内置工具执行器
pub struct BuiltinToolExecutor {
    /// 内置工具映射
    builtin_tools: HashMap<String, Arc<dyn BuiltinTool>>,
}

impl BuiltinToolExecutor {
    /// 创建新的内置工具执行器
    pub fn new() -> Self {
        Self {
            builtin_tools: HashMap::new(),
        }
    }

    /// 注册内置工具
    pub fn register_tool(&mut self, tool: Arc<dyn BuiltinTool>) {
        let name = tool.name();
        if self.builtin_tools.contains_key(name) {
            warn!("内置工具已存在，将被覆盖: {}", name);
        }
        self.builtin_tools.insert(name.to_string(), tool);
        info!("注册内置工具: {}", name);
    }

    /// 获取已注册的工具列表
    pub fn list_tools(&self) -> Vec<String> {
        self.builtin_tools.keys().cloned().collect()
    }

    /// 检查工具是否存在
    pub fn has_tool(&self, name: &str) -> bool {
        self.builtin_tools.contains_key(name)
    }
}

#[async_trait]
impl ToolExecutor for BuiltinToolExecutor {
    /// 执行工具
    async fn execute(
        &self,
        tool: &Tool,
        parameters: HashMap<String, SerializedValue>,
    ) -> Result<ToolExecutionResult, ToolExecutionError> {
        let start_time = std::time::Instant::now();
        
        // 检查工具类型
        if tool.tool_type != ToolType::Builtin {
            return Err(ToolExecutionError::environment_error(
                format!("工具类型不匹配，期望 Builtin，实际 {:?}", tool.tool_type)
            ));
        }
        
        // 获取内置工具实现
        let builtin_tool = self.builtin_tools.get(&tool.name)
            .ok_or_else(|| ToolExecutionError::environment_error(
                format!("未找到内置工具: {}", tool.name)
            ))?;
        
        info!("执行内置工具: {}", tool.name);
        
        // 执行工具
        let result = match builtin_tool.execute(parameters).await {
            Ok(output) => {
                let execution_time = start_time.elapsed();
                info!("内置工具执行成功: {}, 耗时: {:?}", tool.name, execution_time);
                ToolExecutionResult::success(output, execution_time)
            }
            Err(e) => {
                let execution_time = start_time.elapsed();
                error!("内置工具执行失败: {}, 错误: {}, 耗时: {:?}", tool.name, e, execution_time);
                ToolExecutionResult::failure(
                    crate::domain::tools::value_objects::ToolError::new(
                        "BUILTIN_EXECUTION_ERROR".to_string(),
                        e.to_string(),
                    ),
                    execution_time,
                )
            }
        };
        
        Ok(result)
    }

    /// 验证工具是否可执行
    async fn can_execute(&self, tool: &Tool) -> Result<bool, ToolExecutionError> {
        // 检查工具类型
        if tool.tool_type != ToolType::Builtin {
            return Ok(false);
        }
        
        // 检查工具是否存在
        Ok(self.builtin_tools.contains_key(&tool.name))
    }

    /// 获取工具执行状态
    async fn get_execution_status(&self, execution_id: &str) -> Result<Option<String>, ToolExecutionError> {
        // 内置工具通常是同步执行的，不支持状态查询
        warn!("内置工具不支持执行状态查询: {}", execution_id);
        Ok(None)
    }
}

impl Default for BuiltinToolExecutor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::tools::types::builtin::MockBuiltinTool;
    use std::time::Duration;

    #[tokio::test]
    async fn test_builtin_tool_executor() {
        let mut executor = BuiltinToolExecutor::new();
        
        // 注册测试工具
        let test_tool = Arc::new(MockBuiltinTool::new("test_tool".to_string()));
        executor.register_tool(test_tool.clone());
        
        // 创建工具实体
        let tool = Tool {
            id: crate::domain::common::id::ToolId::new(),
            name: "test_tool".to_string(),
            tool_type: ToolType::Builtin,
            config: crate::domain::tools::ToolConfig::new(),
            metadata: crate::domain::tools::ToolMetadata::new(
                "测试工具".to_string(),
                "1.0.0".parse().unwrap(),
            ),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        // 测试工具是否可执行
        assert!(executor.can_execute(&tool).await.unwrap());
        
        // 测试执行工具
        let mut parameters = HashMap::new();
        parameters.insert("input".to_string(), SerializedValue::String("测试".to_string()));
        
        let result = executor.execute(&tool, parameters).await.unwrap();
        assert!(result.success);
        
        // 测试不存在的工具
        let unknown_tool = Tool {
            id: crate::domain::common::id::ToolId::new(),
            name: "unknown_tool".to_string(),
            tool_type: ToolType::Builtin,
            config: crate::domain::tools::ToolConfig::new(),
            metadata: crate::domain::tools::ToolMetadata::new(
                "未知工具".to_string(),
                "1.0.0".parse().unwrap(),
            ),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        assert!(!executor.can_execute(&unknown_tool).await.unwrap());
    }

    #[tokio::test]
    async fn test_builtin_tool_executor_wrong_type() {
        let executor = BuiltinToolExecutor::new();
        
        // 创建非内置工具
        let tool = Tool {
            id: crate::domain::common::id::ToolId::new(),
            name: "rest_tool".to_string(),
            tool_type: ToolType::Rest,
            config: crate::domain::tools::ToolConfig::new(),
            metadata: crate::domain::tools::ToolMetadata::new(
                "REST工具".to_string(),
                "1.0.0".parse().unwrap(),
            ),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        // 测试工具是否可执行
        assert!(!executor.can_execute(&tool).await.unwrap());
        
        // 测试执行工具（应该失败）
        let parameters = HashMap::new();
        let result = executor.execute(&tool, parameters).await;
        assert!(result.is_err());
    }
}