//! Trigger function entities and traits

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc, Timelike};

use crate::domain::workflow::graph::value_objects::ExecutionContext;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct TriggerFunctionId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TriggerType {
    Time,
    State,
    Event,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerEvent {
    pub id: String,
    pub trigger_id: TriggerFunctionId,
    pub trigger_type: TriggerType,
    pub timestamp: DateTime<Utc>,
    pub data: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerResult {
    pub should_trigger: bool,
    pub success: bool,
    pub error_message: Option<String>,
    pub event: Option<TriggerEvent>,
}

/// 触发器函数接口
pub trait TriggerFunction: Send + Sync {
    /// 获取函数ID
    fn function_id(&self) -> &TriggerFunctionId;
    
    /// 获取函数名称
    fn name(&self) -> &str;
    
    /// 获取函数描述
    fn description(&self) -> &str;
    
    /// 获取函数版本
    fn version(&self) -> &str;
    
    /// 获取函数类型
    fn function_type(&self) -> &crate::domain::workflow::functions::conditions::FunctionType;
    
    /// 获取触发器类型
    fn trigger_type(&self) -> &TriggerType;
    
    /// 是否为异步函数
    fn is_async(&self) -> bool;
    
    /// 获取参数定义
    fn get_parameters(&self) -> HashMap<String, crate::domain::workflow::functions::conditions::FunctionParameter>;
    
    /// 获取返回类型
    fn get_return_type(&self) -> &str;
    
    /// 初始化函数
    fn initialize(&mut self, config: HashMap<String, serde_json::Value>) -> bool;
    
    /// 清理函数资源
    fn cleanup(&mut self) -> bool;
    
    /// 验证配置
    fn validate_config(&self, config: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult;
    
    /// 验证参数
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult;
    
    /// 获取元数据
    fn get_metadata(&self) -> crate::domain::workflow::functions::conditions::FunctionMetadata;
    
    /// 判断是否应该触发
    fn should_trigger(&self, context: &ExecutionContext, config: &HashMap<String, serde_json::Value>) -> TriggerResult;
    
    /// 创建触发器事件
    fn create_event(&self, data: HashMap<String, serde_json::Value>, metadata: Option<HashMap<String, String>>) -> TriggerEvent;
}

/// 内置触发器函数：时间触发器
#[derive(Debug, Clone)]
pub struct TimeTriggerFunction {
    metadata: crate::domain::workflow::functions::conditions::FunctionMetadata,
    trigger_type: TriggerType,
    initialized: bool,
}

impl TimeTriggerFunction {
    pub fn new() -> Self {
        Self {
            metadata: crate::domain::workflow::functions::conditions::FunctionMetadata {
                function_id: crate::domain::workflow::functions::conditions::ConditionFunctionId("trigger:time".to_string()),
                name: "time_trigger".to_string(),
                function_type: crate::domain::workflow::functions::conditions::FunctionType::Trigger,
                description: "基于时间条件的触发器，支持间隔时间和特定时间点两种模式".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: false,
            },
            trigger_type: TriggerType::Time,
            initialized: false,
        }
    }
}

impl TriggerFunction for TimeTriggerFunction {
    fn function_id(&self) -> &TriggerFunctionId {
        // 使用静态字符串避免生命周期问题
        static FUNCTION_ID: std::sync::OnceLock<TriggerFunctionId> = std::sync::OnceLock::new();
        FUNCTION_ID.get_or_init(|| TriggerFunctionId("trigger:time".to_string()))
    }
    
    fn name(&self) -> &str {
        &self.metadata.name
    }
    
    fn description(&self) -> &str {
        &self.metadata.description
    }
    
    fn version(&self) -> &str {
        &self.metadata.version
    }
    
    fn function_type(&self) -> &crate::domain::workflow::functions::conditions::FunctionType {
        &self.metadata.function_type
    }
    
    fn trigger_type(&self) -> &TriggerType {
        &self.trigger_type
    }
    
    fn is_async(&self) -> bool {
        self.metadata.is_async
    }
    
    fn get_parameters(&self) -> HashMap<String, crate::domain::workflow::functions::conditions::FunctionParameter> {
        let mut params = HashMap::new();
        params.insert("state".to_string(), crate::domain::workflow::functions::conditions::FunctionParameter {
            name: "state".to_string(),
            parameter_type: "ExecutionContext".to_string(),
            required: true,
            description: "当前工作流执行上下文".to_string(),
            default_value: None,
        });
        params.insert("config".to_string(), crate::domain::workflow::functions::conditions::FunctionParameter {
            name: "config".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: true,
            description: "触发器配置，包含trigger_config等".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "TriggerResult"
    }
    
    fn initialize(&mut self, _config: HashMap<String, serde_json::Value>) -> bool {
        self.initialized = true;
        true
    }
    
    fn cleanup(&mut self) -> bool {
        self.initialized = false;
        true
    }
    
    fn validate_config(&self, config: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        let mut errors = Vec::new();
        
        let trigger_config = config.get("trigger_config");
        if trigger_config.is_none() {
            errors.push("trigger_config是必需的".to_string());
        } else {
            let trigger_config = trigger_config.unwrap().as_object().unwrap();
            if !trigger_config.contains_key("trigger_time") {
                errors.push("trigger_time是必需的".to_string());
            }
        }
        
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        let mut errors = Vec::new();
        
        if !params.contains_key("state") {
            errors.push("state参数是必需的".to_string());
        }
        
        if !params.contains_key("config") {
            errors.push("config参数是必需的".to_string());
        }
        
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn get_metadata(&self) -> crate::domain::workflow::functions::conditions::FunctionMetadata {
        self.metadata.clone()
    }
    
    fn should_trigger(&self, _context: &ExecutionContext, config: &HashMap<String, serde_json::Value>) -> TriggerResult {
        let trigger_config = config.get("trigger_config")
            .and_then(|c| c.as_object())
            .cloned()
            .unwrap_or(serde_json::Map::new());
        
        let trigger_time = trigger_config.get("trigger_time")
            .and_then(|t| t.as_str());
        
        if trigger_time.is_none() {
            return TriggerResult {
                should_trigger: false,
                success: false,
                error_message: Some("trigger_time未配置".to_string()),
                event: None,
            };
        }
        
        let trigger_time = trigger_time.unwrap();
        let now = Utc::now();
        
        // 检查是否为间隔时间（秒数）
        if trigger_time.chars().all(|c| c.is_ascii_digit()) {
            let interval_seconds = trigger_time.parse::<u64>().unwrap_or(0);
            if interval_seconds == 0 {
                return TriggerResult {
                    should_trigger: false,
                    success: false,
                    error_message: Some("无效的间隔时间".to_string()),
                    event: None,
                };
            }
            
            let last_triggered = trigger_config.get("last_triggered")
                .and_then(|lt| lt.as_str())
                .and_then(|lt_str| DateTime::parse_from_rfc3339(lt_str).ok())
                .map(|dt| dt.with_timezone(&Utc));
            
            if let Some(last_time) = last_triggered {
                let duration_since_last = now.signed_duration_since(last_time);
                if duration_since_last.num_seconds() >= interval_seconds as i64 {
                    let event = self.create_event(
                        HashMap::from([
                            ("interval_seconds".to_string(), serde_json::Value::Number(serde_json::Number::from(interval_seconds))),
                            ("last_triggered".to_string(), serde_json::Value::String(last_time.to_rfc3339())),
                        ]),
                        None,
                    );
                    
                    TriggerResult {
                        should_trigger: true,
                        success: true,
                        error_message: None,
                        event: Some(event),
                    }
                } else {
                    TriggerResult {
                        should_trigger: false,
                        success: true,
                        error_message: None,
                        event: None,
                    }
                }
            } else {
                // 首次触发
                let event = self.create_event(
                    HashMap::from([
                        ("interval_seconds".to_string(), serde_json::Value::Number(serde_json::Number::from(interval_seconds))),
                        ("first_trigger".to_string(), serde_json::Value::Bool(true)),
                    ]),
                    None,
                );
                
                TriggerResult {
                    should_trigger: true,
                    success: true,
                    error_message: None,
                    event: Some(event),
                }
            }
        } else {
            // 解析时间格式 "HH:MM"
            if let Some((hour_str, minute_str)) = trigger_time.split_once(':') {
                if let (Ok(hour), Ok(minute)) = (hour_str.parse::<u32>(), minute_str.parse::<u32>()) {
                    if hour < 24 && minute < 60 {
                        let next_trigger = now.with_hour(hour).unwrap()
                            .with_minute(minute).unwrap()
                            .with_second(0).unwrap()
                            .with_nanosecond(0).unwrap();
                        
                        let next_trigger = if next_trigger <= now {
                            next_trigger + chrono::Duration::days(1)
                        } else {
                            next_trigger
                        };
                        
                        let last_triggered = trigger_config.get("last_triggered")
                            .and_then(|lt| lt.as_str())
                            .and_then(|lt_str| DateTime::parse_from_rfc3339(lt_str).ok())
                            .map(|dt| dt.with_timezone(&Utc));
                        
                        if let Some(last_time) = last_triggered {
                            if now >= next_trigger && now.date_naive() >= last_time.date_naive() {
                                let event = self.create_event(
                                    HashMap::from([
                                        ("scheduled_time".to_string(), serde_json::Value::String(next_trigger.to_rfc3339())),
                                        ("trigger_time".to_string(), serde_json::Value::String(trigger_time.to_string())),
                                    ]),
                                    None,
                                );
                                
                                TriggerResult {
                                    should_trigger: true,
                                    success: true,
                                    error_message: None,
                                    event: Some(event),
                                }
                            } else {
                                TriggerResult {
                                    should_trigger: false,
                                    success: true,
                                    error_message: None,
                                    event: None,
                                }
                            }
                        } else {
                            // 首次触发
                            let event = self.create_event(
                                HashMap::from([
                                    ("scheduled_time".to_string(), serde_json::Value::String(next_trigger.to_rfc3339())),
                                    ("trigger_time".to_string(), serde_json::Value::String(trigger_time.to_string())),
                                    ("first_trigger".to_string(), serde_json::Value::Bool(true)),
                                ]),
                                None,
                            );
                            
                            TriggerResult {
                                should_trigger: true,
                                success: true,
                                error_message: None,
                                event: Some(event),
                            }
                        }
                    } else {
                        TriggerResult {
                            should_trigger: false,
                            success: false,
                            error_message: Some("无效的时间格式".to_string()),
                            event: None,
                        }
                    }
                } else {
                    TriggerResult {
                        should_trigger: false,
                        success: false,
                        error_message: Some("无法解析时间".to_string()),
                        event: None,
                    }
                }
            } else {
                TriggerResult {
                    should_trigger: false,
                    success: false,
                    error_message: Some("无效的时间格式".to_string()),
                    event: None,
                }
            }
        }
    }
    
    fn create_event(&self, data: HashMap<String, serde_json::Value>, metadata: Option<HashMap<String, String>>) -> TriggerEvent {
        TriggerEvent {
            id: uuid::Uuid::new_v4().to_string(),
            trigger_id: TriggerFunctionId(self.metadata.function_id.0.clone()),
            trigger_type: self.trigger_type.clone(),
            timestamp: Utc::now(),
            data,
            metadata: metadata.unwrap_or_default(),
        }
    }
}

/// 内置触发器函数：状态触发器
#[derive(Debug, Clone)]
pub struct StateTriggerFunction {
    metadata: crate::domain::workflow::functions::conditions::FunctionMetadata,
    trigger_type: TriggerType,
    initialized: bool,
}

impl StateTriggerFunction {
    pub fn new() -> Self {
        Self {
            metadata: crate::domain::workflow::functions::conditions::FunctionMetadata {
                function_id: crate::domain::workflow::functions::conditions::ConditionFunctionId("trigger:state".to_string()),
                name: "state_trigger".to_string(),
                function_type: crate::domain::workflow::functions::conditions::FunctionType::Trigger,
                description: "基于状态条件的触发器，支持自定义条件表达式".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: false,
            },
            trigger_type: TriggerType::State,
            initialized: false,
        }
    }
}

impl TriggerFunction for StateTriggerFunction {
    fn function_id(&self) -> &TriggerFunctionId {
        // 使用静态字符串避免生命周期问题
        static FUNCTION_ID: std::sync::OnceLock<TriggerFunctionId> = std::sync::OnceLock::new();
        FUNCTION_ID.get_or_init(|| TriggerFunctionId("trigger:state".to_string()))
    }
    
    fn name(&self) -> &str {
        &self.metadata.name
    }
    
    fn description(&self) -> &str {
        &self.metadata.description
    }
    
    fn version(&self) -> &str {
        &self.metadata.version
    }
    
    fn function_type(&self) -> &crate::domain::workflow::functions::conditions::FunctionType {
        &self.metadata.function_type
    }
    
    fn trigger_type(&self) -> &TriggerType {
        &self.trigger_type
    }
    
    fn is_async(&self) -> bool {
        self.metadata.is_async
    }
    
    fn get_parameters(&self) -> HashMap<String, crate::domain::workflow::functions::conditions::FunctionParameter> {
        let mut params = HashMap::new();
        params.insert("state".to_string(), crate::domain::workflow::functions::conditions::FunctionParameter {
            name: "state".to_string(),
            parameter_type: "ExecutionContext".to_string(),
            required: true,
            description: "当前工作流执行上下文".to_string(),
            default_value: None,
        });
        params.insert("config".to_string(), crate::domain::workflow::functions::conditions::FunctionParameter {
            name: "config".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: true,
            description: "触发器配置，包含condition等".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "TriggerResult"
    }
    
    fn initialize(&mut self, _config: HashMap<String, serde_json::Value>) -> bool {
        self.initialized = true;
        true
    }
    
    fn cleanup(&mut self) -> bool {
        self.initialized = false;
        true
    }
    
    fn validate_config(&self, config: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        let mut errors = Vec::new();
        
        let trigger_config = config.get("trigger_config");
        if trigger_config.is_none() {
            errors.push("trigger_config是必需的".to_string());
        } else {
            let trigger_config = trigger_config.unwrap().as_object().unwrap();
            if !trigger_config.contains_key("condition") {
                errors.push("condition是必需的".to_string());
            }
        }
        
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        let mut errors = Vec::new();
        
        if !params.contains_key("state") {
            errors.push("state参数是必需的".to_string());
        }
        
        if !params.contains_key("config") {
            errors.push("config参数是必需的".to_string());
        }
        
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn get_metadata(&self) -> crate::domain::workflow::functions::conditions::FunctionMetadata {
        self.metadata.clone()
    }
    
    fn should_trigger(&self, context: &ExecutionContext, config: &HashMap<String, serde_json::Value>) -> TriggerResult {
        let trigger_config = config.get("trigger_config")
            .and_then(|c| c.as_object())
            .cloned()
            .unwrap_or(serde_json::Map::new());
        
        let condition = trigger_config.get("condition")
            .and_then(|c| c.as_str());
        
        if condition.is_none() {
            return TriggerResult {
                should_trigger: false,
                success: false,
                error_message: Some("condition未配置".to_string()),
                event: None,
            };
        }
        
        let condition = condition.unwrap();
        
        // 简单的条件评估
        let result = self.evaluate_condition_expression(condition, context);
        
        if result {
            let event = self.create_event(
                HashMap::from([
                    ("condition".to_string(), serde_json::Value::String(condition.to_string())),
                    ("result".to_string(), serde_json::Value::Bool(result)),
                ]),
                None,
            );
            
            TriggerResult {
                should_trigger: true,
                success: true,
                error_message: None,
                event: Some(event),
            }
        } else {
            TriggerResult {
                should_trigger: false,
                success: true,
                error_message: None,
                event: None,
            }
        }
    }
    
    fn create_event(&self, data: HashMap<String, serde_json::Value>, metadata: Option<HashMap<String, String>>) -> TriggerEvent {
        TriggerEvent {
            id: uuid::Uuid::new_v4().to_string(),
            trigger_id: TriggerFunctionId(self.metadata.function_id.0.clone()),
            trigger_type: self.trigger_type.clone(),
            timestamp: Utc::now(),
            data,
            metadata: metadata.unwrap_or_default(),
        }
    }
}

impl StateTriggerFunction {
    fn evaluate_condition_expression(&self, expression: &str, context: &ExecutionContext) -> bool {
        // 简单的条件表达式评估
        // 支持格式: variable == value, variable != value, etc.
        
        if let Some((left, op, right)) = self.parse_simple_condition(expression) {
            let left_value = context.get_variable(&left);
            
            let right_value = if right.starts_with('"') && right.ends_with('"') {
                Some(serde_json::Value::String(right.trim_matches('"').to_string()))
            } else if let Ok(num) = right.parse::<f64>() {
                Some(serde_json::Value::Number(serde_json::Number::from_f64(num).unwrap()))
            } else if let Ok(bool_val) = right.parse::<bool>() {
                Some(serde_json::Value::Bool(bool_val))
            } else {
                // 尝试作为变量
                context.get_variable(&right).cloned()
            };
            
            if let (Some(left_val), Some(right_val)) = (left_value, right_value) {
                match op {
                    "==" => *left_val == right_val,
                    "!=" => *left_val != right_val,
                    ">" => {
                        if let (Some(left_num), Some(right_num)) = (left_val.as_f64(), right_val.as_f64()) {
                            left_num > right_num
                        } else {
                            false
                        }
                    }
                    "<" => {
                        if let (Some(left_num), Some(right_num)) = (left_val.as_f64(), right_val.as_f64()) {
                            left_num < right_num
                        } else {
                            false
                        }
                    }
                    ">=" => {
                        if let (Some(left_num), Some(right_num)) = (left_val.as_f64(), right_val.as_f64()) {
                            left_num >= right_num
                        } else {
                            false
                        }
                    }
                    "<=" => {
                        if let (Some(left_num), Some(right_num)) = (left_val.as_f64(), right_val.as_f64()) {
                            left_num <= right_num
                        } else {
                            false
                        }
                    }
                    _ => false,
                }
            } else {
                false
            }
        } else {
            false
        }
    }

    fn parse_simple_condition<'a>(&self, expression: &'a str) -> Option<(String, &'a str, String)> {
        // 简单解析: variable operator value
        let parts: Vec<&str> = expression.split_whitespace().collect();
        if parts.len() == 3 {
            Some((parts[0].to_string(), parts[1], parts[2].to_string()))
        } else {
            None
        }
    }
}

/// 内置触发器函数集合
pub struct BuiltinTriggerFunctions;

impl BuiltinTriggerFunctions {
    /// 获取所有内置触发器函数
    pub fn get_all_functions() -> Vec<Box<dyn TriggerFunction>> {
        vec![
            Box::new(TimeTriggerFunction::new()),
            Box::new(StateTriggerFunction::new()),
        ]
    }
    
    /// 根据名称获取触发器函数
    pub fn get_function_by_name(name: &str) -> Option<Box<dyn TriggerFunction>> {
        match name {
            "time" => Some(Box::new(TimeTriggerFunction::new())),
            "state" => Some(Box::new(StateTriggerFunction::new())),
            _ => None,
        }
    }
}