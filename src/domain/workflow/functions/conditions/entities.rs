//! Condition function entities and traits

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::domain::workflow::graph::value_objects::ExecutionContext;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ConditionFunctionId(pub String);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionMetadata {
    pub function_id: ConditionFunctionId,
    pub name: String,
    pub function_type: FunctionType,
    pub description: String,
    pub category: String,
    pub version: String,
    pub is_async: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum FunctionType {
    Condition,
    Node,
    Route,
    Trigger,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionParameter {
    pub name: String,
    pub parameter_type: String,
    pub required: bool,
    pub description: String,
    pub default_value: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
}

/// 条件函数接口
pub trait ConditionFunction: Send + Sync {
    /// 获取函数ID
    fn function_id(&self) -> &ConditionFunctionId;
    
    /// 获取函数名称
    fn name(&self) -> &str;
    
    /// 获取函数描述
    fn description(&self) -> &str;
    
    /// 获取函数版本
    fn version(&self) -> &str;
    
    /// 获取函数类型
    fn function_type(&self) -> &FunctionType;
    
    /// 是否为异步函数
    fn is_async(&self) -> bool;
    
    /// 获取参数定义
    fn get_parameters(&self) -> HashMap<String, FunctionParameter>;
    
    /// 获取返回类型
    fn get_return_type(&self) -> &str;
    
    /// 初始化函数
    fn initialize(&mut self, config: HashMap<String, serde_json::Value>) -> bool;
    
    /// 清理函数资源
    fn cleanup(&mut self) -> bool;
    
    /// 验证配置
    fn validate_config(&self, config: &HashMap<String, serde_json::Value>) -> ValidationResult;
    
    /// 验证参数
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> ValidationResult;
    
    /// 获取元数据
    fn get_metadata(&self) -> FunctionMetadata;
    
    /// 评估条件
    fn evaluate(&self, context: &ExecutionContext, condition: &HashMap<String, serde_json::Value>) -> bool;
}

/// 内置条件函数：检查是否有工具调用
#[derive(Debug, Clone)]
pub struct HasToolCallsCondition {
    metadata: FunctionMetadata,
    initialized: bool,
}

impl HasToolCallsCondition {
    pub fn new() -> Self {
        Self {
            metadata: FunctionMetadata {
                function_id: ConditionFunctionId("condition:has_tool_calls".to_string()),
                name: "has_tool_calls".to_string(),
                function_type: FunctionType::Condition,
                description: "检查工作流状态中是否有工具调用".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: false,
            },
            initialized: false,
        }
    }
}

impl ConditionFunction for HasToolCallsCondition {
    fn function_id(&self) -> &ConditionFunctionId {
        &self.metadata.function_id
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
    
    fn function_type(&self) -> &FunctionType {
        &self.metadata.function_type
    }
    
    fn is_async(&self) -> bool {
        self.metadata.is_async
    }
    
    fn get_parameters(&self) -> HashMap<String, FunctionParameter> {
        let mut params = HashMap::new();
        params.insert("state".to_string(), FunctionParameter {
            name: "state".to_string(),
            parameter_type: "ExecutionContext".to_string(),
            required: true,
            description: "当前工作流执行上下文".to_string(),
            default_value: None,
        });
        params.insert("condition".to_string(), FunctionParameter {
            name: "condition".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: false,
            description: "条件配置".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "bool"
    }
    
    fn initialize(&mut self, _config: HashMap<String, serde_json::Value>) -> bool {
        self.initialized = true;
        true
    }
    
    fn cleanup(&mut self) -> bool {
        self.initialized = false;
        true
    }
    
    fn validate_config(&self, _config: &HashMap<String, serde_json::Value>) -> ValidationResult {
        ValidationResult {
            is_valid: true,
            errors: Vec::new(),
        }
    }
    
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> ValidationResult {
        let mut errors = Vec::new();
        
        if !params.contains_key("state") {
            errors.push("state参数是必需的".to_string());
        }
        
        ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn get_metadata(&self) -> FunctionMetadata {
        self.metadata.clone()
    }
    
    fn evaluate(&self, context: &ExecutionContext, _condition: &HashMap<String, serde_json::Value>) -> bool {
        // 检查上下文中是否有工具调用
        if let Some(messages) = context.get_variable("messages") {
            if let Some(messages_array) = messages.as_array() {
                for message in messages_array {
                    if let Some(tool_calls) = message.get("tool_calls") {
                        if tool_calls.as_array().map_or(false, |arr| !arr.is_empty()) {
                            return true;
                        }
                    }
                }
            }
        }
        false
    }
}

/// 内置条件函数：检查是否没有工具调用
#[derive(Debug, Clone)]
pub struct NoToolCallsCondition {
    metadata: FunctionMetadata,
    initialized: bool,
}

impl NoToolCallsCondition {
    pub fn new() -> Self {
        Self {
            metadata: FunctionMetadata {
                function_id: ConditionFunctionId("condition:no_tool_calls".to_string()),
                name: "no_tool_calls".to_string(),
                function_type: FunctionType::Condition,
                description: "检查工作流状态中是否没有工具调用".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: false,
            },
            initialized: false,
        }
    }
}

impl ConditionFunction for NoToolCallsCondition {
    fn function_id(&self) -> &ConditionFunctionId {
        &self.metadata.function_id
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
    
    fn function_type(&self) -> &FunctionType {
        &self.metadata.function_type
    }
    
    fn is_async(&self) -> bool {
        self.metadata.is_async
    }
    
    fn get_parameters(&self) -> HashMap<String, FunctionParameter> {
        let mut params = HashMap::new();
        params.insert("state".to_string(), FunctionParameter {
            name: "state".to_string(),
            parameter_type: "ExecutionContext".to_string(),
            required: true,
            description: "当前工作流执行上下文".to_string(),
            default_value: None,
        });
        params.insert("condition".to_string(), FunctionParameter {
            name: "condition".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: false,
            description: "条件配置".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "bool"
    }
    
    fn initialize(&mut self, _config: HashMap<String, serde_json::Value>) -> bool {
        self.initialized = true;
        true
    }
    
    fn cleanup(&mut self) -> bool {
        self.initialized = false;
        true
    }
    
    fn validate_config(&self, _config: &HashMap<String, serde_json::Value>) -> ValidationResult {
        ValidationResult {
            is_valid: true,
            errors: Vec::new(),
        }
    }
    
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> ValidationResult {
        let mut errors = Vec::new();
        
        if !params.contains_key("state") {
            errors.push("state参数是必需的".to_string());
        }
        
        ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn get_metadata(&self) -> FunctionMetadata {
        self.metadata.clone()
    }
    
    fn evaluate(&self, context: &ExecutionContext, _condition: &HashMap<String, serde_json::Value>) -> bool {
        // 检查上下文中是否没有工具调用
        if let Some(messages) = context.get_variable("messages") {
            if let Some(messages_array) = messages.as_array() {
                for message in messages_array {
                    if let Some(tool_calls) = message.get("tool_calls") {
                        if tool_calls.as_array().map_or(false, |arr| !arr.is_empty()) {
                            return false;
                        }
                    }
                }
            }
        }
        true
    }
}

/// 内置条件函数：检查是否有工具结果
#[derive(Debug, Clone)]
pub struct HasToolResultsCondition {
    metadata: FunctionMetadata,
    initialized: bool,
}

impl HasToolResultsCondition {
    pub fn new() -> Self {
        Self {
            metadata: FunctionMetadata {
                function_id: ConditionFunctionId("condition:has_tool_results".to_string()),
                name: "has_tool_results".to_string(),
                function_type: FunctionType::Condition,
                description: "检查工作流状态中是否有工具结果".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: false,
            },
            initialized: false,
        }
    }
}

impl ConditionFunction for HasToolResultsCondition {
    fn function_id(&self) -> &ConditionFunctionId {
        &self.metadata.function_id
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
    
    fn function_type(&self) -> &FunctionType {
        &self.metadata.function_type
    }
    
    fn is_async(&self) -> bool {
        self.metadata.is_async
    }
    
    fn get_parameters(&self) -> HashMap<String, FunctionParameter> {
        let mut params = HashMap::new();
        params.insert("state".to_string(), FunctionParameter {
            name: "state".to_string(),
            parameter_type: "ExecutionContext".to_string(),
            required: true,
            description: "当前工作流执行上下文".to_string(),
            default_value: None,
        });
        params.insert("condition".to_string(), FunctionParameter {
            name: "condition".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: false,
            description: "条件配置".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "bool"
    }
    
    fn initialize(&mut self, _config: HashMap<String, serde_json::Value>) -> bool {
        self.initialized = true;
        true
    }
    
    fn cleanup(&mut self) -> bool {
        self.initialized = false;
        true
    }
    
    fn validate_config(&self, _config: &HashMap<String, serde_json::Value>) -> ValidationResult {
        ValidationResult {
            is_valid: true,
            errors: Vec::new(),
        }
    }
    
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> ValidationResult {
        let mut errors = Vec::new();
        
        if !params.contains_key("state") {
            errors.push("state参数是必需的".to_string());
        }
        
        ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn get_metadata(&self) -> FunctionMetadata {
        self.metadata.clone()
    }
    
    fn evaluate(&self, context: &ExecutionContext, _condition: &HashMap<String, serde_json::Value>) -> bool {
        // 检查上下文中是否有工具结果
        if let Some(tool_results) = context.get_variable("tool_results") {
            if let Some(results_array) = tool_results.as_array() {
                return !results_array.is_empty();
            }
        }
        false
    }
}

/// 内置条件函数：检查是否有错误
#[derive(Debug, Clone)]
pub struct HasErrorsCondition {
    metadata: FunctionMetadata,
    initialized: bool,
}

impl HasErrorsCondition {
    pub fn new() -> Self {
        Self {
            metadata: FunctionMetadata {
                function_id: ConditionFunctionId("condition:has_errors".to_string()),
                name: "has_errors".to_string(),
                function_type: FunctionType::Condition,
                description: "检查工作流状态中是否有错误".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: false,
            },
            initialized: false,
        }
    }
}

impl ConditionFunction for HasErrorsCondition {
    fn function_id(&self) -> &ConditionFunctionId {
        &self.metadata.function_id
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
    
    fn function_type(&self) -> &FunctionType {
        &self.metadata.function_type
    }
    
    fn is_async(&self) -> bool {
        self.metadata.is_async
    }
    
    fn get_parameters(&self) -> HashMap<String, FunctionParameter> {
        let mut params = HashMap::new();
        params.insert("state".to_string(), FunctionParameter {
            name: "state".to_string(),
            parameter_type: "ExecutionContext".to_string(),
            required: true,
            description: "当前工作流执行上下文".to_string(),
            default_value: None,
        });
        params.insert("condition".to_string(), FunctionParameter {
            name: "condition".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: false,
            description: "条件配置".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "bool"
    }
    
    fn initialize(&mut self, _config: HashMap<String, serde_json::Value>) -> bool {
        self.initialized = true;
        true
    }
    
    fn cleanup(&mut self) -> bool {
        self.initialized = false;
        true
    }
    
    fn validate_config(&self, _config: &HashMap<String, serde_json::Value>) -> ValidationResult {
        ValidationResult {
            is_valid: true,
            errors: Vec::new(),
        }
    }
    
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> ValidationResult {
        let mut errors = Vec::new();
        
        if !params.contains_key("state") {
            errors.push("state参数是必需的".to_string());
        }
        
        ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn get_metadata(&self) -> FunctionMetadata {
        self.metadata.clone()
    }
    
    fn evaluate(&self, context: &ExecutionContext, _condition: &HashMap<String, serde_json::Value>) -> bool {
        // 检查工具结果中的错误
        if let Some(tool_results) = context.get_variable("tool_results") {
            if let Some(results_array) = tool_results.as_array() {
                for result in results_array {
                    if let Some(success) = result.get("success") {
                        if success.as_bool() == Some(false) {
                            return true;
                        }
                    }
                }
            }
        }
        
        // 检查消息中的错误
        if let Some(messages) = context.get_variable("messages") {
            if let Some(messages_array) = messages.as_array() {
                for message in messages_array {
                    if let Some(message_type) = message.get("type") {
                        if message_type.as_str() == Some("error") {
                            return true;
                        }
                    }
                }
            }
        }
        
        false
    }
}

/// 内置条件函数：检查是否达到最大迭代次数
#[derive(Debug, Clone)]
pub struct MaxIterationsReachedCondition {
    metadata: FunctionMetadata,
    initialized: bool,
}

impl MaxIterationsReachedCondition {
    pub fn new() -> Self {
        Self {
            metadata: FunctionMetadata {
                function_id: ConditionFunctionId("condition:max_iterations_reached".to_string()),
                name: "max_iterations_reached".to_string(),
                function_type: FunctionType::Condition,
                description: "检查是否达到最大迭代次数".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: false,
            },
            initialized: false,
        }
    }
}

impl ConditionFunction for MaxIterationsReachedCondition {
    fn function_id(&self) -> &ConditionFunctionId {
        &self.metadata.function_id
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
    
    fn function_type(&self) -> &FunctionType {
        &self.metadata.function_type
    }
    
    fn is_async(&self) -> bool {
        self.metadata.is_async
    }
    
    fn get_parameters(&self) -> HashMap<String, FunctionParameter> {
        let mut params = HashMap::new();
        params.insert("state".to_string(), FunctionParameter {
            name: "state".to_string(),
            parameter_type: "ExecutionContext".to_string(),
            required: true,
            description: "当前工作流执行上下文".to_string(),
            default_value: None,
        });
        params.insert("condition".to_string(), FunctionParameter {
            name: "condition".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: false,
            description: "条件配置，包含max_iterations".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "bool"
    }
    
    fn initialize(&mut self, _config: HashMap<String, serde_json::Value>) -> bool {
        self.initialized = true;
        true
    }
    
    fn cleanup(&mut self) -> bool {
        self.initialized = false;
        true
    }
    
    fn validate_config(&self, _config: &HashMap<String, serde_json::Value>) -> ValidationResult {
        ValidationResult {
            is_valid: true,
            errors: Vec::new(),
        }
    }
    
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> ValidationResult {
        let mut errors = Vec::new();
        
        if !params.contains_key("state") {
            errors.push("state参数是必需的".to_string());
        }
        
        ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn get_metadata(&self) -> FunctionMetadata {
        self.metadata.clone()
    }
    
    fn evaluate(&self, context: &ExecutionContext, condition: &HashMap<String, serde_json::Value>) -> bool {
        let max_iterations = condition
            .get("max_iterations")
            .and_then(|v| v.as_u64())
            .unwrap_or(10);
        
        let iteration_count = context
            .get_variable("iteration_count")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        
        iteration_count >= max_iterations
    }
}

/// 内置条件函数集合
pub struct BuiltinConditionFunctions;

impl BuiltinConditionFunctions {
    /// 获取所有内置条件函数
    pub fn get_all_functions() -> Vec<Box<dyn ConditionFunction>> {
        vec![
            Box::new(HasToolCallsCondition::new()),
            Box::new(NoToolCallsCondition::new()),
            Box::new(HasToolResultsCondition::new()),
            Box::new(HasErrorsCondition::new()),
            Box::new(MaxIterationsReachedCondition::new()),
        ]
    }
    
    /// 根据名称获取条件函数
    pub fn get_function_by_name(name: &str) -> Option<Box<dyn ConditionFunction>> {
        match name {
            "has_tool_calls" => Some(Box::new(HasToolCallsCondition::new())),
            "no_tool_calls" => Some(Box::new(NoToolCallsCondition::new())),
            "has_tool_results" => Some(Box::new(HasToolResultsCondition::new())),
            "has_errors" => Some(Box::new(HasErrorsCondition::new())),
            "max_iterations_reached" => Some(Box::new(MaxIterationsReachedCondition::new())),
            _ => None,
        }
    }
}