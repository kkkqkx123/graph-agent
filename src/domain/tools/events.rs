use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::domain::common::id::ToolId;
use crate::domain::common::timestamp::Timestamp;
use crate::domain::tools::value_objects::{SerializedValue, ToolExecutionResult};

/// 工具领域事件
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "event_type")]
pub enum ToolEvent {
    /// 工具已注册
    ToolRegistered {
        /// 工具ID
        tool_id: ToolId,
        /// 工具名称
        tool_name: String,
        /// 工具类型
        tool_type: String,
        /// 事件时间
        timestamp: Timestamp,
    },
    
    /// 工具已注销
    ToolUnregistered {
        /// 工具ID
        tool_id: ToolId,
        /// 工具名称
        tool_name: String,
        /// 事件时间
        timestamp: Timestamp,
    },
    
    /// 工具执行开始
    ToolExecutionStarted {
        /// 工具ID
        tool_id: ToolId,
        /// 工具名称
        tool_name: String,
        /// 执行ID
        execution_id: String,
        /// 执行参数
        parameters: HashMap<String, SerializedValue>,
        /// 事件时间
        timestamp: Timestamp,
    },
    
    /// 工具执行完成
    ToolExecutionCompleted {
        /// 工具ID
        tool_id: ToolId,
        /// 工具名称
        tool_name: String,
        /// 执行ID
        execution_id: String,
        /// 执行结果
        result: ToolExecutionResult,
        /// 事件时间
        timestamp: Timestamp,
    },
    
    /// 工具执行失败
    ToolExecutionFailed {
        /// 工具ID
        tool_id: ToolId,
        /// 工具名称
        tool_name: String,
        /// 执行ID
        execution_id: String,
        /// 错误信息
        error: String,
        /// 事件时间
        timestamp: Timestamp,
    },
    
    /// 工具配置已更新
    ToolConfigUpdated {
        /// 工具ID
        tool_id: ToolId,
        /// 工具名称
        tool_name: String,
        /// 旧配置版本
        old_version: String,
        /// 新配置版本
        new_version: String,
        /// 事件时间
        timestamp: Timestamp,
    },
    
    /// 工具状态已更改
    ToolStateChanged {
        /// 工具ID
        tool_id: ToolId,
        /// 工具名称
        tool_name: String,
        /// 旧状态
        old_state: String,
        /// 新状态
        new_state: String,
        /// 事件时间
        timestamp: Timestamp,
    },
}

impl ToolEvent {
    /// 获取事件时间戳
    pub fn timestamp(&self) -> Timestamp {
        match self {
            ToolEvent::ToolRegistered { timestamp, .. } => *timestamp,
            ToolEvent::ToolUnregistered { timestamp, .. } => *timestamp,
            ToolEvent::ToolExecutionStarted { timestamp, .. } => *timestamp,
            ToolEvent::ToolExecutionCompleted { timestamp, .. } => *timestamp,
            ToolEvent::ToolExecutionFailed { timestamp, .. } => *timestamp,
            ToolEvent::ToolConfigUpdated { timestamp, .. } => *timestamp,
            ToolEvent::ToolStateChanged { timestamp, .. } => *timestamp,
        }
    }
    
    /// 获取工具ID
    pub fn tool_id(&self) -> ToolId {
        match self {
            ToolEvent::ToolRegistered { tool_id, .. } => *tool_id,
            ToolEvent::ToolUnregistered { tool_id, .. } => *tool_id,
            ToolEvent::ToolExecutionStarted { tool_id, .. } => *tool_id,
            ToolEvent::ToolExecutionCompleted { tool_id, .. } => *tool_id,
            ToolEvent::ToolExecutionFailed { tool_id, .. } => *tool_id,
            ToolEvent::ToolConfigUpdated { tool_id, .. } => *tool_id,
            ToolEvent::ToolStateChanged { tool_id, .. } => *tool_id,
        }
    }
    
    /// 获取工具名称
    pub fn tool_name(&self) -> &str {
        match self {
            ToolEvent::ToolRegistered { tool_name, .. } => tool_name,
            ToolEvent::ToolUnregistered { tool_name, .. } => tool_name,
            ToolEvent::ToolExecutionStarted { tool_name, .. } => tool_name,
            ToolEvent::ToolExecutionCompleted { tool_name, .. } => tool_name,
            ToolEvent::ToolExecutionFailed { tool_name, .. } => tool_name,
            ToolEvent::ToolConfigUpdated { tool_name, .. } => tool_name,
            ToolEvent::ToolStateChanged { tool_name, .. } => tool_name,
        }
    }
    
    /// 获取事件类型名称
    pub fn event_type_name(&self) -> &'static str {
        match self {
            ToolEvent::ToolRegistered { .. } => "ToolRegistered",
            ToolEvent::ToolUnregistered { .. } => "ToolUnregistered",
            ToolEvent::ToolExecutionStarted { .. } => "ToolExecutionStarted",
            ToolEvent::ToolExecutionCompleted { .. } => "ToolExecutionCompleted",
            ToolEvent::ToolExecutionFailed { .. } => "ToolExecutionFailed",
            ToolEvent::ToolConfigUpdated { .. } => "ToolConfigUpdated",
            ToolEvent::ToolStateChanged { .. } => "ToolStateChanged",
        }
    }
}

/// 工具事件构建器
pub struct ToolEventBuilder;

impl ToolEventBuilder {
    /// 创建工具已注册事件
    pub fn tool_registered(tool_id: ToolId, tool_name: String, tool_type: String) -> ToolEvent {
        ToolEvent::ToolRegistered {
            tool_id,
            tool_name,
            tool_type,
            timestamp: Timestamp::now(),
        }
    }
    
