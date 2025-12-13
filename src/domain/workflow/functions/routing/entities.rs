//! Routing function entities and traits

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::domain::workflow::graph::value_objects::ExecutionContext;
use crate::domain::workflow::graph::entities::NodeId;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct RouteFunctionId(pub String);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteResult {
    pub target_node: Option<NodeId>,
    pub success: bool,
    pub error_message: Option<String>,
}

/// 路由函数接口
pub trait RouteFunction: Send + Sync {
    /// 获取函数ID
    fn function_id(&self) -> &RouteFunctionId;
    
    /// 获取函数名称
    fn name(&self) -> &str;
    
    /// 获取函数描述
    fn description(&self) -> &str;
    
    /// 获取函数版本
    fn version(&self) -> &str;
    
    /// 获取函数类型
    fn function_type(&self) -> &crate::domain::workflow::functions::conditions::FunctionType;
    
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
    
    /// 执行路由决策
    fn route(&self, context: &ExecutionContext, params: &HashMap<String, serde_json::Value>) -> RouteResult;
}

/// 内置路由函数：检查是否有工具调用
#[derive(Debug, Clone)]
pub struct HasToolCallsRouteFunction {
    metadata: crate::domain::workflow::functions::conditions::FunctionMetadata,
    initialized: bool,
}

impl HasToolCallsRouteFunction {
    pub fn new() -> Self {
        Self {
            metadata: crate::domain::workflow::functions::conditions::FunctionMetadata {
                function_id: crate::domain::workflow::functions::conditions::ConditionFunctionId("route:has_tool_calls".to_string()),
                name: "has_tool_calls".to_string(),
                function_type: crate::domain::workflow::functions::conditions::FunctionType::Route,
                description: "检查工作流状态中是否有工具调用并决定路由".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: false,
            },
            initialized: false,
        }
    }
}

