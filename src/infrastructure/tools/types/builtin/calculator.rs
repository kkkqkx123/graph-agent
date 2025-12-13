use std::collections::HashMap;
use async_trait::async_trait;
use serde_json::json;

use crate::domain::tools::{
    ToolExecutionResult, ToolExecutionError, SerializedValue
};
use crate::infrastructure::tools::types::builtin::BuiltinTool;

/// 计算器工具
pub struct CalculatorTool;

#[async_trait]
impl BuiltinTool for CalculatorTool {
    fn name(&self) -> &str {
        "calculator"
    }
    
    fn description(&self) -> &str {
        "执行基本数学计算的工具"
    }
    
    fn version(&self) -> &str {
        "1.0.0"
    }
    
    async fn execute(&self, parameters: HashMap<String, SerializedValue>) -> Result<SerializedValue, ToolExecutionError> {
        // 验证参数
        self.validate_parameters(&parameters).await?;
        
        // 获取操作数和操作符
        let a = parameters.get("a")
            .and_then(|v| match v {
                SerializedValue::Number(n) => Some(*n),
                _ => None,
            })
            .ok_or_else(|| ToolExecutionError::environment_error("缺少参数: a".to_string()))?;
        
        let b = parameters.get("b")
            .and_then(|v| match v {
                SerializedValue::Number(n) => Some(*n),
                _ => None,
            })
            .ok_or_else(|| ToolExecutionError::environment_error("缺少参数: b".to_string()))?;
        
        let operation = parameters.get("operation")
            .and_then(|v| match v {
                SerializedValue::String(s) => Some(s.clone()),
                _ => None,
            })
            .unwrap_or_else(|| "add".to_string());
        
        // 执行计算
        let result = match operation.as_str() {
            "add" => a + b,
            "subtract" => a - b,
            "multiply" => a * b,
            "divide" => {
                if b == 0.0 {
                    return Err(ToolExecutionError::environment_error("除数不能为零".to_string()));
                }
                a / b
            }
            "power" => a.powf(b),
            "mod" => {
                if b == 0.0 {
                    return Err(ToolExecutionError::environment_error("模数不能为零".to_string()));
                }
                a % b
            }
            _ => {
                return Err(ToolExecutionError::environment_error(
                    format!("不支持的操作: {}", operation)
                ));
            }
        };
        
        // 返回结果
        let output = json!({
            "result": result,
            "operation": operation,
            "operands": [a, b]
        });
        
        // 转换为SerializedValue
        self.convert_json_to_serialized_value(output)
            .map_err(|e| ToolExecutionError::serialization_error(format!("转换结果失败: {}", e)))
    }
    
    async fn validate_parameters(&self, parameters: &HashMap<String, SerializedValue>) -> Result<(), ToolExecutionError> {
        // 检查必需参数
        if !parameters.contains_key("a") {
            return Err(ToolExecutionError::environment_error("缺少参数: a".to_string()));
        }
        
        if !parameters.contains_key("b") {
            return Err(ToolExecutionError::environment_error("缺少参数: b".to_string()));
        }
        
        // 检查参数类型
        if let Some(a) = parameters.get("a") {
            if !matches!(a, SerializedValue::Number(_)) {
                return Err(ToolExecutionError::environment_error("参数a必须是数字".to_string()));
            }
        }
        
        if let Some(b) = parameters.get("b") {
            if !matches!(b, SerializedValue::Number(_)) {
                return Err(ToolExecutionError::environment_error("参数b必须是数字".to_string()));
            }
        }
        
        // 检查操作符（如果提供）
        if let Some(op) = parameters.get("operation") {
            if !matches!(op, SerializedValue::String(_)) {
                return Err(ToolExecutionError::environment_error("参数operation必须是字符串".to_string()));
            }
            
            if let SerializedValue::String(op_str) = op {
                if !["add", "subtract", "multiply", "divide", "power", "mod"].contains(&op_str.as_str()) {
                    return Err(ToolExecutionError::environment_error(
                        format!("不支持的操作: {}", op_str)
                    ));
                }
            }
        }
        
        Ok(())
    }
}

