use std::collections::HashMap;
use std::time::Duration;
use async_trait::async_trait;
use reqwest::{Client, Method, StatusCode};
use serde_json::{json, Value};
use tracing::{info, warn, error};

use crate::domain::tools::{
    Tool, ToolExecutionResult, ToolExecutionError, SerializedValue, ToolType
};
use crate::infrastructure::tools::executors::ToolExecutor;

/// REST工具执行器
pub struct RestToolExecutor {
    /// HTTP客户端
    http_client: Client,
    /// 默认超时时间
    default_timeout: Duration,
}

impl RestToolExecutor {
    /// 创建新的REST工具执行器
    pub fn new() -> Self {
        Self {
            http_client: Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .expect("Failed to create HTTP client"),
            default_timeout: Duration::from_secs(30),
        }
    }

    /// 创建带自定义超时的REST工具执行器
    pub fn with_timeout(timeout: Duration) -> Self {
        Self {
            http_client: Client::builder()
                .timeout(timeout)
                .build()
                .expect("Failed to create HTTP client"),
            default_timeout: timeout,
        }
    }

    /// 创建带自定义HTTP客户端的REST工具执行器
    pub fn with_client(http_client: Client) -> Self {
        Self {
            http_client,
            default_timeout: Duration::from_secs(30),
        }
    }

    /// 执行HTTP请求
    async fn execute_http_request(
        &self,
        method: Method,
        url: &str,
        headers: Option<HashMap<String, String>>,
        body: Option<Value>,
        timeout: Option<Duration>,
    ) -> Result<SerializedValue, ToolExecutionError> {
        let timeout = timeout.unwrap_or(self.default_timeout);
        
        // 构建请求
        let mut request = self.http_client.request(method, url);
        
        // 设置超时
        request = request.timeout(timeout);
        
        // 设置请求头
        if let Some(headers) = headers {
            for (key, value) in headers {
                request = request.header(&key, &value);
            }
        }
        
        // 设置请求体
        if let Some(body) = body {
            request = request.json(&body);
        }
        
        // 发送请求
        let response = request.send().await.map_err(|e| {
            ToolExecutionError::network_error(format!("HTTP请求失败: {}", e))
        })?;
        
        // 检查响应状态
        let status = response.status();
        if status.is_client_error() || status.is_server_error() {
            return Err(ToolExecutionError::external_service_error(
                format!("HTTP请求返回错误状态: {}", status)
            ));
        }
        
        // 读取响应体
        let response_text = response.text().await.map_err(|e| {
            ToolExecutionError::network_error(format!("读取响应体失败: {}", e))
        })?;
        
        // 尝试解析JSON
        let response_value: Value = serde_json::from_str(&response_text)
            .map_err(|_| {
                // 如果不是JSON，返回原始文本
                ToolExecutionError::deserialization_error("响应不是有效的JSON格式".to_string())
            })?;
        
        // 转换为SerializedValue
        self.convert_json_to_serialized_value(response_value)
            .map_err(|e| ToolExecutionError::deserialization_error(format!("转换响应失败: {}", e)))
    }