impl RouteFunction for HasToolCallsRouteFunction {
    fn function_id(&self) -> &RouteFunctionId {
        &RouteFunctionId(self.metadata.function_id.0.clone())
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
        params.insert("params".to_string(), crate::domain::workflow::functions::conditions::FunctionParameter {
            name: "params".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: false,
            description: "路由参数".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "RouteResult"
    }
    
    fn initialize(&mut self, _config: HashMap<String, serde_json::Value>) -> bool {
        self.initialized = true;
        true
    }
    
    fn cleanup(&mut self) -> bool {
        self.initialized = false;
        true
    }
    
    fn validate_config(&self, _config: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: true,
            errors: Vec::new(),
        }
    }
    
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        let mut errors = Vec::new();
        
        if !params.contains_key("state") {
            errors.push("state参数是必需的".to_string());
        }
        
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn get_metadata(&self) -> crate::domain::workflow::functions::conditions::FunctionMetadata {
        self.metadata.clone()
    }
    
    fn route(&self, context: &ExecutionContext, _params: &HashMap<String, serde_json::Value>) -> RouteResult {
        // 检查上下文中是否有工具调用
        if let Some(messages) = context.get_variable("messages") {
            if let Some(messages_array) = messages.as_array() {
                for message in messages_array {
                    if let Some(tool_calls) = message.get("tool_calls") {
                        if tool_calls.as_array().map_or(false, |arr| !arr.is_empty()) {
                            return RouteResult {
                                target_node: Some(NodeId("tools".to_string())),
                                success: true,
                                error_message: None,
                            };
                        }
                    }
                }
            }
        }
        
        RouteResult {
            target_node: Some(NodeId("end".to_string())),
            success: true,
            error_message: None,
        }
    }
}

/// 内置路由函数：检查是否没有工具调用
#[derive(Debug, Clone)]
pub struct NoToolCallsRouteFunction {
    metadata: crate::domain::workflow::functions::conditions::FunctionMetadata,
    initialized: bool,
}

impl NoToolCallsRouteFunction {
    pub fn new() -> Self {
        Self {
            metadata: crate::domain::workflow::functions::conditions::FunctionMetadata {
                function_id: crate::domain::workflow::functions::conditions::ConditionFunctionId("route:no_tool_calls".to_string()),
                name: "no_tool_calls".to_string(),
                function_type: crate::domain::workflow::functions::conditions::FunctionType::Route,
                description: "检查工作流状态中是否没有工具调用并决定路由".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: false,
            },
            initialized: false,
        }
    }
}

impl RouteFunction for NoToolCallsRouteFunction {
    fn function_id(&self) -> &RouteFunctionId {
        &RouteFunctionId(self.metadata.function_id.0.clone())
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
        params.insert("params".to_string(), crate::domain::workflow::functions::conditions::FunctionParameter {
            name: "params".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: false,
            description: "路由参数".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "RouteResult"
    }
    
    fn initialize(&mut self, _config: HashMap<String, serde_json::Value>) -> bool {
        self.initialized = true;
        true
    }
    
    fn cleanup(&mut self) -> bool {
        self.initialized = false;
        true
    }
    
    fn validate_config(&self, _config: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: true,
            errors: Vec::new(),
        }
    }
    
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        let mut errors = Vec::new();
        
        if !params.contains_key("state") {
            errors.push("state参数是必需的".to_string());
        }
        
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn get_metadata(&self) -> crate::domain::workflow::functions::conditions::FunctionMetadata {
        self.metadata.clone()
    }
    
    fn route(&self, context: &ExecutionContext, _params: &HashMap<String, serde_json::Value>) -> RouteResult {
        // 检查上下文中是否没有工具调用
        if let Some(messages) = context.get_variable("messages") {
            if let Some(messages_array) = messages.as_array() {
                for message in messages_array {
                    if let Some(tool_calls) = message.get("tool_calls") {
                        if tool_calls.as_array().map_or(false, |arr| !arr.is_empty()) {
                            return RouteResult {
                                target_node: None,
                                success: true,
                                error_message: None,
                            };
                        }
                    }
                }
            }
        }
        
        RouteResult {
            target_node: Some(NodeId("continue".to_string())),
            success: true,
            error_message: None,
        }
    }
}

/// 内置路由函数：检查是否有工具结果
#[derive(Debug, Clone)]
pub struct HasToolResultsRouteFunction {
    metadata: crate::domain::workflow::functions::conditions::FunctionMetadata,
    initialized: bool,
}

impl HasToolResultsRouteFunction {
    pub fn new() -> Self {
        Self {
            metadata: crate::domain::workflow::functions::conditions::FunctionMetadata {
                function_id: crate::domain::workflow::functions::conditions::ConditionFunctionId("route:has_tool_results".to_string()),
                name: "has_tool_results".to_string(),
                function_type: crate::domain::workflow::functions::conditions::FunctionType::Route,
                description: "检查工作流状态中是否有工具结果并决定路由".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: false,
            },
            initialized: false,
        }
    }
}

impl RouteFunction for HasToolResultsRouteFunction {
    fn function_id(&self) -> &RouteFunctionId {
        &RouteFunctionId(self.metadata.function_id.0.clone())
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
        params.insert("params".to_string(), crate::domain::workflow::functions::conditions::FunctionParameter {
            name: "params".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: false,
            description: "路由参数".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "RouteResult"
    }
    
    fn initialize(&mut self, _config: HashMap<String, serde_json::Value>) -> bool {
        self.initialized = true;
        true
    }
    
    fn cleanup(&mut self) -> bool {
        self.initialized = false;
        true
    }
    
    fn validate_config(&self, _config: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: true,
            errors: Vec::new(),
        }
    }
    
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        let mut errors = Vec::new();
        
        if !params.contains_key("state") {
            errors.push("state参数是必需的".to_string());
        }
        
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn get_metadata(&self) -> crate::domain::workflow::functions::conditions::FunctionMetadata {
        self.metadata.clone()
    }
    
    fn route(&self, context: &ExecutionContext, _params: &HashMap<String, serde_json::Value>) -> RouteResult {
        // 检查上下文中是否有工具结果
        if let Some(tool_results) = context.get_variable("tool_results") {
            if let Some(results_array) = tool_results.as_array() {
                if !results_array.is_empty() {
                    return RouteResult {
                        target_node: Some(NodeId("analyze".to_string())),
                        success: true,
                        error_message: None,
                    };
                }
            }
        }
        
        RouteResult {
            target_node: None,
            success: true,
            error_message: None,
        }
    }
}

/// 内置路由函数：检查是否达到最大迭代次数
#[derive(Debug, Clone)]
pub struct MaxIterationsReachedRouteFunction {
    metadata: crate::domain::workflow::functions::conditions::FunctionMetadata,
    initialized: bool,
}

impl MaxIterationsReachedRouteFunction {
    pub fn new() -> Self {
        Self {
            metadata: crate::domain::workflow::functions::conditions::FunctionMetadata {
                function_id: crate::domain::workflow::functions::conditions::ConditionFunctionId("route:max_iterations_reached".to_string()),
                name: "max_iterations_reached".to_string(),
                function_type: crate::domain::workflow::functions::conditions::FunctionType::Route,
                description: "检查是否达到最大迭代次数并决定路由".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: false,
            },
            initialized: false,
        }
    }
}

impl RouteFunction for MaxIterationsReachedRouteFunction {
    fn function_id(&self) -> &RouteFunctionId {
        &RouteFunctionId(self.metadata.function_id.0.clone())
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
        params.insert("params".to_string(), crate::domain::workflow::functions::conditions::FunctionParameter {
            name: "params".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: false,
            description: "路由参数，包含max_iterations".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "RouteResult"
    }
    
    fn initialize(&mut self, _config: HashMap<String, serde_json::Value>) -> bool {
        self.initialized = true;
        true
    }
    
    fn cleanup(&mut self) -> bool {
        self.initialized = false;
        true
    }
    
    fn validate_config(&self, _config: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: true,
            errors: Vec::new(),
        }
    }
    
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        let mut errors = Vec::new();
        
        if !params.contains_key("state") {
            errors.push("state参数是必需的".to_string());
        }
        
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn get_metadata(&self) -> crate::domain::workflow::functions::conditions::FunctionMetadata {
        self.metadata.clone()
    }
    
    fn route(&self, context: &ExecutionContext, params: &HashMap<String, serde_json::Value>) -> RouteResult {
        let max_iterations = params
            .get("max_iterations")
            .and_then(|v| v.as_u64())
            .unwrap_or(10);
        
        let iteration_count = context
            .get_variable("iteration_count")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        
        if iteration_count >= max_iterations {
            RouteResult {
                target_node: Some(NodeId("end".to_string())),
                success: true,
                error_message: None,
            }
        } else {
            RouteResult {
                target_node: None,
                success: true,
                error_message: None,
            }
        }
    }
}

/// 内置路由函数：检查是否有错误
#[derive(Debug, Clone)]
pub struct HasErrorsRouteFunction {
    metadata: crate::domain::workflow::functions::conditions::FunctionMetadata,
    initialized: bool,
}

impl HasErrorsRouteFunction {
    pub fn new() -> Self {
        Self {
            metadata: crate::domain::workflow::functions::conditions::FunctionMetadata {
                function_id: crate::domain::workflow::functions::conditions::ConditionFunctionId("route:has_errors".to_string()),
                name: "has_errors".to_string(),
                function_type: crate::domain::workflow::functions::conditions::FunctionType::Route,
                description: "检查工作流状态中是否有错误并决定路由".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: false,
            },
            initialized: false,
        }
    }
}

impl RouteFunction for HasErrorsRouteFunction {
    fn function_id(&self) -> &RouteFunctionId {
        &RouteFunctionId(self.metadata.function_id.0.clone())
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
        params.insert("params".to_string(), crate::domain::workflow::functions::conditions::FunctionParameter {
            name: "params".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: false,
            description: "路由参数".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "RouteResult"
    }
    
    fn initialize(&mut self, _config: HashMap<String, serde_json::Value>) -> bool {
        self.initialized = true;
        true
    }
    
    fn cleanup(&mut self) -> bool {
        self.initialized = false;
        true
    }
    
    fn validate_config(&self, _config: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: true,
            errors: Vec::new(),
        }
    }
    
    fn validate_parameters(&self, params: &HashMap<String, serde_json::Value>) -> crate::domain::workflow::functions::conditions::ValidationResult {
        let mut errors = Vec::new();
        
        if !params.contains_key("state") {
            errors.push("state参数是必需的".to_string());
        }
        
        crate::domain::workflow::functions::conditions::ValidationResult {
            is_valid: errors.is_empty(),
            errors,
        }
    }
    
    fn get_metadata(&self) -> crate::domain::workflow::functions::conditions::FunctionMetadata {
        self.metadata.clone()
    }
    
    fn route(&self, context: &ExecutionContext, _params: &HashMap<String, serde_json::Value>) -> RouteResult {
        // 检查工具结果中的错误
        if let Some(tool_results) = context.get_variable("tool_results") {
            if let Some(results_array) = tool_results.as_array() {
                for result in results_array {
                    if let Some(success) = result.get("success") {
                        if success.as_bool() == Some(false) {
                            return RouteResult {
                                target_node: Some(NodeId("error_handler".to_string())),
                                success: true,
                                error_message: None,
                            };
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
                            return RouteResult {
                                target_node: Some(NodeId("error_handler".to_string())),
                                success: true,
                                error_message: None,
                            };
                        }
                    }
                }
            }
        }
        
        RouteResult {
            target_node: None,
            success: true,
            error_message: None,
        }
    }
}

/// 内置路由函数集合
pub struct BuiltinRouteFunctions;

impl BuiltinRouteFunctions {
    /// 获取所有内置路由函数
    pub fn get_all_functions() -> Vec<Box<dyn RouteFunction>> {
        vec![
            Box::new(HasToolCallsRouteFunction::new()),
            Box::new(NoToolCallsRouteFunction::new()),
            Box::new(HasToolResultsRouteFunction::new()),
            Box::new(MaxIterationsReachedRouteFunction::new()),
            Box::new(HasErrorsRouteFunction::new()),
        ]
    }
    
    /// 根据名称获取路由函数
    pub fn get_function_by_name(name: &str) -> Option<Box<dyn RouteFunction>> {
        match name {
            "has_tool_calls" => Some(Box::new(HasToolCallsRouteFunction::new())),
            "no_tool_calls" => Some(Box::new(NoToolCallsRouteFunction::new())),
            "has_tool_results" => Some(Box::new(HasToolResultsRouteFunction::new())),
            "max_iterations_reached" => Some(Box::new(MaxIterationsReachedRouteFunction::new())),
            "has_errors" => Some(Box::new(HasErrorsRouteFunction::new())),
            _ => None,
        }
    }
}