    /// 创建工具已注销事件
    pub fn tool_unregistered(tool_id: ToolId, tool_name: String) -> ToolEvent {
        ToolEvent::ToolUnregistered {
            tool_id,
            tool_name,
            timestamp: Timestamp::now(),
        }
    }
    
    /// 创建工具执行开始事件
    pub fn tool_execution_started(
        tool_id: ToolId,
        tool_name: String,
        execution_id: String,
        parameters: HashMap<String, SerializedValue>,
    ) -> ToolEvent {
        ToolEvent::ToolExecutionStarted {
            tool_id,
            tool_name,
            execution_id,
            parameters,
            timestamp: Timestamp::now(),
        }
    }
    
    /// 创建工具执行完成事件
    pub fn tool_execution_completed(
        tool_id: ToolId,
        tool_name: String,
        execution_id: String,
        result: ToolExecutionResult,
    ) -> ToolEvent {
        ToolEvent::ToolExecutionCompleted {
            tool_id,
            tool_name,
            execution_id,
            result,
            timestamp: Timestamp::now(),
        }
    }
    
    /// 创建工具执行失败事件
    pub fn tool_execution_failed(
        tool_id: ToolId,
        tool_name: String,
        execution_id: String,
        error: String,
    ) -> ToolEvent {
        ToolEvent::ToolExecutionFailed {
            tool_id,
            tool_name,
            execution_id,
            error,
            timestamp: Timestamp::now(),
        }
    }
    
    /// 创建工具配置已更新事件
    pub fn tool_config_updated(
        tool_id: ToolId,
        tool_name: String,
        old_version: String,
        new_version: String,
    ) -> ToolEvent {
        ToolEvent::ToolConfigUpdated {
            tool_id,
            tool_name,
            old_version,
            new_version,
            timestamp: Timestamp::now(),
        }
    }
    
    /// 创建工具状态已更改事件
    pub fn tool_state_changed(
        tool_id: ToolId,
        tool_name: String,
        old_state: String,
        new_state: String,
    ) -> ToolEvent {
        ToolEvent::ToolStateChanged {
            tool_id,
            tool_name,
            old_state,
            new_state,
            timestamp: Timestamp::now(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::tools::value_objects::{ToolError, TokenUsage};
    use std::time::Duration;

    #[test]
    fn test_tool_event_builder() {
        let tool_id = ToolId::new();
        let tool_name = "test_tool".to_string();
        let tool_type = "builtin".to_string();
        
        // 测试工具注册事件
        let event = ToolEventBuilder::tool_registered(
            tool_id,
            tool_name.clone(),
            tool_type.clone(),
        );
        
        match event {
            ToolEvent::ToolRegistered { tool_id: id, tool_name: name, tool_type: t, timestamp } => {
                assert_eq!(id, tool_id);
                assert_eq!(name, tool_name);
                assert_eq!(t, tool_type);
                assert!(timestamp <= Timestamp::now());
            }
            _ => panic!("Expected ToolRegistered event"),
        }
        
        // 测试工具执行开始事件
        let execution_id = "exec_123".to_string();
        let parameters = HashMap::new();
        
        let event = ToolEventBuilder::tool_execution_started(
            tool_id,
            tool_name.clone(),
            execution_id.clone(),
            parameters.clone(),
        );
        
        match event {
            ToolEvent::ToolExecutionStarted { tool_id: id, tool_name: name, execution_id: exec_id, parameters: params, timestamp } => {
                assert_eq!(id, tool_id);
                assert_eq!(name, tool_name);
                assert_eq!(exec_id, execution_id);
                assert_eq!(params, parameters);
                assert!(timestamp <= Timestamp::now());
            }
            _ => panic!("Expected ToolExecutionStarted event"),
        }
        
        // 测试工具执行完成事件
        let output = SerializedValue::String("测试结果".to_string());
        let result = ToolExecutionResult::success(output, Duration::from_millis(100));
        
        let event = ToolEventBuilder::tool_execution_completed(
            tool_id,
            tool_name.clone(),
            execution_id.clone(),
            result.clone(),
        );
        
        match event {
            ToolEvent::ToolExecutionCompleted { tool_id: id, tool_name: name, execution_id: exec_id, result: res, timestamp } => {
                assert_eq!(id, tool_id);
                assert_eq!(name, tool_name);
                assert_eq!(exec_id, execution_id);
                assert_eq!(res, result);
                assert!(timestamp <= Timestamp::now());
            }
            _ => panic!("Expected ToolExecutionCompleted event"),
        }
        
        // 测试工具执行失败事件
        let error = "执行失败".to_string();
        
        let event = ToolEventBuilder::tool_execution_failed(
            tool_id,
            tool_name.clone(),
            execution_id.clone(),
            error.clone(),
        );
        
        match event {
            ToolEvent::ToolExecutionFailed { tool_id: id, tool_name: name, execution_id: exec_id, error: err, timestamp } => {
                assert_eq!(id, tool_id);
                assert_eq!(name, tool_name);
                assert_eq!(exec_id, execution_id);
                assert_eq!(err, error);
                assert!(timestamp <= Timestamp::now());
            }
            _ => panic!("Expected ToolExecutionFailed event"),
        }
    }

    #[test]
    fn test_tool_event_methods() {
        let tool_id = ToolId::new();
        let tool_name = "test_tool".to_string();
        
        let event = ToolEventBuilder::tool_registered(
            tool_id,
            tool_name.clone(),
            "builtin".to_string(),
        );
        
        assert_eq!(event.tool_id(), tool_id);
        assert_eq!(event.tool_name(), tool_name);
        assert_eq!(event.event_type_name(), "ToolRegistered");
        assert!(event.timestamp() <= Timestamp::now());
    }
}