impl CalculatorTool {
    /// 创建新的计算器工具
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

impl Default for CalculatorTool {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_calculator_add() {
        let calculator = CalculatorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("a".to_string(), SerializedValue::Number(5.0));
        parameters.insert("b".to_string(), SerializedValue::Number(3.0));
        parameters.insert("operation".to_string(), SerializedValue::String("add".to_string()));
        
        let result = calculator.execute(parameters).await.unwrap();
        
        if let SerializedValue::Object(obj) = result {
            assert_eq!(obj.get("result"), Some(&SerializedValue::Number(8.0)));
            assert_eq!(obj.get("operation"), Some(&SerializedValue::String("add".to_string())));
        } else {
            panic!("Expected object result");
        }
    }

    #[tokio::test]
    async fn test_calculator_subtract() {
        let calculator = CalculatorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("a".to_string(), SerializedValue::Number(5.0));
        parameters.insert("b".to_string(), SerializedValue::Number(3.0));
        parameters.insert("operation".to_string(), SerializedValue::String("subtract".to_string()));
        
        let result = calculator.execute(parameters).await.unwrap();
        
        if let SerializedValue::Object(obj) = result {
            assert_eq!(obj.get("result"), Some(&SerializedValue::Number(2.0)));
        } else {
            panic!("Expected object result");
        }
    }

    #[tokio::test]
    async fn test_calculator_multiply() {
        let calculator = CalculatorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("a".to_string(), SerializedValue::Number(5.0));
        parameters.insert("b".to_string(), SerializedValue::Number(3.0));
        parameters.insert("operation".to_string(), SerializedValue::String("multiply".to_string()));
        
        let result = calculator.execute(parameters).await.unwrap();
        
        if let SerializedValue::Object(obj) = result {
            assert_eq!(obj.get("result"), Some(&SerializedValue::Number(15.0)));
        } else {
            panic!("Expected object result");
        }
    }

    #[tokio::test]
    async fn test_calculator_divide() {
        let calculator = CalculatorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("a".to_string(), SerializedValue::Number(6.0));
        parameters.insert("b".to_string(), SerializedValue::Number(3.0));
        parameters.insert("operation".to_string(), SerializedValue::String("divide".to_string()));
        
        let result = calculator.execute(parameters).await.unwrap();
        
        if let SerializedValue::Object(obj) = result {
            assert_eq!(obj.get("result"), Some(&SerializedValue::Number(2.0)));
        } else {
            panic!("Expected object result");
        }
    }

    #[tokio::test]
    async fn test_calculator_divide_by_zero() {
        let calculator = CalculatorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("a".to_string(), SerializedValue::Number(6.0));
        parameters.insert("b".to_string(), SerializedValue::Number(0.0));
        parameters.insert("operation".to_string(), SerializedValue::String("divide".to_string()));
        
        let result = calculator.execute(parameters).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_calculator_missing_parameter() {
        let calculator = CalculatorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("a".to_string(), SerializedValue::Number(6.0));
        // 缺少参数b
        
        let result = calculator.execute(parameters).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_calculator_invalid_parameter_type() {
        let calculator = CalculatorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("a".to_string(), SerializedValue::String("not a number".to_string()));
        parameters.insert("b".to_string(), SerializedValue::Number(3.0));
        
        let result = calculator.execute(parameters).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_calculator_unsupported_operation() {
        let calculator = CalculatorTool::new();
        
        let mut parameters = HashMap::new();
        parameters.insert("a".to_string(), SerializedValue::Number(5.0));
        parameters.insert("b".to_string(), SerializedValue::Number(3.0));
        parameters.insert("operation".to_string(), SerializedValue::String("unsupported".to_string()));
        
        let result = calculator.execute(parameters).await;
        assert!(result.is_err());
    }
}