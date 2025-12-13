use std::collections::HashMap;
use async_trait::async_trait;
use regex::Regex;
use tracing::{debug, warn};

use crate::domain::tools::{
    Tool, ToolConfig, ToolMetadata, ParameterDefinition, ParameterType,
    SerializedValue, ValidationError, ToolValidationError
};

/// 工具验证服务
pub struct ToolValidationService {
    /// 名称验证正则表达式
    name_regex: Regex,
    /// 版本验证正则表达式
    version_regex: Regex,
    /// 最大参数数量
    max_parameters: usize,
    /// 最大名称长度
    max_name_length: usize,
    /// 最大描述长度
    max_description_length: usize,
}

impl ToolValidationService {
    /// 创建新的工具验证服务
    pub fn new() -> Self {
        Self {
            name_regex: Regex::new(r"^[a-zA-Z][a-zA-Z0-9_-]*$").unwrap(),
            version_regex: Regex::new(r"^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$").unwrap(),
            max_parameters: 50,
            max_name_length: 100,
            max_description_length: 1000,
        }
    }

    /// 创建带自定义配置的工具验证服务
    pub fn with_config(
        max_parameters: usize,
        max_name_length: usize,
        max_description_length: usize,
    ) -> Self {
        Self {
            name_regex: Regex::new(r"^[a-zA-Z][a-zA-Z0-9_-]*$").unwrap(),
            version_regex: Regex::new(r"^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$").unwrap(),
            max_parameters,
            max_name_length,
            max_description_length,
        }
    }
}

#[async_trait]
impl crate::application::tools::service::ToolValidationService for ToolValidationService {
    /// 验证工具配置
    async fn validate_tool_config(&self, config: &ToolConfig) -> Result<(), ToolValidationError> {
        debug!("验证工具配置");
        
        // 检查参数数量
        if config.parameters.len() > self.max_parameters {
            return Err(ToolValidationError::invalid_parameter_definition(
                format!("参数数量超过限制: {} > {}", config.parameters.len(), self.max_parameters)
            ));
        }
        
        // 检查必需参数和可选参数的一致性
        for param_name in &config.required_parameters {
            if !config.parameters.contains_key(param_name) {
                return Err(ToolValidationError::invalid_parameter_definition(
                    format!("必需参数 '{}' 未在参数定义中找到", param_name)
                ));
            }
        }
        
        for param_name in &config.optional_parameters {
            if !config.parameters.contains_key(param_name) {
                return Err(ToolValidationError::invalid_parameter_definition(
                    format!("可选参数 '{}' 未在参数定义中找到", param_name)
                ));
            }
        }
        
        // 验证每个参数定义
        for (name, param_def) in &config.parameters {
            self.validate_parameter_definition(param_def).await?;
            
            // 检查参数名称一致性
            if name != &param_def.name {
                return Err(ToolValidationError::invalid_parameter_definition(
                    format!("参数键 '{}' 与定义中的名称 '{}' 不匹配", name, param_def.name)
                ));
            }
        }
        
        // 检查参数名称唯一性
        let mut param_names = std::collections::HashSet::new();
        for name in config.parameters.keys() {
            if !param_names.insert(name) {
                return Err(ToolValidationError::invalid_parameter_definition(
                    format!("重复的参数名称: {}", name)
                ));
            }
        }
        
        Ok(())
    }

    /// 验证工具元数据
    async fn validate_tool_metadata(&self, metadata: &ToolMetadata) -> Result<(), ToolValidationError> {
        debug!("验证工具元数据");
        
        // 验证版本格式
        let version_str = metadata.version.to_string();
        if !self.version_regex.is_match(&version_str) {
            return Err(ToolValidationError::invalid_version(
                format!("无效的版本格式: {}", version_str)
            ));
        }
        
        // 验证描述长度
        if metadata.description.len() > self.max_description_length {
            return Err(ToolValidationError::invalid_metadata(
                format!("描述长度超过限制: {} > {}", metadata.description.len(), self.max_description_length)
            ));
        }
        
        // 验证作者名称长度（如果有）
        if let Some(author) = &metadata.author {
            if author.len() > self.max_name_length {
                return Err(ToolValidationError::invalid_metadata(
                    format!("作者名称长度超过限制: {} > {}", author.len(), self.max_name_length)
                ));
            }
        }
        
        // 验证标签
        for tag in &metadata.tags {
            if tag.is_empty() {
                return Err(ToolValidationError::invalid_metadata("标签不能为空".to_string()));
            }
            if tag.len() > 50 {
                return Err(ToolValidationError::invalid_metadata(
                    format!("标签长度超过限制: {} > 50", tag.len())
                ));
            }
        }
        
        // 检查标签唯一性
        let mut tag_set = std::collections::HashSet::new();
        for tag in &metadata.tags {
            if !tag_set.insert(tag) {
                warn!("重复的标签: {}", tag);
            }
        }
        
        Ok(())
    }

