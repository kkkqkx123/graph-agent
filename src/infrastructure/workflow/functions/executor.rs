//! Function executor implementation

use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;

use crate::domain::workflow::{
    functions::{
        conditions::ConditionFunction,
        nodes::NodeFunction,
        routing::RouteFunction,
        triggers::TriggerFunction,
    },
    graph::value_objects::ExecutionContext,
};

#[derive(Debug, Error)]
pub enum FunctionExecutorError {
    #[error("函数执行失败: {0}")]
    ExecutionFailed(String),
    #[error("函数不存在: {0}")]
    FunctionNotFound(String),
    #[error("函数类型不支持: {0}")]
    UnsupportedFunctionType(String),
    #[error("参数验证失败: {0}")]
    ParameterValidationFailed(String),
}

pub type FunctionExecutorResult<T> = Result<T, FunctionExecutorError>;

/// 函数执行器
#[derive(Debug, Clone)]
pub struct FunctionExecutor {
    condition_functions: HashMap<String, Arc<dyn ConditionFunction>>,
    node_functions: HashMap<String, Arc<dyn NodeFunction>>,
    route_functions: HashMap<String, Arc<dyn RouteFunction>>,
    trigger_functions: HashMap<String, Arc<dyn TriggerFunction>>,
}

impl FunctionExecutor {
    pub fn new() -> Self {
        Self {
            condition_functions: HashMap::new(),
            node_functions: HashMap::new(),
            route_functions: HashMap::new(),
            trigger_functions: HashMap::new(),
        }
    }

    /// 注册条件函数
    pub fn register_condition_function(&mut self, function: Arc<dyn ConditionFunction>) {
        let name = function.name().to_string();
        self.condition_functions.insert(name, function);
    }

    /// 注册节点函数
    pub fn register_node_function(&mut self, function: Arc<dyn NodeFunction>) {
        let name = function.name().to_string();
        self.node_functions.insert(name, function);
    }

    /// 注册路由函数
    pub fn register_route_function(&mut self, function: Arc<dyn RouteFunction>) {
        let name = function.name().to_string();
        self.route_functions.insert(name, function);
    }

    /// 注册触发器函数
    pub fn register_trigger_function(&mut self, function: Arc<dyn TriggerFunction>) {
        let name = function.name().to_string();
        self.trigger_functions.insert(name, function);
    }

    /// 执行条件函数
    pub async fn execute_condition_function(
        &self,
        function_name: &str,
        context: &ExecutionContext,
        condition: HashMap<String, serde_json::Value>,
    ) -> FunctionExecutorResult<bool> {
        let function = self.condition_functions.get(function_name)
            .ok_or_else(|| FunctionExecutorError::FunctionNotFound(format!("条件函数: {}", function_name)))?;

        // 验证参数
        let mut params = HashMap::new();
        params.insert("state".to_string(), serde_json::Value::Object(
            context.variables.iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect()
        ));
        params.insert("condition".to_string(), serde_json::Value::Object(
            condition.iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect()
        ));

        let validation_result = function.validate_parameters(&params);
        if !validation_result.is_valid {
            return Err(FunctionExecutorError::ParameterValidationFailed(
                validation_result.errors.join(", ")
            ));
        }

        // 执行函数
        Ok(function.evaluate(context, &condition))
    }

    /// 执行节点函数
    pub async fn execute_node_function(
        &self,
        function_name: &str,
        context: &ExecutionContext,
        config: HashMap<String, serde_json::Value>,
    ) -> FunctionExecutorResult<crate::domain::workflow::functions::nodes::NodeFunctionResult> {
        let function = self.node_functions.get(function_name)
            .ok_or_else(|| FunctionExecutorError::FunctionNotFound(format!("节点函数: {}", function_name)))?;

        // 验证参数
        let mut params = HashMap::new();
        params.insert("state".to_string(), serde_json::Value::Object(
            context.variables.iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect()
        ));
        params.insert("config".to_string(), serde_json::Value::Object(
            config.iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect()
        ));

        let validation_result = function.validate_parameters(&params);
        if !validation_result.is_valid {
            return Err(FunctionExecutorError::ParameterValidationFailed(
                validation_result.errors.join(", ")
            ));
        }

        // 执行函数
        Ok(function.execute(context, &config))
    }

    /// 执行路由函数
    pub async fn execute_route_function(
        &self,
        function_name: &str,
        context: &ExecutionContext,
        params: HashMap<String, serde_json::Value>,
    ) -> FunctionExecutorResult<crate::domain::workflow::functions::routing::RouteResult> {
        let function = self.route_functions.get(function_name)
            .ok_or_else(|| FunctionExecutorError::FunctionNotFound(format!("路由函数: {}", function_name)))?;

        // 验证参数
        let mut function_params = HashMap::new();
        function_params.insert("state".to_string(), serde_json::Value::Object(
            context.variables.iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect()
        ));
        function_params.insert("params".to_string(), serde_json::Value::Object(
            params.iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect()
        ));

        let validation_result = function.validate_parameters(&function_params);
        if !validation_result.is_valid {
            return Err(FunctionExecutorError::ParameterValidationFailed(
                validation_result.errors.join(", ")
            ));
        }

        // 执行函数
        Ok(function.route(context, &params))
    }

