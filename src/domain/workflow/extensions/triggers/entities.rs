//! Trigger extension system entities and traits

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

use crate::domain::workflow::graph::value_objects::ExecutionContext;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct TriggerExtensionId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TriggerExtensionType {
    Time,
    State,
    Event,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerExtensionEvent {
    pub id: String,
    pub trigger_id: TriggerExtensionId,
    pub trigger_type: TriggerExtensionType,
    pub timestamp: DateTime<Utc>,
    pub data: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerExtensionResult {
    pub should_trigger: bool,
    pub success: bool,
    pub error_message: Option<String>,
    pub event: Option<TriggerExtensionEvent>,
}

/// 触发器扩展接口
pub trait TriggerExtension: Send + Sync {
    /// 获取触发器ID
    fn trigger_id(&self) -> &TriggerExtensionId;
    
    /// 获取触发器类型
    fn trigger_type(&self) -> &TriggerExtensionType;
    
    /// 获取触发器版本
    fn version(&self) -> &str;
    
    /// 获取触发器描述
    fn description(&self) -> &str;
    
    /// 是否启用
    fn is_enabled(&self) -> bool;
    
    /// 启用触发器
    fn enable(&mut self);
    
    /// 禁用触发器
    fn disable(&mut self);
    
    /// 获取配置
    fn get_config(&self) -> HashMap<String, serde_json::Value>;
    
    /// 设置配置
    fn set_config(&mut self, config: HashMap<String, serde_json::Value>);
    
    /// 评估是否应该触发
    fn evaluate(&self, context: &ExecutionContext, params: HashMap<String, serde_json::Value>) -> TriggerExtensionResult;
    
    /// 创建触发器事件
    fn create_event(&self, data: HashMap<String, serde_json::Value>, metadata: Option<HashMap<String, String>>) -> TriggerExtensionEvent;
    
    /// 更新触发器信息
    fn update_trigger_info(&mut self);
    
    /// 获取最后触发时间
    fn get_last_triggered(&self) -> Option<DateTime<Utc>>;
    
    /// 获取触发次数
    fn get_trigger_count(&self) -> u64;
}

/// 基础触发器扩展实现
#[derive(Debug, Clone)]
pub struct BaseTriggerExtension {
    trigger_id: TriggerExtensionId,
    trigger_type: TriggerExtensionType,
    version: String,
    description: String,
    enabled: bool,
    config: HashMap<String, serde_json::Value>,
    last_triggered: Option<DateTime<Utc>>,
    trigger_count: u64,
}

impl BaseTriggerExtension {
    pub fn new(
        trigger_id: String,
        trigger_type: TriggerExtensionType,
        version: String,
        description: String,
    ) -> Self {
        Self {
            trigger_id: TriggerExtensionId(trigger_id),
            trigger_type,
            version,
            description,
            enabled: true,
            config: HashMap::new(),
            last_triggered: None,
            trigger_count: 0,
        }
    }
    
    fn check_rate_limit(&self) -> bool {
        let rate_limit = self.config.get("rate_limit")
            .and_then(|v| v.as_f64());
        
        if let Some(rate_limit) = rate_limit {
            if let Some(last_triggered) = self.last_triggered {
                let time_since_last = Utc::now().signed_duration_since(last_triggered);
                time_since_last.num_seconds() >= rate_limit as i64
            } else {
                true
            }
        } else {
            true
        }
    }
    
    fn check_max_triggers(&self) -> bool {
        let max_triggers = self.config.get("max_triggers")
            .and_then(|v| v.as_u64());
        
        if let Some(max_triggers) = max_triggers {
            self.trigger_count < max_triggers
        } else {
            true
        }
    }
    
    fn can_trigger(&self) -> bool {
        self.enabled && self.check_rate_limit() && self.check_max_triggers()
    }
    
    fn update_trigger_info(&mut self) {
        self.last_triggered = Some(Utc::now());
        self.trigger_count += 1;
    }
}

impl TriggerExtension for BaseTriggerExtension {
    fn trigger_id(&self) -> &TriggerExtensionId {
        &self.trigger_id
    }
    
    fn trigger_type(&self) -> &TriggerExtensionType {
        &self.trigger_type
    }
    
    fn version(&self) -> &str {
        &self.version
    }
    
    fn description(&self) -> &str {
        &self.description
    }
    
    fn is_enabled(&self) -> bool {
        self.enabled
    }
    
    fn enable(&mut self) {
        self.enabled = true;
    }
    
    fn disable(&mut self) {
        self.enabled = false;
    }
    
    fn get_config(&self) -> HashMap<String, serde_json::Value> {
        self.config.clone()
    }
    
    fn set_config(&mut self, config: HashMap<String, serde_json::Value>) {
        self.config = config;
    }
    
    fn evaluate(&self, _context: &ExecutionContext, _params: HashMap<String, serde_json::Value>) -> TriggerExtensionResult {
        TriggerExtensionResult {
            should_trigger: false,
            success: true,
            error_message: None,
            event: None,
        }
    }
    
    fn create_event(&self, data: HashMap<String, serde_json::Value>, metadata: Option<HashMap<String, String>>) -> TriggerExtensionEvent {
        TriggerExtensionEvent {
            id: uuid::Uuid::new_v4().to_string(),
            trigger_id: self.trigger_id.clone(),
            trigger_type: self.trigger_type.clone(),
            timestamp: Utc::now(),
            data,
            metadata: metadata.unwrap_or_default(),
        }
    }
    
    fn update_trigger_info(&mut self) {
        self.update_trigger_info();
    }
    
    fn get_last_triggered(&self) -> Option<DateTime<Utc>> {
        self.last_triggered
    }
    
    fn get_trigger_count(&self) -> u64 {
        self.trigger_count
    }
}

/// 工具错误触发器扩展
#[derive(Debug, Clone)]
pub struct ToolErrorTriggerExtension {
    base: BaseTriggerExtension,
}

impl ToolErrorTriggerExtension {
    pub fn new() -> Self {
        Self {
            base: BaseTriggerExtension::new(
                "tool_error".to_string(),
                TriggerExtensionType::Event,
                "1.0.0".to_string(),
                "基于工具错误数量的触发器".to_string(),
            ),
        }
    }
}

impl TriggerExtension for ToolErrorTriggerExtension {
    fn trigger_id(&self) -> &TriggerExtensionId {
        self.base.trigger_id()
    }
    
    fn trigger_type(&self) -> &TriggerExtensionType {
        self.base.trigger_type()
    }
    
    fn version(&self) -> &str {
        self.base.version()
    }
    
    fn description(&self) -> &str {
        self.base.description()
    }
    
    fn is_enabled(&self) -> bool {
        self.base.is_enabled()
    }
    
    fn enable(&mut self) {
        self.base.enable();
    }
    
    fn disable(&mut self) {
        self.base.disable();
    }
    
    fn get_config(&self) -> HashMap<String, serde_json::Value> {
        self.base.get_config()
    }
    
    fn set_config(&mut self, config: HashMap<String, serde_json::Value>) {
        self.base.set_config(config);
    }
    
    fn evaluate(&self, context: &ExecutionContext, _params: HashMap<String, serde_json::Value>) -> TriggerExtensionResult {
        if !self.can_trigger() {
            return TriggerExtensionResult {
                should_trigger: false,
                success: true,
                error_message: None,
                event: None,
            };
        }
        
        let error_threshold = self.base.get_config()
            .get("error_threshold")
            .and_then(|v| v.as_u64())
            .unwrap_or(1);
        
        // 计算工具错误数量
        let error_count = if let Some(tool_results) = context.get_variable("tool_results") {
            if let Some(results_array) = tool_results.as_array() {
                results_array.iter()
                    .filter(|result| {
                        if let Some(success) = result.get("success") {
                            success.as_bool() == Some(false)
                        } else {
                            false
                        }
                    })
                    .count() as u64
            } else {
                0
            }
        } else {
            0
        };
        
        let should_trigger = error_count >= error_threshold;
        
        if should_trigger {
            let event = self.create_event(
                HashMap::from([
                    ("error_count".to_string(), serde_json::Value::Number(serde_json::Number::from(error_count))),
                    ("error_threshold".to_string(), serde_json::Value::Number(serde_json::Number::from(error_threshold))),
                ]),
                None,
            );
            
            TriggerExtensionResult {
                should_trigger: true,
                success: true,
                error_message: None,
                event: Some(event),
            }
        } else {
            TriggerExtensionResult {
                should_trigger: false,
                success: true,
                error_message: None,
                event: None,
            }
        }
    }
    
    fn create_event(&self, data: HashMap<String, serde_json::Value>, metadata: Option<HashMap<String, String>>) -> TriggerExtensionEvent {
        self.base.create_event(data, metadata)
    }
    
    fn update_trigger_info(&mut self) {
        self.base.update_trigger_info();
    }
    
    fn get_last_triggered(&self) -> Option<DateTime<Utc>> {
        self.base.get_last_triggered()
    }
    
    fn get_trigger_count(&self) -> u64 {
        self.base.get_trigger_count()
    }
}

/// 迭代限制触发器扩展
#[derive(Debug, Clone)]
pub struct IterationLimitTriggerExtension {
    base: BaseTriggerExtension,
}

impl IterationLimitTriggerExtension {
    pub fn new() -> Self {
        Self {
            base: BaseTriggerExtension::new(
                "iteration_limit".to_string(),
                TriggerExtensionType::State,
                "1.0.0".to_string(),
                "基于迭代次数限制的触发器".to_string(),
            ),
        }
    }
}

impl TriggerExtension for IterationLimitTriggerExtension {
    fn trigger_id(&self) -> &TriggerExtensionId {
        self.base.trigger_id()
    }
    
    fn trigger_type(&self) -> &TriggerExtensionType {
        self.base.trigger_type()
    }
    
    fn version(&self) -> &str {
        self.base.version()
    }
    
    fn description(&self) -> &str {
        self.base.description()
    }
    
    fn is_enabled(&self) -> bool {
        self.base.is_enabled()
    }
    
    fn enable(&mut self) {
        self.base.enable();
    }
    
    fn disable(&mut self) {
        self.base.disable();
    }
    
    fn get_config(&self) -> HashMap<String, serde_json::Value> {
        self.base.get_config()
    }
    
    fn set_config(&mut self, config: HashMap<String, serde_json::Value>) {
        self.base.set_config(config);
    }
    
    fn evaluate(&self, context: &ExecutionContext, _params: HashMap<String, serde_json::Value>) -> TriggerExtensionResult {
        if !self.can_trigger() {
            return TriggerExtensionResult {
                should_trigger: false,
                success: true,
                error_message: None,
                event: None,
            };
        }
        
        let max_iterations = self.base.get_config()
            .get("max_iterations")
            .and_then(|v| v.as_u64())
            .unwrap_or(10);
        
        let iteration_count = context
            .get_variable("iteration_count")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        
        let should_trigger = iteration_count >= max_iterations;
        
        if should_trigger {
            let event = self.create_event(
                HashMap::from([
                    ("iteration_count".to_string(), serde_json::Value::Number(serde_json::Number::from(iteration_count))),
                    ("max_iterations".to_string(), serde_json::Value::Number(serde_json::Number::from(max_iterations))),
                ]),
                None,
            );
            
            TriggerExtensionResult {
                should_trigger: true,
                success: true,
                error_message: None,
                event: Some(event),
            }
        } else {
            TriggerExtensionResult {
                should_trigger: false,
                success: true,
                error_message: None,
                event: None,
            }
        }
    }
    
    fn create_event(&self, data: HashMap<String, serde_json::Value>, metadata: Option<HashMap<String, String>>) -> TriggerExtensionEvent {
        self.base.create_event(data, metadata)
    }
    
    fn update_trigger_info(&mut self) {
        self.base.update_trigger_info();
    }
    
    fn get_last_triggered(&self) -> Option<DateTime<Utc>> {
        self.base.get_last_triggered()
    }
    
    fn get_trigger_count(&self) -> u64 {
        self.base.get_trigger_count()
    }
}

/// 内置触发器扩展集合
pub struct BuiltinTriggerExtensions;

impl BuiltinTriggerExtensions {
    /// 获取所有内置触发器扩展
    pub fn get_all_extensions() -> Vec<Box<dyn TriggerExtension>> {
        vec![
            Box::new(ToolErrorTriggerExtension::new()),
            Box::new(IterationLimitTriggerExtension::new()),
        ]
    }
    
    /// 根据名称获取触发器扩展
    pub fn get_extension_by_name(name: &str) -> Option<Box<dyn TriggerExtension>> {
        match name {
            "tool_error" => Some(Box::new(ToolErrorTriggerExtension::new())),
            "iteration_limit" => Some(Box::new(IterationLimitTriggerExtension::new())),
            _ => None,
        }
    }
}