    /// 验证工具参数
    async fn validate_parameters(
        &self,
        parameters: &HashMap<String, SerializedValue>,
        definitions: &[ParameterDefinition],
    ) -> Result<(), ValidationError> {
        debug!("验证工具参数");
        
        // 创建参数定义映射
        let param_defs: HashMap<String, &ParameterDefinition> = definitions
            .iter()
            .map(|def| (def.name.clone(), def))
            .collect();
        
        // 检查必需参数
        for def in definitions {
            if def.required && !parameters.contains_key(&def.name) {
                return Err(ValidationError::MissingRequiredParameter(def.name.clone()));
            }
        }
        
        // 检查提供的参数
        for (name, value) in parameters {
            if let Some(def) = param_defs.get(name) {
                // 验证参数类型
                if !self.validate_parameter_type(value, &def.parameter_type) {
                    return Err(ValidationError::InvalidParameterType {
                        name: name.clone(),
                        expected: def.parameter_type.clone(),
                        actual: self.get_value_type(value),
                    });
                }
                
                // 验证数组长度（如果是数组类型）
                if let (SerializedValue::Array(arr), ParameterType::Array) = (value, &def.parameter_type) {
                    if arr.len() > 100 {
                        return Err(ValidationError::InvalidParameterType {
                            name: name.clone(),
                            expected: ParameterType::Array,
                            actual: ParameterType::Array,
                        });
                    }
                }
                
                // 验证对象字段数量（如果是对象类型）
                if let (SerializedValue::Object(obj), ParameterType::Object) = (value, &def.parameter_type) {
                    if obj.len() > 50 {
                        return Err(ValidationError::InvalidParameterType {
                            name: name.clone(),
                            expected: ParameterType::Object,
                            actual: ParameterType::Object,
                        });
                    }
                }
            } else {
                return Err(ValidationError::UnknownParameter(name.clone()));
            }
        }
        
        Ok(())
    }

    /// 验证工具完整性
    async fn validate_tool_integrity(&self, tool: &Tool) -> Result<(), ToolValidationError> {
        debug!("验证工具完整性");
        
        // 验证工具名称
        if tool.name.is_empty() {
            return Err(ToolValidationError::invalid_tool_name("工具名称不能为空".to_string()));
        }
        
        if tool.name.len() > self.max_name_length {
            return Err(ToolValidationError::invalid_tool_name(
                format!("工具名称长度超过限制: {} > {}", tool.name.len(), self.max_name_length)
            ));
        }
        
        if !self.name_regex.is_match(&tool.name) {
            return Err(ToolValidationError::invalid_tool_name(
                format!("无效的工具名称格式: {}", tool.name)
            ));
        }
        
        // 验证工具配置
        self.validate_tool_config(&tool.config).await?;
        
        // 验证工具元数据
        self.validate_tool_metadata(&tool.metadata).await?;
        
        // 验证时间戳
        if tool.updated_at < tool.created_at {
            return Err(ToolValidationError::invalid_metadata(
                "更新时间不能早于创建时间".to_string()
            ));
        }
        
        Ok(())
    }
}

