use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::domain::common::id::ToolId;
use crate::domain::tools::{
    Tool, ToolType, ToolConfig, ToolMetadata, ToolExecutionResult,
    SerializedValue, ParameterDefinition, ParameterType
};

/// 执行工具请求
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExecuteToolRequest {
    /// 工具标识符（ID或名称）
    pub tool_identifier: String,
    /// 执行参数
    pub parameters: HashMap<String, SerializedValue>,
    /// 执行上下文
    pub context: Option<HashMap<String, String>>,
    /// 超时时间（毫秒）
    pub timeout_ms: Option<u64>,
}

/// 执行工具响应
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExecuteToolResponse {
    /// 工具ID
    pub tool_id: ToolId,
    /// 工具名称
    pub tool_name: String,
    /// 执行结果
    pub result: ToolExecutionResult,
}

/// 注册工具请求
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RegisterToolRequest {
    /// 工具名称
    pub name: String,
    /// 工具类型
    pub tool_type: ToolType,
    /// 工具配置
    pub config: ToolConfig,
    /// 工具元数据
    pub metadata: ToolMetadata,
}

/// 注册工具响应
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RegisterToolResponse {
    /// 工具ID
    pub tool_id: ToolId,
    /// 工具名称
    pub tool_name: String,
}

/// 更新工具配置请求
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UpdateToolConfigRequest {
    /// 工具ID
    pub tool_id: ToolId,
    /// 新配置
    pub config: ToolConfig,
    /// 更新原因
    pub reason: Option<String>,
}

/// 更新工具配置响应
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UpdateToolConfigResponse {
    /// 工具ID
    pub tool_id: ToolId,
    /// 工具名称
    pub tool_name: String,
    /// 旧版本
    pub old_version: String,
    /// 新版本
    pub new_version: String,
}

/// 工具DTO
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolDto {
    /// 工具ID
    pub id: ToolId,
    /// 工具名称
    pub name: String,
    /// 工具类型
    pub tool_type: ToolType,
    /// 工具配置
    pub config: ToolConfigDto,
    /// 工具元数据
    pub metadata: ToolMetadataDto,
    /// 创建时间
    pub created_at: crate::domain::common::timestamp::Timestamp,
    /// 更新时间
    pub updated_at: crate::domain::common::timestamp::Timestamp,
}

/// 工具配置DTO
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolConfigDto {
    /// 参数定义
    pub parameters: HashMap<String, ParameterDefinitionDto>,
    /// 必需参数列表
    pub required_parameters: Vec<String>,
    /// 可选参数列表
    pub optional_parameters: Vec<String>,
}

/// 工具元数据DTO
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolMetadataDto {
    /// 工具描述
    pub description: String,
    /// 工具版本
    pub version: String,
    /// 工具作者
    pub author: Option<String>,
    /// 工具标签
    pub tags: Vec<String>,
}

