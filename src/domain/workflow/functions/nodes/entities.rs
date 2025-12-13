//! Node function entities and traits

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::domain::workflow::graph::value_objects::ExecutionContext;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct NodeFunctionId(pub String);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeFunctionResult {
    pub success: bool,
    pub output: serde_json::Value,
    pub error_message: Option<String>,
    pub execution_time_ms: u64,
}

/// 节点函数接口
pub trait NodeFunction: Send + Sync {
    /// 获取函数ID
    fn function_id(&self) -> &NodeFunctionId;
    
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
    
    /// 执行节点函数
    fn execute(&self, context: &ExecutionContext, config: &HashMap<String, serde_json::Value>) -> NodeFunctionResult;
}

/// 内置节点函数：LLM节点
#[derive(Debug, Clone)]
pub struct LLMNodeFunction {
    metadata: crate::domain::workflow::functions::conditions::FunctionMetadata,
    initialized: bool,
}

impl LLMNodeFunction {
    pub fn new() -> Self {
        Self {
            metadata: crate::domain::workflow::functions::conditions::FunctionMetadata {
                function_id: crate::domain::workflow::functions::conditions::ConditionFunctionId("node:llm".to_string()),
                name: "llm_node".to_string(),
                function_type: crate::domain::workflow::functions::conditions::FunctionType::Node,
                description: "执行LLM推理的节点函数".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: true,
            },
            initialized: false,
        }
    }
}

