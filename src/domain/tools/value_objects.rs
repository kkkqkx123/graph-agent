use std::collections::HashMap;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use semver::Version;

/// 工具配置
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolConfig {
    /// 参数定义
    pub parameters: HashMap<String, ParameterDefinition>,
    /// 必需参数列表
    pub required_parameters: Vec<String>,
    /// 可选参数列表
    pub optional_parameters: Vec<String>,
}

/// 工具元数据
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolMetadata {
    /// 工具描述
    pub description: String,
    /// 工具版本
    pub version: Version,
    /// 工具作者
    pub author: Option<String>,
    /// 工具标签
    pub tags: Vec<String>,
}

/// 工具执行结果
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolExecutionResult {
    /// 执行是否成功
    pub success: bool,
    /// 执行输出
    pub output: SerializedValue,
    /// 执行错误（如果有）
    pub error: Option<ToolError>,
    /// 执行时间
    pub execution_time: Duration,
    /// 令牌使用情况（如果适用）
    pub token_usage: Option<TokenUsage>,
}

/// 参数定义
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ParameterDefinition {
    /// 参数名称
    pub name: String,
    /// 参数类型
    pub parameter_type: ParameterType,
    /// 是否必需
    pub required: bool,
    /// 默认值
    pub default_value: Option<SerializedValue>,
    /// 参数描述
    pub description: Option<String>,
}

/// 参数类型
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ParameterType {
    /// 字符串类型
    String,
    /// 数字类型
    Number,
    /// 布尔类型
    Boolean,
    /// 数组类型
    Array,
    /// 对象类型
    Object,
}

/// 序列化值
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SerializedValue {
    /// 空值
    Null,
    /// 布尔值
    Bool(bool),
    /// 数字值
    Number(f64),
    /// 字符串值
    String(String),
    /// 数组值
    Array(Vec<SerializedValue>),
    /// 对象值
    Object(HashMap<String, SerializedValue>),
}

/// 工具错误
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolError {
    /// 错误代码
    pub code: String,
    /// 错误消息
    pub message: String,
    /// 错误详情
    pub details: Option<HashMap<String, SerializedValue>>,
}

/// 令牌使用情况
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TokenUsage {
    /// 提示令牌数
    pub prompt_tokens: u32,
    /// 完成令牌数
    pub completion_tokens: u32,
    /// 总令牌数
    pub total_tokens: u32,
}

impl ToolConfig {
    /// 创建新的工具配置
    pub fn new() -> Self {
        Self {
            parameters: HashMap::new(),
            required_parameters: Vec::new(),
            optional_parameters: Vec::new(),
        }
    }

    /// 添加参数定义
    pub fn add_parameter(&mut self, param: ParameterDefinition) {
        if param.required {
            if !self.required_parameters.contains(&param.name) {
                self.required_parameters.push(param.name.clone());
            }
        } else {
            if !self.optional_parameters.contains(&param.name) {
                self.optional_parameters.push(param.name.clone());
            }
        }
        self.parameters.insert(param.name.clone(), param);
    }

    /// 获取参数定义
    pub fn get_parameter(&self, name: &str) -> Option<&ParameterDefinition> {
        self.parameters.get(name)
    }

    /// 验证参数
    pub fn validate_parameters(&self, provided: &HashMap<String, SerializedValue>) -> Result<(), ValidationError> {
        // 检查必需参数是否都提供了
        for required_param in &self.required_parameters {
            if !provided.contains_key(required_param) {
                return Err(ValidationError::MissingRequiredParameter(required_param.clone()));
            }
        }

        // 检查提供的参数是否都在定义中
        for (param_name, param_value) in provided {
            if let Some(param_def) = self.get_parameter(param_name) {
                // 验证参数类型
                if !self.validate_parameter_type(param_value, &param_def.parameter_type) {
                    return Err(ValidationError::InvalidParameterType {
                        name: param_name.clone(),
                        expected: param_def.parameter_type.clone(),
                        actual: self.get_value_type(param_value),
                    });
                }
            } else {
                return Err(ValidationError::UnknownParameter(param_name.clone()));
            }
        }

        Ok(())
    }

    /// 验证参数类型
    fn validate_parameter_type(&self, value: &SerializedValue, expected_type: &ParameterType) -> bool {
        match (value, expected_type) {
            (SerializedValue::String(_), ParameterType::String) => true,
            (SerializedValue::Number(_), ParameterType::Number) => true,
            (SerializedValue::Bool(_), ParameterType::Boolean) => true,
            (SerializedValue::Array(_), ParameterType::Array) => true,
            (SerializedValue::Object(_), ParameterType::Object) => true,
            _ => false,
        }
    }

