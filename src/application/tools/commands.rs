use crate::domain::common::id::ToolId;
use crate::domain::tools::{ToolConfig, ToolMetadata, ToolType};
use serde::{Deserialize, Serialize};

/// 执行工具命令
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExecuteToolCommand {
    /// 工具标识符（ID或名称）
    pub tool_identifier: String,
    /// 执行参数
    pub parameters: std::collections::HashMap<String, crate::domain::tools::SerializedValue>,
    /// 执行上下文
    pub context: Option<std::collections::HashMap<String, String>>,
    /// 超时时间（毫秒）
    pub timeout_ms: Option<u64>,
}

/// 注册工具命令
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RegisterToolCommand {
    /// 工具名称
    pub name: String,
    /// 工具类型
    pub tool_type: ToolType,
    /// 工具配置
    pub config: ToolConfig,
    /// 工具元数据
    pub metadata: ToolMetadata,
}

/// 注销工具命令
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UnregisterToolCommand {
    /// 工具ID
    pub tool_id: ToolId,
    /// 强制注销（即使工具正在使用）
    pub force: bool,
}

/// 更新工具配置命令
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UpdateToolConfigCommand {
    /// 工具ID
    pub tool_id: ToolId,
    /// 新配置
    pub config: ToolConfig,
    /// 更新原因
    pub reason: Option<String>,
}

/// 启用工具命令
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EnableToolCommand {
    /// 工具ID
    pub tool_id: ToolId,
    /// 启用原因
    pub reason: Option<String>,
}

/// 禁用工具命令
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DisableToolCommand {
    /// 工具ID
    pub tool_id: ToolId,
    /// 禁用原因
    pub reason: Option<String>,
    /// 是否等待当前执行完成
    pub wait_for_completion: bool,
}

/// 批量操作工具命令
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BatchToolOperationCommand {
    /// 工具ID列表
    pub tool_ids: Vec<ToolId>,
    /// 操作类型
    pub operation: BatchOperationType,
    /// 操作原因
    pub reason: Option<String>,
}

/// 批量操作类型
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum BatchOperationType {
    /// 启用
    Enable,
    /// 禁用
    Disable,
    /// 注销
    Unregister,
    /// 更新配置
    UpdateConfig { config: ToolConfig },
}

impl ExecuteToolCommand {
    /// 创建新的执行工具命令
    pub fn new(
        tool_identifier: String,
        parameters: std::collections::HashMap<String, crate::domain::tools::SerializedValue>,
    ) -> Self {
        Self {
            tool_identifier,
            parameters,
            context: None,
            timeout_ms: None,
        }
    }

    /// 设置执行上下文
    pub fn with_context(mut self, context: std::collections::HashMap<String, String>) -> Self {
        self.context = Some(context);
        self
    }

    /// 设置超时时间
    pub fn with_timeout(mut self, timeout_ms: u64) -> Self {
        self.timeout_ms = Some(timeout_ms);
        self
    }
}

impl RegisterToolCommand {
    /// 创建新的注册工具命令
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

impl UnregisterToolCommand {
    /// 创建新的注销工具命令
    pub fn new(tool_id: ToolId) -> Self {
        Self {
            tool_id,
            force: false,
        }
    }

    /// 设置强制注销
    pub fn with_force(mut self, force: bool) -> Self {
        self.force = force;
        self
    }
}

impl UpdateToolConfigCommand {
    /// 创建新的更新工具配置命令
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

impl EnableToolCommand {
    /// 创建新的启用工具命令
    pub fn new(tool_id: ToolId) -> Self {
        Self {
            tool_id,
            reason: None,
        }
    }

    /// 设置启用原因
    pub fn with_reason(mut self, reason: String) -> Self {
        self.reason = Some(reason);
        self
    }
}

impl DisableToolCommand {
    /// 创建新的禁用工具命令
    pub fn new(tool_id: ToolId) -> Self {
        Self {
            tool_id,
            reason: None,
            wait_for_completion: false,
        }
    }

    /// 设置禁用原因
    pub fn with_reason(mut self, reason: String) -> Self {
        self.reason = Some(reason);
        self
    }