/// 参数定义DTO
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ParameterDefinitionDto {
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

/// 工具过滤器
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolFilters {
    /// 工具类型
    pub tool_type: Option<ToolType>,
    /// 名称模式
    pub name_pattern: Option<String>,
    /// 标签
    pub tags: Vec<String>,
    /// 作者
    pub author: Option<String>,
    /// 是否启用
    pub enabled: Option<bool>,
    /// 版本范围
    pub version_range: Option<String>,
}

/// 工具统计信息
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolStatistics {
    /// 工具ID
    pub tool_id: ToolId,
    /// 工具名称
    pub tool_name: String,
    /// 总执行次数
    pub total_executions: u64,
    /// 成功执行次数
    pub successful_executions: u64,
    /// 失败执行次数
    pub failed_executions: u64,
    /// 平均执行时间（毫秒）
    pub average_execution_time_ms: f64,
    /// 最小执行时间（毫秒）
    pub min_execution_time_ms: u64,
    /// 最大执行时间（毫秒）
    pub max_execution_time_ms: u64,
    /// 成功率
    pub success_rate: f64,
    /// 最后执行时间
    pub last_execution_time: Option<crate::domain::common::timestamp::Timestamp>,
}

/// 工具执行历史记录
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolExecutionHistoryRecord {
    /// 执行ID
    pub execution_id: String,
    /// 工具ID
    pub tool_id: ToolId,
    /// 工具名称
    pub tool_name: String,
    /// 执行参数
    pub parameters: HashMap<String, SerializedValue>,
    /// 执行结果
    pub result: ToolExecutionResult,
    /// 执行时间
    pub execution_time: crate::domain::common::timestamp::Timestamp,
    /// 执行用户（如果有）
    pub user_id: Option<String>,
    /// 执行上下文
    pub context: Option<HashMap<String, String>>,
}

impl From<Tool> for ToolDto {
    fn from(tool: Tool) -> Self {
        Self {
            id: tool.id,
            name: tool.name,
            tool_type: tool.tool_type,
            config: ToolConfigDto::from(tool.config),
            metadata: ToolMetadataDto::from(tool.metadata),
            created_at: tool.created_at,
            updated_at: tool.updated_at,
        }
    }
}

impl From<ToolConfig> for ToolConfigDto {
    fn from(config: ToolConfig) -> Self {
        let parameters = config.parameters
            .into_iter()
            .map(|(k, v)| (k, ParameterDefinitionDto::from(v)))
            .collect();
        
        Self {
            parameters,
            required_parameters: config.required_parameters,
            optional_parameters: config.optional_parameters,
        }
    }
}

impl From<ToolMetadata> for ToolMetadataDto {
    fn from(metadata: ToolMetadata) -> Self {
        Self {
            description: metadata.description,
            version: metadata.version.to_string(),
            author: metadata.author,
            tags: metadata.tags,
        }
    }
}

impl From<ParameterDefinition> for ParameterDefinitionDto {
    fn from(param: ParameterDefinition) -> Self {
        Self {
            name: param.name,
            parameter_type: param.parameter_type,
            required: param.required,
            default_value: param.default_value,
            description: param.description,
        }
    }
}

impl ExecuteToolRequest {
    /// 创建新的执行工具请求
    pub fn new(
        tool_identifier: String,
        parameters: HashMap<String, SerializedValue>,
    ) -> Self {
        Self {
            tool_identifier,
            parameters,
            context: None,
            timeout_ms: None,
        }
    }

    /// 设置执行上下文
    pub fn with_context(mut self, context: HashMap<String, String>) -> Self {
        self.context = Some(context);
        self
    }

    /// 设置超时时间
    pub fn with_timeout(mut self, timeout_ms: u64) -> Self {
        self.timeout_ms = Some(timeout_ms);
        self
    }
}

impl RegisterToolRequest {
    /// 创建新的注册工具请求
    pub fn new(
        name: String,
        tool_type: ToolType,
        config: ToolConfig,
        metadata: ToolMetadata,
    ) -> Self {
        Self {
            name,
            tool_type,
            config,
            metadata,
        }
    }
}

impl UpdateToolConfigRequest {
    /// 创建新的更新工具配置请求
    pub fn new(tool_id: ToolId, config: ToolConfig) -> Self {
        Self {
            tool_id,
            config,
            reason: None,
        }
    }

    /// 设置更新原因
    pub fn with_reason(mut self, reason: String) -> Self {
        self.reason = Some(reason);
        self
    }
}

impl ToolFilters {
    /// 创建新的工具过滤器
    pub fn new() -> Self {
        Self {
            tool_type: None,
            name_pattern: None,
            tags: Vec::new(),
            author: None,
            enabled: None,
            version_range: None,
        }
    }

    /// 设置工具类型
    pub fn with_tool_type(mut self, tool_type: ToolType) -> Self {
        self.tool_type = Some(tool_type);
        self
    }

    /// 设置名称模式
    pub fn with_name_pattern(mut self, name_pattern: String) -> Self {
        self.name_pattern = Some(name_pattern);
        self
    }

    /// 添加标签
    pub fn with_tag(mut self, tag: String) -> Self {
        self.tags.push(tag);
        self
    }

    /// 设置标签列表
    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }

    /// 设置作者
    pub fn with_author(mut self, author: String) -> Self {
        self.author = Some(author);
        self
    }

    /// 设置是否启用
    pub fn with_enabled(mut self, enabled: bool) -> Self {
        self.enabled = Some(enabled);
        self
    }

    /// 设置版本范围
    pub fn with_version_range(mut self, version_range: String) -> Self {
        self.version_range = Some(version_range);
        self
    }
}

impl ToolStatistics {
    /// 创建新的工具统计信息
    pub fn new(tool_id: ToolId, tool_name: String) -> Self {
        Self {
            tool_id,
            tool_name,
            total_executions: 0,
            successful_executions: 0,
            failed_executions: 0,
            average_execution_time_ms: 0.0,
            min_execution_time_ms: u64::MAX,
            max_execution_time_ms: 0,
            success_rate: 0.0,
            last_execution_time: None,
        }
    }