    /// 获取值的类型
    fn get_value_type(&self, value: &SerializedValue) -> ParameterType {
        match value {
            SerializedValue::String(_) => ParameterType::String,
            SerializedValue::Number(_) => ParameterType::Number,
            SerializedValue::Bool(_) => ParameterType::Boolean,
            SerializedValue::Array(_) => ParameterType::Array,
            SerializedValue::Object(_) => ParameterType::Object,
            SerializedValue::Null => ParameterType::String, // 默认为字符串类型
        }
    }
}

impl ToolMetadata {
    /// 创建新的工具元数据
    pub fn new(description: String, version: Version) -> Self {
        Self {
            description,
            version,
            author: None,
            tags: Vec::new(),
        }
    }

    /// 设置作者
    pub fn with_author(mut self, author: String) -> Self {
        self.author = Some(author);
        self
    }

    /// 添加标签
    pub fn with_tag(mut self, tag: String) -> Self {
        self.tags.push(tag);
        self
    }

    /// 添加多个标签
    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags.extend(tags);
        self
    }
}

impl ToolExecutionResult {
    /// 创建成功的执行结果
    pub fn success(output: SerializedValue, execution_time: Duration) -> Self {
        Self {
            success: true,
            output,
            error: None,
            execution_time,
            token_usage: None,
        }
    }

    /// 创建成功的执行结果（带令牌使用情况）
    pub fn success_with_tokens(
        output: SerializedValue,
        execution_time: Duration,
        token_usage: TokenUsage,
    ) -> Self {
        Self {
            success: true,
            output,
            error: None,
            execution_time,
            token_usage: Some(token_usage),
        }
    }

    /// 创建失败的执行结果
    pub fn failure(error: ToolError, execution_time: Duration) -> Self {
        Self {
            success: false,
            output: SerializedValue::Null,
            error: Some(error),
            execution_time,
            token_usage: None,
        }
    }
}

impl ToolError {
    /// 创建新的工具错误
    pub fn new(code: String, message: String) -> Self {
        Self {
            code,
            message,
            details: None,
        }
    }

    /// 带详情的工具错误
    pub fn with_details(mut self, details: HashMap<String, SerializedValue>) -> Self {
        self.details = Some(details);
        self
    }
}

impl TokenUsage {
    /// 创建新的令牌使用情况
    pub fn new(prompt_tokens: u32, completion_tokens: u32) -> Self {
        let total_tokens = prompt_tokens + completion_tokens;
        Self {
            prompt_tokens,
            completion_tokens,
            total_tokens,
        }
    }
}

/// 验证错误
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum ValidationError {
    #[error("缺少必需参数: {0}")]
    MissingRequiredParameter(String),
    
    #[error("参数类型不匹配: 名称 {name}, 期望 {expected:?}, 实际 {actual:?}")]
    InvalidParameterType {
        name: String,
        expected: ParameterType,
        actual: ParameterType,
    },
    
    #[error("未知参数: {0}")]
    UnknownParameter(String),
}

impl Default for ToolConfig {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_config() {
        let mut config = ToolConfig::new();
        
        // 添加参数定义
        let string_param = ParameterDefinition {
            name: "text".to_string(),
            parameter_type: ParameterType::String,
            required: true,
            default_value: None,
            description: Some("文本参数".to_string()),
        };
        
        config.add_parameter(string_param);
        
        // 验证参数
        let mut params = HashMap::new();
        params.insert("text".to_string(), SerializedValue::String("测试".to_string()));
        
        assert!(config.validate_parameters(&params).is_ok());
        
        // 测试缺少必需参数
        let empty_params = HashMap::new();
        assert!(config.validate_parameters(&empty_params).is_err());
    }

    #[test]
    fn test_tool_execution_result() {
        let output = SerializedValue::String("测试结果".to_string());
        let duration = Duration::from_millis(100);
        
        let success_result = ToolExecutionResult::success(output.clone(), duration);
        assert!(success_result.success);
        assert_eq!(success_result.output, output);
        
        let error = ToolError::new("TEST_ERROR".to_string(), "测试错误".to_string());
        let failure_result = ToolExecutionResult::failure(error, duration);
        assert!(!failure_result.success);
        assert!(failure_result.error.is_some());
    }
}