impl ToolValidationService {
    /// 验证参数定义
    async fn validate_parameter_definition(&self, param_def: &ParameterDefinition) -> Result<(), ToolValidationError> {
        // 验证参数名称
        if param_def.name.is_empty() {
            return Err(ToolValidationError::invalid_parameter_definition(
                "参数名称不能为空".to_string()
            ));
        }
        
        if param_def.name.len() > 50 {
            return Err(ToolValidationError::invalid_parameter_definition(
                format!("参数名称长度超过限制: {} > 50", param_def.name.len())
            ));
        }
        
        // 验证参数描述长度（如果有）
        if let Some(description) = &param_def.description {
            if description.len() > 200 {
                return Err(ToolValidationError::invalid_parameter_definition(
                    format!("参数描述长度超过限制: {} > 200", description.len())
                ));
            }
        }
        
        // 验证默认值类型（如果有）
        if let Some(default_value) = &param_def.default_value {
            if !self.validate_parameter_type(default_value, &param_def.parameter_type) {
                return Err(ToolValidationError::invalid_parameter_definition(
                    format!("参数 '{}' 的默认值类型不匹配", param_def.name)
                ));
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
            (SerializedValue::Null, ParameterType::String) => true, // 允许null作为字符串
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
            SerializedValue::Null => ParameterType::String,
        }
    }
}

impl Default for ToolValidationService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::tools::value_objects::ToolError as ToolExecutionErrorValue;
    use semver::Version;

    #[tokio::test]
    async fn test_validate_tool_config() {
        let service = ToolValidationService::new();
        
        // 测试有效配置
        let mut config = ToolConfig::new();
        config.add_parameter(ParameterDefinition {
            name: "text".to_string(),
            parameter_type: ParameterType::String,
            required: true,
            default_value: None,
            description: Some("文本参数".to_string()),
        });
        
        assert!(service.validate_tool_config(&config).await.is_ok());
        
        // 测试无效配置 - 缺少必需参数定义
        let mut invalid_config = ToolConfig::new();
        invalid_config.required_parameters.push("missing_param".to_string());
        
        assert!(service.validate_tool_config(&invalid_config).await.is_err());
    }

    #[tokio::test]
    async fn test_validate_tool_metadata() {
        let service = ToolValidationService::new();
        
        // 测试有效元数据
        let metadata = ToolMetadata::new("测试工具".to_string(), "1.0.0".parse().unwrap())
            .with_author("测试作者".to_string())
            .with_tag("test".to_string());
        
        assert!(service.validate_tool_metadata(&metadata).await.is_ok());
        
        // 测试无效版本
        let invalid_metadata = ToolMetadata::new("测试工具".to_string(), "invalid".parse().unwrap());
        assert!(service.validate_tool_metadata(&invalid_metadata).await.is_err());
    }

    #[tokio::test]
    async fn test_validate_parameters() {
        let service = ToolValidationService::new();
        
        let definitions = vec![
            ParameterDefinition {
                name: "text".to_string(),
                parameter_type: ParameterType::String,
                required: true,
                default_value: None,
                description: None,
            },
            ParameterDefinition {
                name: "number".to_string(),
                parameter_type: ParameterType::Number,
                required: false,
                default_value: None,
                description: None,
            },
        ];
        
        // 测试有效参数
        let mut parameters = HashMap::new();
        parameters.insert("text".to_string(), SerializedValue::String("测试".to_string()));
        parameters.insert("number".to_string(), SerializedValue::Number(42.0));
        
        assert!(service.validate_parameters(&parameters, &definitions).await.is_ok());
        
        // 测试缺少必需参数
        let empty_parameters = HashMap::new();
        assert!(service.validate_parameters(&empty_parameters, &definitions).await.is_err());
        
        // 测试参数类型不匹配
        let mut invalid_parameters = HashMap::new();
        invalid_parameters.insert("text".to_string(), SerializedValue::Number(42.0));
        assert!(service.validate_parameters(&invalid_parameters, &definitions).await.is_err());
    }

    #[tokio::test]
    async fn test_validate_tool_integrity() {
        let service = ToolValidationService::new();
        
        let mut config = ToolConfig::new();
        config.add_parameter(ParameterDefinition {
            name: "text".to_string(),
            parameter_type: ParameterType::String,
            required: true,
            default_value: None,
            description: Some("文本参数".to_string()),
        });
        
        let metadata = ToolMetadata::new("测试工具".to_string(), "1.0.0".parse().unwrap());
        
        let tool = Tool {
            id: crate::domain::common::id::ToolId::new(),
            name: "test_tool".to_string(),
            tool_type: ToolType::Builtin,
            config,
            metadata,
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        assert!(service.validate_tool_integrity(&tool).await.is_ok());
        
        // 测试无效工具名称
        let mut invalid_tool = tool.clone();
        invalid_tool.name = "invalid name!".to_string();
        assert!(service.validate_tool_integrity(&invalid_tool).await.is_err());
    }
}