    /// 将JSON值转换为SerializedValue
    fn convert_json_to_serialized_value(&self, value: Value) -> Result<SerializedValue, String> {
        match value {
            Value::Null => Ok(SerializedValue::Null),
            Value::Bool(b) => Ok(SerializedValue::Bool(b)),
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    Ok(SerializedValue::Number(i as f64))
                } else if let Some(f) = n.as_f64() {
                    Ok(SerializedValue::Number(f))
                } else {
                    Err("无法转换数字".to_string())
                }
            }
            Value::String(s) => Ok(SerializedValue::String(s)),
            Value::Array(arr) => {
                let converted: Result<Vec<_>, _> = arr
                    .into_iter()
                    .map(|v| self.convert_json_to_serialized_value(v))
                    .collect();
                Ok(SerializedValue::Array(converted?))
            }
            Value::Object(obj) => {
                let converted: Result<HashMap<_, _>, _> = obj
                    .into_iter()
                    .map(|(k, v)| {
                        self.convert_json_to_serialized_value(v)
                            .map(|sv| (k, sv))
                    })
                    .collect();
                Ok(SerializedValue::Object(converted?))
            }
        }
    }

    /// 从参数中提取HTTP方法
    fn extract_method(&self, parameters: &HashMap<String, SerializedValue>) -> Result<Method, ToolExecutionError> {
        let method_str = parameters.get("method")
            .and_then(|v| match v {
                SerializedValue::String(s) => Some(s.clone()),
                _ => None,
            })
            .unwrap_or_else(|| "GET".to_string());
        
        Method::from_bytes(method_str.as_bytes()).map_err(|_| {
            ToolExecutionError::environment_error(format!("无效的HTTP方法: {}", method_str))
        })
    }

    /// 从参数中提取URL
    fn extract_url(&self, parameters: &HashMap<String, SerializedValue>) -> Result<String, ToolExecutionError> {
        parameters.get("url")
            .and_then(|v| match v {
                SerializedValue::String(s) => Some(s.clone()),
                _ => None,
            })
            .ok_or_else(|| ToolExecutionError::environment_error("缺少必需参数: url".to_string()))
    }

    /// 从参数中提取请求头
    fn extract_headers(&self, parameters: &HashMap<String, SerializedValue>) -> Option<HashMap<String, String>> {
        parameters.get("headers")
            .and_then(|v| match v {
                SerializedValue::Object(obj) => {
                    let mut headers = HashMap::new();
                    for (k, v) in obj {
                        if let SerializedValue::String(s) = v {
                            headers.insert(k.clone(), s.clone());
                        }
                    }
                    Some(headers)
                }
                _ => None,
            })
    }

    /// 从参数中提取请求体
    fn extract_body(&self, parameters: &HashMap<String, SerializedValue>) -> Option<Value> {
        parameters.get("body")
            .and_then(|v| match v {
                SerializedValue::String(s) => {
                    // 尝试解析为JSON
                    serde_json::from_str(s).ok()
                }
                SerializedValue::Object(obj) => {
                    // 转换为JSON对象
                    let mut json_obj = serde_json::Map::new();
                    for (k, v) in obj {
                        if let Ok(json_val) = self.convert_serialized_value_to_json(v) {
                            json_obj.insert(k.clone(), json_val);
                        }
                    }
                    Some(Value::Object(json_obj))
                }
                _ => None,
            })
    }

    /// 从参数中提取超时时间
    fn extract_timeout(&self, parameters: &HashMap<String, SerializedValue>) -> Option<Duration> {
        parameters.get("timeout_ms")
            .and_then(|v| match v {
                SerializedValue::Number(n) => Some(*n as u64),
                _ => None,
            })
            .map(Duration::from_millis)
    }

    /// 将SerializedValue转换为JSON值
    fn convert_serialized_value_to_json(&self, value: SerializedValue) -> Result<Value, String> {
        match value {
            SerializedValue::Null => Ok(Value::Null),
            SerializedValue::Bool(b) => Ok(Value::Bool(b)),
            SerializedValue::Number(n) => {
                // 尝试保留整数形式
                if n.fract() == 0.0 && n >= i64::MIN as f64 && n <= i64::MAX as f64 {
                    Ok(Value::Number(serde_json::Number::from(n as i64)))
                } else {
                    Ok(Value::Number(serde_json::Number::from_f64(n).unwrap()))
                }
            }
            SerializedValue::String(s) => Ok(Value::String(s)),
            SerializedValue::Array(arr) => {
                let converted: Result<Vec<_>, _> = arr
                    .into_iter()
                    .map(|v| self.convert_serialized_value_to_json(v))
                    .collect();
                Ok(Value::Array(converted?))
            }
            SerializedValue::Object(obj) => {
                let converted: Result<serde_json::Map<_, _>, _> = obj
                    .into_iter()
                    .map(|(k, v)| {
                        self.convert_serialized_value_to_json(v)
                            .map(|jv| (k.clone(), jv))
                    })
                    .collect();
                Ok(Value::Object(converted?))
            }
        }
    }
}

#[async_trait]
impl ToolExecutor for RestToolExecutor {
    /// 执行工具
    async fn execute(
        &self,
        tool: &Tool,
        parameters: HashMap<String, SerializedValue>,
    ) -> Result<ToolExecutionResult, ToolExecutionError> {
        let start_time = std::time::Instant::now();
        
        // 检查工具类型
        if tool.tool_type != ToolType::Rest {
            return Err(ToolExecutionError::environment_error(
                format!("工具类型不匹配，期望 Rest，实际 {:?}", tool.tool_type)
            ));
        }
        
        info!("执行REST工具: {}", tool.name);
        
        // 提取请求参数
        let method = self.extract_method(&parameters)?;
        let url = self.extract_url(&parameters)?;
        let headers = self.extract_headers(&parameters);
        let body = self.extract_body(&parameters);
        let timeout = self.extract_timeout(&parameters);
        
        // 执行HTTP请求
        let result = match self.execute_http_request(method, &url, headers, body, timeout).await {
            Ok(output) => {
                let execution_time = start_time.elapsed();
                info!("REST工具执行成功: {}, 耗时: {:?}", tool.name, execution_time);
                ToolExecutionResult::success(output, execution_time)
            }
            Err(e) => {
                let execution_time = start_time.elapsed();
                error!("REST工具执行失败: {}, 错误: {}, 耗时: {:?}", tool.name, e, execution_time);
                ToolExecutionResult::failure(
                    crate::domain::tools::value_objects::ToolError::new(
                        "REST_EXECUTION_ERROR".to_string(),
                        e.to_string(),
                    ),
                    execution_time,
                )
            }
        };
        
        Ok(result)
    }

    /// 验证工具是否可执行
    async fn can_execute(&self, tool: &Tool) -> Result<bool, ToolExecutionError> {
        // 检查工具类型
        if tool.tool_type != ToolType::Rest {
            return Ok(false);
        }
        
        // REST工具总是可执行的（只要网络可用）
        Ok(true)
    }

    /// 获取工具执行状态
    async fn get_execution_status(&self, execution_id: &str) -> Result<Option<String>, ToolExecutionError> {
        // REST工具通常是同步执行的，不支持状态查询
        warn!("REST工具不支持执行状态查询: {}", execution_id);
        Ok(None)
    }
}