impl NodeFunction for LLMNodeFunction {
    fn function_id(&self) -> &NodeFunctionId {
        // 使用静态字符串避免生命周期问题
        static FUNCTION_ID: std::sync::OnceLock<NodeFunctionId> = std::sync::OnceLock::new();
        FUNCTION_ID.get_or_init(|| NodeFunctionId("node:llm".to_string()))
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
        params.insert("config".to_string(), crate::domain::workflow::functions::conditions::FunctionParameter {
            name: "config".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: true,
            description: "节点配置，包含prompt、model等".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "NodeFunctionResult"
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
        
        if !config.contains_key("prompt") {
            errors.push("prompt是必需的".to_string());
        }
        
        if !config.contains_key("model") {
            errors.push("model是必需的".to_string());
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
    
    fn execute(&self, context: &ExecutionContext, config: &HashMap<String, serde_json::Value>) -> NodeFunctionResult {
        let start_time = std::time::Instant::now();
        
        // 获取配置
        let prompt = config.get("prompt")
            .and_then(|p| p.as_str())
            .unwrap_or("");
        
        let model = config.get("model")
            .and_then(|m| m.as_str())
            .unwrap_or("default");
        
        // 处理提示词中的变量替换
        let processed_prompt = self.process_prompt_template(prompt, context);
        
        // 模拟LLM调用
        let result = serde_json::json!({
            "content": format!("LLM响应：基于prompt '{}' 使用模型 {}", processed_prompt, model),
            "model": model,
            "tokens_used": 100,
            "execution_time": 0.5
        });
        
        let execution_time = start_time.elapsed().as_millis() as u64;
        
        NodeFunctionResult {
            success: true,
            output: result,
            error_message: None,
            execution_time_ms: execution_time,
        }
    }
}

impl LLMNodeFunction {
    fn process_prompt_template(&self, prompt: &str, context: &ExecutionContext) -> String {
        let mut result = prompt.to_string();
        
        // 简单的变量替换，格式为 {{variable_name}}
        for (key, value) in &context.variables {
            let placeholder = format!("{{{{{}}}}}", key);
            if let Some(value_str) = value.as_str() {
                result = result.replace(&placeholder, value_str);
            } else {
                result = result.replace(&placeholder, &value.to_string());
            }
        }
        
        result
    }
}

/// 内置节点函数：工具调用节点
#[derive(Debug, Clone)]
pub struct ToolCallNodeFunction {
    metadata: crate::domain::workflow::functions::conditions::FunctionMetadata,
    initialized: bool,
}

impl ToolCallNodeFunction {
    pub fn new() -> Self {
        Self {
            metadata: crate::domain::workflow::functions::conditions::FunctionMetadata {
                function_id: crate::domain::workflow::functions::conditions::ConditionFunctionId("node:tool_call".to_string()),
                name: "tool_call_node".to_string(),
                function_type: crate::domain::workflow::functions::conditions::FunctionType::Node,
                description: "执行工具调用的节点函数".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: true,
            },
            initialized: false,
        }
    }
}

impl NodeFunction for ToolCallNodeFunction {
    fn function_id(&self) -> &NodeFunctionId {
        // 使用静态字符串避免生命周期问题
        static FUNCTION_ID: std::sync::OnceLock<NodeFunctionId> = std::sync::OnceLock::new();
        FUNCTION_ID.get_or_init(|| NodeFunctionId("node:tool_call".to_string()))
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
        params.insert("config".to_string(), crate::domain::workflow::functions::conditions::FunctionParameter {
            name: "config".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: true,
            description: "节点配置，包含tool_name、tool_args等".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "NodeFunctionResult"
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
        
        if !config.contains_key("tool_name") {
            errors.push("tool_name是必需的".to_string());
        }
        
        if !config.contains_key("tool_args") {
            errors.push("tool_args是必需的".to_string());
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
    
    fn execute(&self, context: &ExecutionContext, config: &HashMap<String, serde_json::Value>) -> NodeFunctionResult {
        let start_time = std::time::Instant::now();
        
        // 获取配置
        let tool_name = config.get("tool_name")
            .and_then(|t| t.as_str())
            .unwrap_or("");
        
        let tool_args = config.get("tool_args")
            .and_then(|a| a.as_object())
            .cloned()
            .unwrap_or(serde_json::Map::new());
        
        // 处理参数中的变量替换
        let mut processed_args = serde_json::Map::new();
        for (key, value) in tool_args {
            if let Some(str_value) = value.as_str() {
                if str_value.starts_with("{{") && str_value.ends_with("}}") {
                    let var_name = str_value.trim_start_matches("{{").trim_end_matches("}}");
                    if let Some(context_value) = context.get_variable(var_name) {
                        processed_args.insert(key.clone(), context_value.clone());
                    } else {
                        return NodeFunctionResult {
                            success: false,
                            output: serde_json::Value::Null,
                            error_message: Some(format!("上下文中找不到变量: {}", var_name)),
                            execution_time_ms: start_time.elapsed().as_millis() as u64,
                        };
                    }
                } else {
                    processed_args.insert(key.clone(), value.clone());
                }
            } else {
                processed_args.insert(key.clone(), value.clone());
            }
        }
        
        // 模拟工具调用
        let result = serde_json::json!({
            "tool_name": tool_name,
            "tool_args": processed_args,
            "result": format!("工具 {} 的执行结果", tool_name),
            "success": true,
            "execution_time": 0.3
        });
        
        let execution_time = start_time.elapsed().as_millis() as u64;
        
        NodeFunctionResult {
            success: true,
            output: result,
            error_message: None,
            execution_time_ms: execution_time,
        }
    }
}

/// 内置节点函数：条件检查节点
#[derive(Debug, Clone)]
pub struct ConditionCheckNodeFunction {
    metadata: crate::domain::workflow::functions::conditions::FunctionMetadata,
    initialized: bool,
}

impl ConditionCheckNodeFunction {
    pub fn new() -> Self {
        Self {
            metadata: crate::domain::workflow::functions::conditions::FunctionMetadata {
                function_id: crate::domain::workflow::functions::conditions::ConditionFunctionId("node:condition_check".to_string()),
                name: "condition_check_node".to_string(),
                function_type: crate::domain::workflow::functions::conditions::FunctionType::Node,
                description: "执行条件检查的节点函数".to_string(),
                category: "builtin".to_string(),
                version: "1.0.0".to_string(),
                is_async: false,
            },
            initialized: false,
        }
    }
}

impl NodeFunction for ConditionCheckNodeFunction {
    fn function_id(&self) -> &NodeFunctionId {
        // 使用静态字符串避免生命周期问题
        static FUNCTION_ID: std::sync::OnceLock<NodeFunctionId> = std::sync::OnceLock::new();
        FUNCTION_ID.get_or_init(|| NodeFunctionId("node:condition_check".to_string()))
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
        params.insert("config".to_string(), crate::domain::workflow::functions::conditions::FunctionParameter {
            name: "config".to_string(),
            parameter_type: "HashMap<String, serde_json::Value>".to_string(),
            required: true,
            description: "节点配置，包含condition等".to_string(),
            default_value: Some(serde_json::Value::Object(serde_json::Map::new())),
        });
        params
    }
    
    fn get_return_type(&self) -> &str {
        "NodeFunctionResult"
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
        
        if !config.contains_key("condition") {
            errors.push("condition是必需的".to_string());
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
    
    fn execute(&self, context: &ExecutionContext, config: &HashMap<String, serde_json::Value>) -> NodeFunctionResult {
        let start_time = std::time::Instant::now();
        
        let condition = config.get("condition")
            .and_then(|c| c.as_str())
            .unwrap_or("");
        
        // 模拟条件检查
        let result = match self.evaluate_condition_expression(condition, context) {
            Ok(result) => serde_json::json!({
                "condition": condition,
                "result": result,
                "success": true
            }),
            Err(error) => serde_json::json!({
                "condition": condition,
                "result": false,
                "success": false,
                "error": error
            }),
        };
        
        let execution_time = start_time.elapsed().as_millis() as u64;
        
        NodeFunctionResult {
            success: true,
            output: result,
            error_message: None,
            execution_time_ms: execution_time,
        }
    }
}

impl ConditionCheckNodeFunction {
    fn evaluate_condition_expression(&self, expression: &str, context: &ExecutionContext) -> Result<bool, String> {
        // 简单的条件表达式评估
        // 支持格式: variable == value, variable != value, etc.
        
        if let Some((left, op, right)) = self.parse_simple_condition(expression) {
            let left_value = context.get_variable(&left)
                .ok_or_else(|| format!("条件表达式中找不到变量: {}", left))?;

            let right_value = if right.starts_with('"') && right.ends_with('"') {
                serde_json::Value::String(right.trim_matches('"').to_string())
            } else if let Ok(num) = right.parse::<f64>() {
                serde_json::Value::Number(serde_json::Number::from_f64(num).unwrap())
            } else if let Ok(bool_val) = right.parse::<bool>() {
                serde_json::Value::Bool(bool_val)
            } else {
                // 尝试作为变量
                context.get_variable(&right)
                    .ok_or_else(|| format!("条件表达式中找不到变量: {}", right))?
                    .clone()
            };

            match op {
                "==" => Ok(*left_value == right_value),
                "!=" => Ok(*left_value != right_value),
                ">" => {
                    if let (Some(left_num), Some(right_num)) = (left_value.as_f64(), right_value.as_f64()) {
                        Ok(left_num > right_num)
                    } else {
                        Err("数值比较需要数值类型".to_string())
                    }
                }
                "<" => {
                    if let (Some(left_num), Some(right_num)) = (left_value.as_f64(), right_value.as_f64()) {
                        Ok(left_num < right_num)
                    } else {
                        Err("数值比较需要数值类型".to_string())
                    }
                }
                ">=" => {
                    if let (Some(left_num), Some(right_num)) = (left_value.as_f64(), right_value.as_f64()) {
                        Ok(left_num >= right_num)
                    } else {
                        Err("数值比较需要数值类型".to_string())
                    }
                }
                "<=" => {
                    if let (Some(left_num), Some(right_num)) = (left_value.as_f64(), right_value.as_f64()) {
                        Ok(left_num <= right_num)
                    } else {
                        Err("数值比较需要数值类型".to_string())
                    }
                }
                _ => Err(format!("不支持的操作符: {}", op)),
            }
        } else {
            Err("无法解析条件表达式".to_string())
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

/// 内置节点函数集合
pub struct BuiltinNodeFunctions;

impl BuiltinNodeFunctions {
    /// 获取所有内置节点函数
    pub fn get_all_functions() -> Vec<Box<dyn NodeFunction>> {
        vec![
            Box::new(LLMNodeFunction::new()),
            Box::new(ToolCallNodeFunction::new()),
            Box::new(ConditionCheckNodeFunction::new()),
        ]
    }
    
    /// 根据名称获取节点函数
    pub fn get_function_by_name(name: &str) -> Option<Box<dyn NodeFunction>> {
        match name {
            "llm" => Some(Box::new(LLMNodeFunction::new())),
            "tool_call" => Some(Box::new(ToolCallNodeFunction::new())),
            "condition_check" => Some(Box::new(ConditionCheckNodeFunction::new())),
            _ => None,
        }
    }
}