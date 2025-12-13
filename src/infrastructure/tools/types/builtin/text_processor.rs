use std::collections::HashMap;
use async_trait::async_trait;
use serde_json::json;

use crate::domain::tools::{
    ToolExecutionResult, ToolExecutionError, SerializedValue
};
use crate::infrastructure::tools::types::builtin::BuiltinTool;

/// 文本处理工具
pub struct TextProcessorTool;

#[async_trait]
impl BuiltinTool for TextProcessorTool {
    fn name(&self) -> &str {
        "text_processor"
    }
    
    fn description(&self) -> &str {
        "执行基本文本处理操作的工具"
    }
    
    fn version(&self) -> &str {
        "1.0.0"
    }
    
    async fn execute(&self, parameters: HashMap<String, SerializedValue>) -> Result<SerializedValue, ToolExecutionError> {
        // 验证参数
        self.validate_parameters(&parameters).await?;
        
        // 获取文本和操作
        let text = parameters.get("text")
            .and_then(|v| match v {
                SerializedValue::String(s) => Some(s.clone()),
                _ => None,
            })
            .ok_or_else(|| ToolExecutionError::environment_error("缺少参数: text".to_string()))?;
        
        let operation = parameters.get("operation")
            .and_then(|v| match v {
                SerializedValue::String(s) => Some(s.clone()),
                _ => None,
            })
            .unwrap_or_else(|| "length".to_string());
        
        // 执行文本处理
        let result = match operation.as_str() {
            "length" => {
                json!({
                    "result": text.len(),
                    "operation": "length",
                    "input": text
                })
            }
            "uppercase" => {
                json!({
                    "result": text.to_uppercase(),
                    "operation": "uppercase",
                    "input": text
                })
            }
            "lowercase" => {
                json!({
                    "result": text.to_lowercase(),
                    "operation": "lowercase",
                    "input": text
                })
            }
            "reverse" => {
                json!({
                    "result": text.chars().rev().collect::<String>(),
                    "operation": "reverse",
                    "input": text
                })
            }
            "words" => {
                let words: Vec<&str> = text.split_whitespace().collect();
                json!({
                    "result": words,
                    "count": words.len(),
                    "operation": "words",
                    "input": text
                })
            }
            "lines" => {
                let lines: Vec<&str> = text.lines().collect();
                json!({
                    "result": lines,
                    "count": lines.len(),
                    "operation": "lines",
                    "input": text
                })
            }
            "trim" => {
                json!({
                    "result": text.trim(),
                    "operation": "trim",
                    "input": text
                })
            }
            "contains" => {
                let substring = parameters.get("substring")
                    .and_then(|v| match v {
                        SerializedValue::String(s) => Some(s.clone()),
                        _ => None,
                    })
                    .ok_or_else(|| ToolExecutionError::environment_error("操作'contains'需要参数: substring".to_string()))?;
                
                json!({
                    "result": text.contains(&substring),
                    "operation": "contains",
                    "input": text,
                    "substring": substring
                })
            }
            "replace" => {
                let old = parameters.get("old")
                    .and_then(|v| match v {
                        SerializedValue::String(s) => Some(s.clone()),
                        _ => None,
                    })
                    .ok_or_else(|| ToolExecutionError::environment_error("操作'replace'需要参数: old".to_string()))?;
                
                let new = parameters.get("new")
                    .and_then(|v| match v {
                        SerializedValue::String(s) => Some(s.clone()),
                        _ => None,
                    })
                    .ok_or_else(|| ToolExecutionError::environment_error("操作'replace'需要参数: new".to_string()))?;
                
                json!({
                    "result": text.replace(&old, &new),
                    "operation": "replace",
                    "input": text,
                    "old": old,
                    "new": new
                })
            }
            "split" => {
                let delimiter = parameters.get("delimiter")
                    .and_then(|v| match v {
                        SerializedValue::String(s) => Some(s.clone()),
                        _ => None,
                    })
                    .unwrap_or_else(|| " ".to_string());
                
                let parts: Vec<&str> = text.split(&delimiter).collect();
                json!({
                    "result": parts,
                    "count": parts.len(),
                    "operation": "split",
                    "input": text,
                    "delimiter": delimiter
                })
            }
            "join" => {
                let parts = parameters.get("parts")
                    .and_then(|v| match v {
                        SerializedValue::Array(arr) => {
                            let strings: Result<Vec<_>, _> = arr.iter()
                                .map(|item| match item {
                                    SerializedValue::String(s) => Ok(s.clone()),
                                    _ => Err(()),
                                })
                                .collect();
                            strings.ok()
                        }
                        _ => None,
                    })
                    .ok_or_else(|| ToolExecutionError::environment_error("操作'join'需要参数: parts (字符串数组)".to_string()))?;
                
                let separator = parameters.get("separator")
                    .and_then(|v| match v {
                        SerializedValue::String(s) => Some(s.clone()),
                        _ => None,
                    })
                    .unwrap_or_else(|| " ".to_string());
                
                json!({
                    "result": parts.join(&separator),
                    "operation": "join",
                    "parts": parts,
                    "separator": separator
                })
            }
            _ => {
                return Err(ToolExecutionError::environment_error(
                    format!("不支持的操作: {}", operation)
                ));
            }
        };
        
        // 转换为SerializedValue
        self.convert_json_to_serialized_value(result)
            .map_err(|e| ToolExecutionError::serialization_error(format!("转换结果失败: {}", e)))
    }
    
