//! Hook system entities and traits

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct HookId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum HookPoint {
    BeforeExecute,
    AfterExecute,
    OnError,
    BeforeCompile,
    AfterCompile,
    BeforeNodeExecute,
    AfterNodeExecute,
    OnNodeError,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookContext {
    pub workflow_id: String,
    pub node_id: Option<String>,
    pub execution_id: Option<String>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookExecutionResult {
    pub success: bool,
    pub error_message: Option<String>,
    pub data: HashMap<String, serde_json::Value>,
    pub execution_time_ms: u64,
}

/// 钩子接口
pub trait Hook: Send + Sync {
    /// 获取钩子ID
    fn hook_id(&self) -> &HookId;
    
    /// 获取钩子名称
    fn name(&self) -> &str;
    
    /// 获取钩子描述
    fn description(&self) -> &str;
    
    /// 获取钩子版本
    fn version(&self) -> &str;
    
    /// 获取支持的钩子执行点
    fn get_supported_hook_points(&self) -> Vec<HookPoint>;
    
    /// 初始化钩子
    fn initialize(&mut self, config: HashMap<String, serde_json::Value>) -> bool;
    
    /// 清理钩子资源
    fn cleanup(&mut self) -> bool;
    
    /// 检查钩子是否已初始化
    fn is_initialized(&self) -> bool;
    
    /// 获取钩子配置
    fn get_config(&self) -> HashMap<String, serde_json::Value>;
    
    /// 执行钩子
    fn execute(&self, hook_point: HookPoint, context: &HookContext) -> HookExecutionResult;
}

/// 基础钩子实现
#[derive(Debug, Clone)]
pub struct BaseHook {
    hook_id: HookId,
    name: String,
    description: String,
    version: String,
    config: HashMap<String, serde_json::Value>,
    initialized: bool,
}

impl BaseHook {
    pub fn new(hook_id: String, name: String, description: String, version: String) -> Self {
        Self {
            hook_id: HookId(hook_id),
            name,
            description,
            version,
            config: HashMap::new(),
            initialized: false,
        }
    }
}

impl Hook for BaseHook {
    fn hook_id(&self) -> &HookId {
        &self.hook_id
    }
    
    fn name(&self) -> &str {
        &self.name
    }
    
    fn description(&self) -> &str {
        &self.description
    }
    
    fn version(&self) -> &str {
        &self.version
    }
    
    fn get_supported_hook_points(&self) -> Vec<HookPoint> {
        vec![
            HookPoint::BeforeExecute,
            HookPoint::AfterExecute,
            HookPoint::OnError,
            HookPoint::BeforeCompile,
            HookPoint::AfterCompile,
        ]
    }
    
    fn initialize(&mut self, config: HashMap<String, serde_json::Value>) -> bool {
        self.config = config;
        self.initialized = true;
        true
    }
    
    fn cleanup(&mut self) -> bool {
        self.config.clear();
        self.initialized = false;
        true
    }
    
    fn is_initialized(&self) -> bool {
        self.initialized
    }
    
    fn get_config(&self) -> HashMap<String, serde_json::Value> {
        self.config.clone()
    }
    
    fn execute(&self, _hook_point: HookPoint, _context: &HookContext) -> HookExecutionResult {
        HookExecutionResult {
            success: true,
            error_message: None,
            data: HashMap::new(),
            execution_time_ms: 0,
        }
    }
}

/// 日志钩子
#[derive(Debug, Clone)]
pub struct LoggingHook {
    base: BaseHook,
}

impl LoggingHook {
    pub fn new() -> Self {
        Self {
            base: BaseHook::new(
                "logging".to_string(),
                "日志钩子".to_string(),
                "记录工作流执行日志".to_string(),
                "1.0.0".to_string(),
            ),
        }
    }
}

impl Hook for LoggingHook {
    fn hook_id(&self) -> &HookId {
        self.base.hook_id()
    }
    
    fn name(&self) -> &str {
        self.base.name()
    }
    
    fn description(&self) -> &str {
        self.base.description()
    }
    
    fn version(&self) -> &str {
        self.base.version()
    }
    
    fn get_supported_hook_points(&self) -> Vec<HookPoint> {
        vec![
            HookPoint::BeforeExecute,
            HookPoint::AfterExecute,
            HookPoint::OnError,
            HookPoint::BeforeNodeExecute,
            HookPoint::AfterNodeExecute,
            HookPoint::OnNodeError,
        ]
    }
    
    fn initialize(&mut self, config: HashMap<String, serde_json::Value>) -> bool {
        self.base.initialize(config)
    }
    
    fn cleanup(&mut self) -> bool {
        self.base.cleanup()
    }
    
    fn is_initialized(&self) -> bool {
        self.base.is_initialized()
    }
    
    fn get_config(&self) -> HashMap<String, serde_json::Value> {
        self.base.get_config()
    }
    
    fn execute(&self, hook_point: HookPoint, context: &HookContext) -> HookExecutionResult {
        let start_time = std::time::Instant::now();
        
        let config = self.base.get_config();
        let log_level = config.get("log_level")
            .and_then(|v| v.as_str())
            .unwrap_or("INFO");
        
        let message = match hook_point {
            HookPoint::BeforeExecute => format!("开始执行工作流: {}", context.workflow_id),
            HookPoint::AfterExecute => format!("完成执行工作流: {}", context.workflow_id),
            HookPoint::OnError => format!("工作流执行出错: {}", context.workflow_id),
            HookPoint::BeforeCompile => format!("开始编译工作流: {}", context.workflow_id),
            HookPoint::AfterCompile => format!("完成编译工作流: {}", context.workflow_id),
            HookPoint::BeforeNodeExecute => {
                if let Some(node_id) = &context.node_id {
                    format!("开始执行节点: {}", node_id)
                } else {
                    "开始执行节点".to_string()
                }
            }
            HookPoint::AfterNodeExecute => {
                if let Some(node_id) = &context.node_id {
                    format!("完成执行节点: {}", node_id)
                } else {
                    "完成执行节点".to_string()
                }
            }
            HookPoint::OnNodeError => {
                if let Some(node_id) = &context.node_id {
                    format!("节点执行出错: {}", node_id)
                } else {
                    "节点执行出错".to_string()
                }
            }
        };
        
        // 在实际实现中，这里会调用日志系统
        println!("[{}] {}", log_level, message);
        
        let execution_time = start_time.elapsed().as_millis() as u64;
        
        HookExecutionResult {
            success: true,
            error_message: None,
            data: HashMap::from([
                ("message".to_string(), serde_json::Value::String(message)),
                ("log_level".to_string(), serde_json::Value::String(log_level.to_string())),
            ]),
            execution_time_ms: execution_time,
        }
    }
}

/// 错误恢复钩子
#[derive(Debug, Clone)]
pub struct ErrorRecoveryHook {
    base: BaseHook,
}

impl ErrorRecoveryHook {
    pub fn new() -> Self {
        Self {
            base: BaseHook::new(
                "error_recovery".to_string(),
                "错误恢复钩子".to_string(),
                "处理工作流执行错误并尝试恢复".to_string(),
                "1.0.0".to_string(),
            ),
        }
    }
}

impl Hook for ErrorRecoveryHook {
    fn hook_id(&self) -> &HookId {
        self.base.hook_id()
    }
    
    fn name(&self) -> &str {
        self.base.name()
    }
    
    fn description(&self) -> &str {
        self.base.description()
    }
    
    fn version(&self) -> &str {
        self.base.version()
    }
    
    fn get_supported_hook_points(&self) -> Vec<HookPoint> {
        vec![
            HookPoint::OnError,
            HookPoint::OnNodeError,
        ]
    }
    
    fn initialize(&mut self, config: HashMap<String, serde_json::Value>) -> bool {
        self.base.initialize(config)
    }
    
    fn cleanup(&mut self) -> bool {
        self.base.cleanup()
    }
    
    fn is_initialized(&self) -> bool {
        self.base.is_initialized()
    }
    
    fn get_config(&self) -> HashMap<String, serde_json::Value> {
        self.base.get_config()
    }
    
    fn execute(&self, hook_point: HookPoint, context: &HookContext) -> HookExecutionResult {
        let start_time = std::time::Instant::now();
        
        let max_retries = self.base.get_config()
            .get("max_retries")
            .and_then(|v| v.as_u64())
            .unwrap_or(3);
        
        let retry_count = context.metadata
            .get("retry_count")
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);
        
        let should_retry = retry_count < max_retries;
        
        let message = match hook_point {
            HookPoint::OnError => {
                if should_retry {
                    format!("工作流错误，尝试恢复 (重试次数: {}/{})", retry_count, max_retries)
                } else {
                    format!("工作流错误，已达到最大重试次数 ({})", max_retries)
                }
            }
            HookPoint::OnNodeError => {
                if let Some(node_id) = &context.node_id {
                    if should_retry {
                        format!("节点错误，尝试恢复 (重试次数: {}/{}) - 节点: {}", retry_count, max_retries, node_id)
                    } else {
                        format!("节点错误，已达到最大重试次数 ({}) - 节点: {}", max_retries, node_id)
                    }
                } else {
                    if should_retry {
                        format!("节点错误，尝试恢复 (重试次数: {}/{})", retry_count, max_retries)
                    } else {
                        format!("节点错误，已达到最大重试次数 ({})", max_retries)
                    }
                }
            }
            _ => "未知钩子点".to_string(),
        };
        
        // 在实际实现中，这里会执行错误恢复逻辑
        println!("[ERROR_RECOVERY] {}", message);
        
        let execution_time = start_time.elapsed().as_millis() as u64;
        
        HookExecutionResult {
            success: true,
            error_message: None,
            data: HashMap::from([
                ("message".to_string(), serde_json::Value::String(message)),
                ("should_retry".to_string(), serde_json::Value::Bool(should_retry)),
                ("retry_count".to_string(), serde_json::Value::Number(serde_json::Number::from(retry_count))),
                ("max_retries".to_string(), serde_json::Value::Number(serde_json::Number::from(max_retries))),
            ]),
            execution_time_ms: execution_time,
        }
    }
}

/// 性能监控钩子
#[derive(Debug, Clone)]
pub struct PerformanceMonitoringHook {
    base: BaseHook,
}

impl PerformanceMonitoringHook {
    pub fn new() -> Self {
        Self {
            base: BaseHook::new(
                "performance_monitoring".to_string(),
                "性能监控钩子".to_string(),
                "监控工作流执行性能".to_string(),
                "1.0.0".to_string(),
            ),
        }
    }
}

impl Hook for PerformanceMonitoringHook {
    fn hook_id(&self) -> &HookId {
        self.base.hook_id()
    }
    
    fn name(&self) -> &str {
        self.base.name()
    }
    
    fn description(&self) -> &str {
        self.base.description()
    }
    
    fn version(&self) -> &str {
        self.base.version()
    }
    
    fn get_supported_hook_points(&self) -> Vec<HookPoint> {
        vec![
            HookPoint::BeforeExecute,
            HookPoint::AfterExecute,
            HookPoint::BeforeNodeExecute,
            HookPoint::AfterNodeExecute,
        ]
    }
    
    fn initialize(&mut self, config: HashMap<String, serde_json::Value>) -> bool {
        self.base.initialize(config)
    }
    
    fn cleanup(&mut self) -> bool {
        self.base.cleanup()
    }
    
    fn is_initialized(&self) -> bool {
        self.base.is_initialized()
    }
    
    fn get_config(&self) -> HashMap<String, serde_json::Value> {
        self.base.get_config()
    }
    
    fn execute(&self, hook_point: HookPoint, context: &HookContext) -> HookExecutionResult {
        let start_time = std::time::Instant::now();
        
        let threshold_ms = self.base.get_config()
            .get("performance_threshold_ms")
            .and_then(|v| v.as_u64())
            .unwrap_or(1000);
        
        let message = match hook_point {
            HookPoint::BeforeExecute => format!("开始监控工作流性能: {}", context.workflow_id),
            HookPoint::AfterExecute => format!("完成监控工作流性能: {}", context.workflow_id),
            HookPoint::BeforeNodeExecute => {
                if let Some(node_id) = &context.node_id {
                    format!("开始监控节点性能: {}", node_id)
                } else {
                    "开始监控节点性能".to_string()
                }
            }
            HookPoint::AfterNodeExecute => {
                if let Some(node_id) = &context.node_id {
                    format!("完成监控节点性能: {}", node_id)
                } else {
                    "完成监控节点性能".to_string()
                }
            }
            _ => "未知钩子点".to_string(),
        };
        
        // 在实际实现中，这里会记录性能指标
        println!("[PERFORMANCE] {} (阈值: {}ms)", message, threshold_ms);
        
        let execution_time = start_time.elapsed().as_millis() as u64;
        
        HookExecutionResult {
            success: true,
            error_message: None,
            data: HashMap::from([
                ("message".to_string(), serde_json::Value::String(message)),
                ("threshold_ms".to_string(), serde_json::Value::Number(serde_json::Number::from(threshold_ms))),
            ]),
            execution_time_ms: execution_time,
        }
    }
}

/// 内置钩子集合
pub struct BuiltinHooks;

impl BuiltinHooks {
    /// 获取所有内置钩子
    pub fn get_all_hooks() -> Vec<Box<dyn Hook>> {
        vec![
            Box::new(LoggingHook::new()),
            Box::new(ErrorRecoveryHook::new()),
            Box::new(PerformanceMonitoringHook::new()),
        ]
    }
    
    /// 根据名称获取钩子
    pub fn get_hook_by_name(name: &str) -> Option<Box<dyn Hook>> {
        match name {
            "logging" => Some(Box::new(LoggingHook::new())),
            "error_recovery" => Some(Box::new(ErrorRecoveryHook::new())),
            "performance_monitoring" => Some(Box::new(PerformanceMonitoringHook::new())),
            _ => None,
        }
    }
}