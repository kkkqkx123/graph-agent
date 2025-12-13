use std::collections::HashMap;
use async_trait::async_trait;

use crate::domain::tools::{
    Tool, ToolExecutionResult, ToolExecutionError, SerializedValue
};

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

// 导出具体实现
pub mod builtin_executor;
pub mod rest_executor;

pub use builtin_executor::BuiltinToolExecutor;
pub use rest_executor::RestToolExecutor;