    /// 更新执行统计
    pub fn update_execution(&mut self, execution_time_ms: u64, success: bool) {
        self.total_executions += 1;
        
        if success {
            self.successful_executions += 1;
        } else {
            self.failed_executions += 1;
        }
        
        // 更新执行时间统计
        if self.total_executions == 1 {
            self.average_execution_time_ms = execution_time_ms as f64;
            self.min_execution_time_ms = execution_time_ms;
            self.max_execution_time_ms = execution_time_ms;
        } else {
            let total_time = self.average_execution_time_ms * (self.total_executions - 1) as f64;
            self.average_execution_time_ms = (total_time + execution_time_ms as f64) / self.total_executions as f64;
            self.min_execution_time_ms = self.min_execution_time_ms.min(execution_time_ms);
            self.max_execution_time_ms = self.max_execution_time_ms.max(execution_time_ms);
        }
        
        // 更新成功率
        self.success_rate = self.successful_executions as f64 / self.total_executions as f64;
        
        // 更新最后执行时间
        self.last_execution_time = Some(crate::domain::common::timestamp::Timestamp::now());
    }
}

impl Default for ToolFilters {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::tools::value_objects::{ToolError as ToolExecutionErrorValue, TokenUsage};
    use std::time::Duration;

    #[test]
    fn test_tool_dto_conversion() {
        let mut config = ToolConfig::new();
        config.add_parameter(ParameterDefinition {
            name: "text".to_string(),
            parameter_type: ParameterType::String,
            required: true,
            default_value: None,
            description: Some("文本参数".to_string()),
        });
        
        let metadata = ToolMetadata::new("测试工具".to_string(), "1.0.0".parse().unwrap())
            .with_author("测试作者".to_string())
            .with_tag("test".to_string());
        
        let tool = Tool {
            id: ToolId::new(),
            name: "test_tool".to_string(),
            tool_type: ToolType::Builtin,
            config: config.clone(),
            metadata: metadata.clone(),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        let tool_dto = ToolDto::from(tool);
        
        assert_eq!(tool_dto.name, "test_tool");
        assert_eq!(tool_dto.tool_type, ToolType::Builtin);
        assert_eq!(tool_dto.config.parameters.len(), 1);
        assert_eq!(tool_dto.metadata.description, "测试工具");
        assert_eq!(tool_dto.metadata.author, Some("测试作者".to_string()));
        assert_eq!(tool_dto.metadata.tags, vec!["test".to_string()]);
    }

    #[test]
    fn test_execute_tool_request() {
        let mut parameters = HashMap::new();
        parameters.insert("text".to_string(), SerializedValue::String("测试".to_string()));
        
        let mut context = HashMap::new();
        context.insert("user".to_string(), "test_user".to_string());
        
        let request = ExecuteToolRequest::new("test_tool".to_string(), parameters.clone())
            .with_context(context.clone())
            .with_timeout(5000);
        
        assert_eq!(request.tool_identifier, "test_tool");
        assert_eq!(request.parameters, parameters);
        assert_eq!(request.context, Some(context));
        assert_eq!(request.timeout_ms, Some(5000));
    }

    #[test]
    fn test_tool_statistics() {
        let tool_id = ToolId::new();
        let mut stats = ToolStatistics::new(tool_id, "test_tool".to_string());
        
        // 第一次执行
        stats.update_execution(100, true);
        assert_eq!(stats.total_executions, 1);
        assert_eq!(stats.successful_executions, 1);
        assert_eq!(stats.failed_executions, 0);
        assert_eq!(stats.average_execution_time_ms, 100.0);
        assert_eq!(stats.min_execution_time_ms, 100);
        assert_eq!(stats.max_execution_time_ms, 100);
        assert_eq!(stats.success_rate, 1.0);
        
        // 第二次执行（失败）
        stats.update_execution(200, false);
        assert_eq!(stats.total_executions, 2);
        assert_eq!(stats.successful_executions, 1);
        assert_eq!(stats.failed_executions, 1);
        assert_eq!(stats.average_execution_time_ms, 150.0);
        assert_eq!(stats.min_execution_time_ms, 100);
        assert_eq!(stats.max_execution_time_ms, 200);
        assert_eq!(stats.success_rate, 0.5);
    }

    #[test]
    fn test_tool_filters() {
        let filters = ToolFilters::new()
            .with_tool_type(ToolType::Builtin)
            .with_name_pattern("test".to_string())
            .with_tag("utility".to_string())
            .with_author("test_author".to_string())
            .with_enabled(true)
            .with_version_range("1.0.0".to_string());
        
        assert_eq!(filters.tool_type, Some(ToolType::Builtin));
        assert_eq!(filters.name_pattern, Some("test".to_string()));
        assert_eq!(filters.tags, vec!["utility".to_string()]);
        assert_eq!(filters.author, Some("test_author".to_string()));
        assert_eq!(filters.enabled, Some(true));
        assert_eq!(filters.version_range, Some("1.0.0".to_string()));
    }
}