    /// 执行触发器函数
    pub async fn execute_trigger_function(
        &self,
        function_name: &str,
        context: &ExecutionContext,
        config: HashMap<String, serde_json::Value>,
    ) -> FunctionExecutorResult<crate::domain::workflow::functions::triggers::TriggerResult> {
        let function = self.trigger_functions.get(function_name)
            .ok_or_else(|| FunctionExecutorError::FunctionNotFound(format!("触发器函数: {}", function_name)))?;

        // 验证参数
        let mut params = HashMap::new();
        params.insert("state".to_string(), serde_json::Value::Object(
            context.variables.iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect()
        ));
        params.insert("config".to_string(), serde_json::Value::Object(
            config.iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect()
        ));

        let validation_result = function.validate_parameters(&params);
        if !validation_result.is_valid {
            return Err(FunctionExecutorError::ParameterValidationFailed(
                validation_result.errors.join(", ")
            ));
        }

        // 执行函数
        Ok(function.should_trigger(context, &config))
    }

    /// 批量注册内置函数
    pub fn register_builtin_functions(&mut self) {
        // 注册内置条件函数
        for function in crate::domain::workflow::functions::conditions::BuiltinConditionFunctions::get_all_functions() {
            self.register_condition_function(Arc::new(function));
        }

        // 注册内置节点函数
        for function in crate::domain::workflow::functions::nodes::BuiltinNodeFunctions::get_all_functions() {
            self.register_node_function(Arc::new(function));
        }

        // 注册内置路由函数
        for function in crate::domain::workflow::functions::routing::BuiltinRouteFunctions::get_all_functions() {
            self.register_route_function(Arc::new(function));
        }

        // 注册内置触发器函数
        for function in crate::domain::workflow::functions::triggers::BuiltinTriggerFunctions::get_all_functions() {
            self.register_trigger_function(Arc::new(function));
        }
    }

    /// 获取所有已注册的函数名称
    pub fn get_registered_function_names(&self) -> FunctionExecutorResult<Vec<String>> {
        let mut names = Vec::new();
        
        names.extend(self.condition_functions.keys().cloned());
        names.extend(self.node_functions.keys().cloned());
        names.extend(self.route_functions.keys().cloned());
        names.extend(self.trigger_functions.keys().cloned());
        
        names.sort();
        names.dedup();
        
        Ok(names)
    }

    /// 获取条件函数列表
    pub fn get_condition_function_names(&self) -> Vec<String> {
        let mut names: Vec<String> = self.condition_functions.keys().cloned().collect();
        names.sort();
        names
    }

    /// 获取节点函数列表
    pub fn get_node_function_names(&self) -> Vec<String> {
        let mut names: Vec<String> = self.node_functions.keys().cloned().collect();
        names.sort();
        names
    }

    /// 获取路由函数列表
    pub fn get_route_function_names(&self) -> Vec<String> {
        let mut names: Vec<String> = self.route_functions.keys().cloned().collect();
        names.sort();
        names
    }

    /// 获取触发器函数列表
    pub fn get_trigger_function_names(&self) -> Vec<String> {
        let mut names: Vec<String> = self.trigger_functions.keys().cloned().collect();
        names.sort();
        names
    }
}

/// 函数执行器构建器
pub struct FunctionExecutorBuilder {
    executor: FunctionExecutor,
}

impl FunctionExecutorBuilder {
    pub fn new() -> Self {
        Self {
            executor: FunctionExecutor::new(),
        }
    }

    pub fn with_condition_function(mut self, function: Arc<dyn ConditionFunction>) -> Self {
        self.executor.register_condition_function(function);
        self
    }

    pub fn with_node_function(mut self, function: Arc<dyn NodeFunction>) -> Self {
        self.executor.register_node_function(function);
        self
    }

    pub fn with_route_function(mut self, function: Arc<dyn RouteFunction>) -> Self {
        self.executor.register_route_function(function);
        self
    }

    pub fn with_trigger_function(mut self, function: Arc<dyn TriggerFunction>) -> Self {
        self.executor.register_trigger_function(function);
        self
    }

    pub fn with_builtin_functions(mut self) -> Self {
        self.executor.register_builtin_functions();
        self
    }

    pub fn build(self) -> FunctionExecutor {
        self.executor
    }
}

impl Default for FunctionExecutorBuilder {
    fn default() -> Self {
        Self::new().with_builtin_functions()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::workflow::functions::conditions::HasToolCallsCondition;
    use crate::domain::workflow::functions::nodes::LLMNodeFunction;
    use crate::domain::workflow::graph::value_objects::ExecutionContext;

    #[tokio::test]
    async fn test_function_executor() {
        let mut executor = FunctionExecutor::new();
        
        // 注册测试函数
        executor.register_condition_function(Arc::new(HasToolCallsCondition::new()));
        executor.register_node_function(Arc::new(LLMNodeFunction::new()));
        
        // 创建测试上下文
        let mut context = ExecutionContext::default();
        context.set_variable("messages".to_string(), serde_json::json!([
            {
                "role": "user",
                "content": "Hello"
            },
            {
                "role": "assistant",
                "content": "Hi there!",
                "tool_calls": [
                    {
                        "id": "call_123",
                        "type": "function"
                    }
                ]
            }
        ]));
        
        // 测试条件函数
        let condition_result = executor.execute_condition_function(
            "has_tool_calls",
            &context,
            HashMap::new(),
        ).await;
        assert!(condition_result.is_ok());
        assert!(condition_result.unwrap());
        
        // 测试节点函数
        let node_config = HashMap::from([
            ("prompt".to_string(), serde_json::Value::String("Test prompt".to_string())),
            ("model".to_string(), serde_json::Value::String("gpt-3.5-turbo".to_string())),
        ]);
        
        let node_result = executor.execute_node_function(
            "llm_node",
            &context,
            node_config,
        ).await;
        assert!(node_result.is_ok());
        assert!(node_result.unwrap().success);
    }
}