use std::collections::HashMap;
use async_trait::async_trait;

use crate::domain::tools::{
    ToolExecutionResult, ToolExecutionError, SerializedValue
};
use crate::infrastructure::tools::types::builtin::BuiltinTool;

/// 模拟内置工具，用于测试
pub struct MockBuiltinTool {
    name: String,
    description: String,
    version: String,
}

impl MockBuiltinTool {
    /// 创建新的模拟工具
    pub fn new(name: String) -> Self {
        Self {
            name,
            description: "模拟工具，用于测试".to_string(),
            version: "1.0.0".to_string(),
        }
    }
    
    /// 创建带自定义描述的模拟工具
    pub fn with_description(name: String, description: String) -> Self {
        Self {
            name,
            description,
            version: "1.0.0".to_string(),
        }
    }
    
    /// 创建带自定义版本的模拟工具
    pub fn with_version(name: String, version: String) -> Self {
        Self {
            name,
            description: "模拟工具，用于测试".to_string(),
            version,
        }
    }
    
    /// 创建完全自定义的模拟工具
    pub fn new_full(name: String, description: String, version: String) -> Self {
        Self {
            name,
            description,
            version,
        }
    }
}

#[async_trait]
impl BuiltinTool for MockBuiltinTool {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn description(&self) -> &str {
        &self.description
    }
    
    fn version(&self) -> &str {
        &self.version
    }
    
    async fn execute(&self, parameters: HashMap<String, SerializedValue>) -> Result<SerializedValue, ToolExecutionError> {
        // 验证参数
        self.validate_parameters(&parameters).await?;
        
        // 获取输入参数
        let input = parameters.get("input")
            .cloned()
            .unwrap_or_else(|| SerializedValue::String("default".to_string()));
        
        // 创建简单的响应
        let response = format!("Mock tool '{}' executed with input: {:?}", self.name, input);
        
        Ok(SerializedValue::String(response))
    }
    
    async fn validate_parameters(&self, parameters: &HashMap<String, SerializedValue>) -> Result<(), ToolExecutionError> {
        // 模拟工具可以接受任何参数，这里不做验证
        let _ = parameters;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mock_builtin_tool() {
        let tool = MockBuiltinTool::new("test_tool".to_string());
        
        assert_eq!(tool.name(), "test_tool");
        assert_eq!(tool.description(), "模拟工具，用于测试");
        assert_eq!(tool.version(), "1.0.0");
        
        // 测试执行
        let mut parameters = HashMap::new();
        parameters.insert("input".to_string(), SerializedValue::String("test".to_string()));
        
        let result = tool.execute(parameters).await.unwrap();
        
        if let SerializedValue::String(s) = result {
            assert!(s.contains("test_tool"));
            assert!(s.contains("test"));
        } else {
            panic!("Expected string result");
        }
    }

    #[tokio::test]
    async fn test_mock_builtin_tool_with_custom_description() {
        let tool = MockBuiltinTool::with_description(
            "custom_tool".to_string(),
            "自定义描述".to_string(),
        );
        
        assert_eq!(tool.name(), "custom_tool");
        assert_eq!(tool.description(), "自定义描述");
        assert_eq!(tool.version(), "1.0.0");
    }

    #[tokio::test]
    async fn test_mock_builtin_tool_with_custom_version() {
        let tool = MockBuiltinTool::with_version(
            "versioned_tool".to_string(),
            "2.0.0".to_string(),
        );
        
        assert_eq!(tool.name(), "versioned_tool");
        assert_eq!(tool.description(), "模拟工具，用于测试");
        assert_eq!(tool.version(), "2.0.0");
    }

    #[tokio::test]
    async fn test_mock_builtin_tool_full_custom() {
        let tool = MockBuiltinTool::new_full(
            "full_custom_tool".to_string(),
            "完全自定义的工具".to_string(),
            "3.1.4".to_string(),
        );
        
        assert_eq!(tool.name(), "full_custom_tool");
        assert_eq!(tool.description(), "完全自定义的工具");
        assert_eq!(tool.version(), "3.1.4");
    }

    #[tokio::test]
    async fn test_mock_builtin_tool_default_input() {
        let tool = MockBuiltinTool::new("default_test".to_string());
        
        // 不提供输入参数
        let parameters = HashMap::new();
        
        let result = tool.execute(parameters).await.unwrap();
        
        if let SerializedValue::String(s) = result {
            assert!(s.contains("default_test"));
            assert!(s.contains("default"));
        } else {
            panic!("Expected string result");
        }
    }
}