    async fn validate_parameters(&self, parameters: &HashMap<String, SerializedValue>) -> Result<(), ToolExecutionError> {
        // 检查必需参数
        if !parameters.contains_key("text") {
            return Err(ToolExecutionError::environment_error("缺少参数: text".to_string()));
        }
        
        // 检查参数类型
        if let Some(text) = parameters.get("text") {
            if !matches!(text, SerializedValue::String(_)) {
                return Err(ToolExecutionError::environment_error("参数text必须是字符串".to_string()));
            }
        }
        
        // 检查操作符（如果提供）
        if let Some(op) = parameters.get("operation") {
            if !matches!(op, SerializedValue::String(_)) {
                return Err(ToolExecutionError::environment_error("参数operation必须是字符串".to_string()));
            }
            
            if let SerializedValue::String(op_str) = op {
                let valid_operations = [
                    "length", "uppercase", "lowercase", "reverse", "words", "lines", "trim",
                    "contains", "replace", "split", "join"
                ];
                
                if !valid_operations.contains(&op_str.as_str()) {
                    return Err(ToolExecutionError::environment_error(
                        format!("不支持的操作: {}", op_str)
                    ));
                }
                
                // 验证特定操作所需的额外参数
                match op_str.as_str() {
                    "contains" => {
                        if !parameters.contains_key("substring") {
                            return Err(ToolExecutionError::environment_error("操作'contains'需要参数: substring".to_string()));
                        }
                        if let Some(substring) = parameters.get("substring") {
                            if !matches!(substring, SerializedValue::String(_)) {
                                return Err(ToolExecutionError::environment_error("参数substring必须是字符串".to_string()));
                            }
                        }
                    }
                    "replace" => {
                        if !parameters.contains_key("old") {
                            return Err(ToolExecutionError::environment_error("操作'replace'需要参数: old".to_string()));
                        }
                        if !parameters.contains_key("new") {
                            return Err(ToolExecutionError::environment_error("操作'replace'需要参数: new".to_string()));
                        }
                        if let Some(old) = parameters.get("old") {
                            if !matches!(old, SerializedValue::String(_)) {
                                return Err(ToolExecutionError::environment_error("参数old必须是字符串".to_string()));
                            }
                        }
                        if let Some(new) = parameters.get("new") {
                            if !matches!(new, SerializedValue::String(_)) {
                                return Err(ToolExecutionError::environment_error("参数new必须是字符串".to_string()));
                            }
                        }
                    }
                    "split" => {
                        if let Some(delimiter) = parameters.get("delimiter") {
                            if !matches!(delimiter, SerializedValue::String(_)) {
                                return Err(ToolExecutionError::environment_error("参数delimiter必须是字符串".to_string()));
                            }
                        }
                    }
                    "join" => {
                        if !parameters.contains_key("parts") {
                            return Err(ToolExecutionError::environment_error("操作'join'需要参数: parts".to_string()));
                        }
                        if let Some(parts) = parameters.get("parts") {
                            if !matches!(parts, SerializedValue::Array(_)) {
                                return Err(ToolExecutionError::environment_error("参数parts必须是数组".to_string()));
                            }
                        }
                        if let Some(separator) = parameters.get("separator") {
                            if !matches!(separator, SerializedValue::String(_)) {
                                return Err(ToolExecutionError::environment_error("参数separator必须是字符串".to_string()));
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
        
        Ok(())
    }
}

impl TextProcessorTool {
    /// 创建新的文本处理工具
    pub fn new() -> Self {
        Self
    }
    
    /// 将JSON值转换为SerializedValue
    fn convert_json_to_serialized_value(&self, value: serde_json::Value) -> Result<SerializedValue, String> {
        match value {
            serde_json::Value::Null => Ok(SerializedValue::Null),
            serde_json::Value::Bool(b) => Ok(SerializedValue::Bool(b)),
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    Ok(SerializedValue::Number(i as f64))
                } else if let Some(f) = n.as_f64() {
                    Ok(SerializedValue::Number(f))
                } else {
                    Err("无法转换数字".to_string())
                }
            }
            serde_json::Value::String(s) => Ok(SerializedValue::String(s)),
            serde_json::Value::Array(arr) => {
                let converted: Result<Vec<_>, _> = arr
                    .into_iter()
                    .map(|v| self.convert_json_to_serialized_value(v))
                    .collect();
                Ok(SerializedValue::Array(converted?))
            }
            serde_json::Value::Object(obj) => {
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
}

impl Default for TextProcessorTool {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_text_processor_length() {
        let processor = TextProcessorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("text".to_string(), SerializedValue::String("Hello, World!".to_string()));
        parameters.insert("operation".to_string(), SerializedValue::String("length".to_string()));
        
        let result = processor.execute(parameters).await.unwrap();
        
        if let SerializedValue::Object(obj) = result {
            assert_eq!(obj.get("result"), Some(&SerializedValue::Number(13.0)));
            assert_eq!(obj.get("operation"), Some(&SerializedValue::String("length".to_string())));
        } else {
            panic!("Expected object result");
        }
    }

    #[tokio::test]
    async fn test_text_processor_uppercase() {
        let processor = TextProcessorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("text".to_string(), SerializedValue::String("Hello, World!".to_string()));
        parameters.insert("operation".to_string(), SerializedValue::String("uppercase".to_string()));
        
        let result = processor.execute(parameters).await.unwrap();
        
        if let SerializedValue::Object(obj) = result {
            assert_eq!(obj.get("result"), Some(&SerializedValue::String("HELLO, WORLD!".to_string())));
        } else {
            panic!("Expected object result");
        }
    }

    #[tokio::test]
    async fn test_text_processor_contains() {
        let processor = TextProcessorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("text".to_string(), SerializedValue::String("Hello, World!".to_string()));
        parameters.insert("operation".to_string(), SerializedValue::String("contains".to_string()));
        parameters.insert("substring".to_string(), SerializedValue::String("World".to_string()));
        
        let result = processor.execute(parameters).await.unwrap();
        
        if let SerializedValue::Object(obj) = result {
            assert_eq!(obj.get("result"), Some(&SerializedValue::Bool(true)));
        } else {
            panic!("Expected object result");
        }
    }

    #[tokio::test]
    async fn test_text_processor_replace() {
        let processor = TextProcessorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("text".to_string(), SerializedValue::String("Hello, World!".to_string()));
        parameters.insert("operation".to_string(), SerializedValue::String("replace".to_string()));
        parameters.insert("old".to_string(), SerializedValue::String("World".to_string()));
        parameters.insert("new".to_string(), SerializedValue::String("Rust".to_string()));
        
        let result = processor.execute(parameters).await.unwrap();
        
        if let SerializedValue::Object(obj) = result {
            assert_eq!(obj.get("result"), Some(&SerializedValue::String("Hello, Rust!".to_string())));
        } else {
            panic!("Expected object result");
        }
    }

    #[tokio::test]
    async fn test_text_processor_join() {
        let processor = TextProcessorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("operation".to_string(), SerializedValue::String("join".to_string()));
        parameters.insert("parts".to_string(), SerializedValue::Array(vec![
            SerializedValue::String("Hello".to_string()),
            SerializedValue::String("World".to_string()),
            SerializedValue::String("Rust".to_string()),
        ]));
        parameters.insert("separator".to_string(), SerializedValue::String(", ".to_string()));
        
        let result = processor.execute(parameters).await.unwrap();
        
        if let SerializedValue::Object(obj) = result {
            assert_eq!(obj.get("result"), Some(&SerializedValue::String("Hello, World, Rust".to_string())));
        } else {
            panic!("Expected object result");
        }
    }

    #[tokio::test]
    async fn test_text_processor_missing_parameter() {
        let processor = TextProcessorTool::new();
        
        let parameters = HashMap::new(); // 缺少text参数
        
        let result = processor.execute(parameters).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_text_processor_invalid_parameter_type() {
        let processor = TextProcessorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("text".to_string(), SerializedValue::Number(123.0)); // 应该是字符串
        
        let result = processor.execute(parameters).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_text_processor_unsupported_operation() {
        let processor = TextProcessorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("text".to_string(), SerializedValue::String("Hello".to_string()));
        parameters.insert("operation".to_string(), SerializedValue::String("unsupported".to_string()));
        
        let result = processor.execute(parameters).await;
        assert!(result.is_err());
    }
}