impl Default for RestToolExecutor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockito::Server;
    use crate::domain::tools::ToolConfig;

    #[tokio::test]
    async fn test_rest_executor_success() {
        let mut server = Server::new();
        
        // 模拟API端点
        let mock = server.mock("GET", "/api/test")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{"message": "success", "data": [1, 2, 3]}"#)
            .create();
        
        let executor = RestToolExecutor::new();
        
        // 创建工具实体
        let tool = Tool {
            id: crate::domain::common::id::ToolId::new(),
            name: "test_api".to_string(),
            tool_type: ToolType::Rest,
            config: ToolConfig::new(),
            metadata: crate::domain::tools::ToolMetadata::new(
                "测试API".to_string(),
                "1.0.0".parse().unwrap(),
            ),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        // 准备参数
        let mut parameters = HashMap::new();
        parameters.insert("url".to_string(), SerializedValue::String(format!("{}/api/test", server.url())));
        parameters.insert("method".to_string(), SerializedValue::String("GET".to_string()));
        
        // 执行工具
        let result = executor.execute(&tool, parameters).await.unwrap();
        
        // 验证结果
        assert!(result.success);
        
        mock.assert();
    }

    #[tokio::test]
    async fn test_rest_executor_with_headers_and_body() {
        let mut server = Server::new();
        
        // 模拟API端点
        let mock = server.mock("POST", "/api/data")
            .match_header("authorization", "Bearer token123")
            .match_body(r#"{"name": "test"}"#)
            .with_status(201)
            .with_header("content-type", "application/json")
            .with_body(r#"{"id": 1, "name": "test"}"#)
            .create();
        
        let executor = RestToolExecutor::new();
        
        // 创建工具实体
        let tool = Tool {
            id: crate::domain::common::id::ToolId::new(),
            name: "create_data".to_string(),
            tool_type: ToolType::Rest,
            config: ToolConfig::new(),
            metadata: crate::domain::tools::ToolMetadata::new(
                "创建数据API".to_string(),
                "1.0.0".parse().unwrap(),
            ),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        // 准备参数
        let mut parameters = HashMap::new();
        parameters.insert("url".to_string(), SerializedValue::String(format!("{}/api/data", server.url())));
        parameters.insert("method".to_string(), SerializedValue::String("POST".to_string()));
        
        let mut headers = HashMap::new();
        headers.insert("authorization".to_string(), "Bearer token123".to_string());
        parameters.insert("headers".to_string(), SerializedValue::Object(
            headers.into_iter().map(|(k, v)| (k, SerializedValue::String(v))).collect()
        ));
        
        let mut body_obj = HashMap::new();
        body_obj.insert("name".to_string(), SerializedValue::String("test".to_string()));
        parameters.insert("body".to_string(), SerializedValue::Object(body_obj));
        
        // 执行工具
        let result = executor.execute(&tool, parameters).await.unwrap();
        
        // 验证结果
        assert!(result.success);
        
        mock.assert();
    }

    #[tokio::test]
    async fn test_rest_executor_error() {
        let mut server = Server::new();
        
        // 模拟错误API端点
        let mock = server.mock("GET", "/api/error")
            .with_status(500)
            .with_body("Internal Server Error")
            .create();
        
        let executor = RestToolExecutor::new();
        
        // 创建工具实体
        let tool = Tool {
            id: crate::domain::common::id::ToolId::new(),
            name: "error_api".to_string(),
            tool_type: ToolType::Rest,
            config: ToolConfig::new(),
            metadata: crate::domain::tools::ToolMetadata::new(
                "错误API".to_string(),
                "1.0.0".parse().unwrap(),
            ),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        // 准备参数
        let mut parameters = HashMap::new();
        parameters.insert("url".to_string(), SerializedValue::String(format!("{}/api/error", server.url())));
        parameters.insert("method".to_string(), SerializedValue::String("GET".to_string()));
        
        // 执行工具
        let result = executor.execute(&tool, parameters).await.unwrap();
        
        // 验证结果
        assert!(!result.success);
        assert!(result.error.is_some());
        
        mock.assert();
    }

    #[tokio::test]
    async fn test_rest_executor_wrong_type() {
        let executor = RestToolExecutor::new();
        
        // 创建非REST工具
        let tool = Tool {
            id: crate::domain::common::id::ToolId::new(),
            name: "builtin_tool".to_string(),
            tool_type: ToolType::Builtin,
            config: ToolConfig::new(),
            metadata: crate::domain::tools::ToolMetadata::new(
                "内置工具".to_string(),
                "1.0.0".parse().unwrap(),
            ),
            created_at: crate::domain::common::timestamp::Timestamp::now(),
            updated_at: crate::domain::common::timestamp::Timestamp::now(),
        };
        
        // 测试工具是否可执行
        assert!(!executor.can_execute(&tool).await.unwrap());
        
        // 测试执行工具（应该失败）
        let parameters = HashMap::new();
        let result = executor.execute(&tool, parameters).await;
        assert!(result.is_err());
    }
}