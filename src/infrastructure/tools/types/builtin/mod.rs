use std::collections::HashMap;
use async_trait::async_trait;

use crate::domain::tools::{
    ToolExecutionResult, ToolExecutionError, SerializedValue
};

/// 内置工具接口
#[async_trait]
pub trait BuiltinTool: Send + Sync {
    /// 获取工具名称
    fn name(&self) -> &str;
    
    /// 获取工具描述
    fn description(&self) -> &str {
        "内置工具"
    }
    
    /// 获取工具版本
    fn version(&self) -> &str {
        "1.0.0"
    }
    
    /// 执行工具
    async fn execute(&self, parameters: HashMap<String, SerializedValue>) -> Result<SerializedValue, ToolExecutionError>;
    
    /// 验证参数
    async fn validate_parameters(&self, parameters: &HashMap<String, SerializedValue>) -> Result<(), ToolExecutionError> {
        // 默认实现：不验证参数
        let _ = parameters;
        Ok(())
    }
}

// 导出具体实现
pub mod calculator;
pub mod text_processor;
pub mod mock;

pub use calculator::CalculatorTool;
pub use text_processor::TextProcessorTool;
pub use mock::MockBuiltinTool;