    /// 设置是否等待完成
    pub fn with_wait_for_completion(mut self, wait_for_completion: bool) -> Self {
        self.wait_for_completion = wait_for_completion;
        self
    }
}

impl BatchToolOperationCommand {
    /// 创建新的批量操作命令
    pub fn new(tool_ids: Vec<ToolId>, operation: BatchOperationType) -> Self {
        Self {
            tool_ids,
            operation,
            reason: None,
        }
    }

    /// 设置操作原因
    pub fn with_reason(mut self, reason: String) -> Self {
        self.reason = Some(reason);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::tools::value_objects::{ParameterDefinition, ParameterType};
    use std::collections::HashMap;

    #[test]
    fn test_execute_tool_command() {
        let mut parameters = HashMap::new();
        parameters.insert(
            "text".to_string(),
            crate::domain::tools::SerializedValue::String("测试".to_string()),
        );

        let command = ExecuteToolCommand::new("test_tool".to_string(), parameters.clone())
            .with_context(HashMap::from([(
                "user".to_string(),
                "test_user".to_string(),
            )]))
            .with_timeout(5000);

        assert_eq!(command.tool_identifier, "test_tool");
        assert_eq!(command.parameters, parameters);
        assert!(command.context.is_some());
        assert_eq!(command.timeout_ms, Some(5000));
    }

    #[test]
    fn test_register_tool_command() {
        let mut config = ToolConfig::new();
        config.add_parameter(ParameterDefinition {
            name: "text".to_string(),
            parameter_type: ParameterType::String,
            required: true,
            default_value: None,
            description: Some("文本参数".to_string()),
        });

        let metadata = crate::domain::tools::ToolMetadata::new(
            "测试工具".to_string(),
            "1.0.0".parse().unwrap(),
        );

        let command =
            RegisterToolCommand::new("test_tool".to_string(), ToolType::Builtin, config, metadata);

        assert_eq!(command.name, "test_tool");
        assert_eq!(command.tool_type, ToolType::Builtin);
    }

    #[test]
    fn test_unregister_tool_command() {
        let tool_id = ToolId::new();

        let command = UnregisterToolCommand::new(tool_id).with_force(true);

        assert_eq!(command.tool_id, tool_id);
        assert!(command.force);
    }

    #[test]
    fn test_update_tool_config_command() {
        let tool_id = ToolId::new();
        let config = ToolConfig::new();

        let command = UpdateToolConfigCommand::new(tool_id, config.clone())
            .with_reason("配置更新".to_string());

        assert_eq!(command.tool_id, tool_id);
        assert_eq!(command.config, config);
        assert_eq!(command.reason, Some("配置更新".to_string()));
    }

    #[test]
    fn test_enable_tool_command() {
        let tool_id = ToolId::new();

        let command = EnableToolCommand::new(tool_id).with_reason("启用工具".to_string());

        assert_eq!(command.tool_id, tool_id);
        assert_eq!(command.reason, Some("启用工具".to_string()));
    }

    #[test]
    fn test_disable_tool_command() {
        let tool_id = ToolId::new();

        let command = DisableToolCommand::new(tool_id)
            .with_reason("维护中".to_string())
            .with_wait_for_completion(true);

        assert_eq!(command.tool_id, tool_id);
        assert_eq!(command.reason, Some("维护中".to_string()));
        assert!(command.wait_for_completion);
    }

    #[test]
    fn test_batch_tool_operation_command() {
        let tool_ids = vec![ToolId::new(), ToolId::new()];
        let config = ToolConfig::new();

        let command = BatchToolOperationCommand::new(
            tool_ids.clone(),
            BatchOperationType::UpdateConfig {
                config: config.clone(),
            },
        )
        .with_reason("批量更新".to_string());

        assert_eq!(command.tool_ids, tool_ids);
        assert_eq!(command.reason, Some("批量更新".to_string()));

        match command.operation {
            BatchOperationType::UpdateConfig { config: c } => {
                assert_eq!(c, config);
            }
            _ => panic!("Expected UpdateConfig operation"),
        }
    }
}
