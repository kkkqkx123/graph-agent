//! Plugin system entities and traits

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PluginId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum PluginType {
    Start,
    End,
    Node,
    Edge,
    Workflow,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum PluginStatus {
    Inactive,
    Active,
    Error,
    Disabled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginContext {
    pub workflow_id: String,
    pub thread_id: Option<String>,
    pub session_id: Option<String>,
    pub execution_start_time: Option<DateTime<Utc>>,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginExecutionResult {
    pub plugin_id: PluginId,
    pub status: String,
    pub success: bool,
    pub error: Option<String>,
    pub execution_time: f64,
    pub data: HashMap<String, serde_json::Value>,
    pub timestamp: DateTime<Utc>,
}

/// 插件接口
pub trait Plugin: Send + Sync {
    /// 获取插件ID
    fn plugin_id(&self) -> &PluginId;
    
    /// 获取插件类型
    fn plugin_type(&self) -> &PluginType;
    
    /// 获取插件版本
    fn version(&self) -> &str;
    
    /// 获取插件描述
    fn description(&self) -> &str;
    
    /// 获取插件状态
    fn status(&self) -> &PluginStatus;
    
    /// 初始化插件
    fn initialize(&mut self, config: HashMap<String, serde_json::Value>) -> bool;
    
    /// 执行插件
    fn execute(&self, context: &PluginContext, params: HashMap<String, serde_json::Value>) -> PluginExecutionResult;
    
    /// 清理插件资源
    fn cleanup(&mut self);
    
    /// 设置插件状态
    fn set_status(&mut self, status: PluginStatus);
}

/// 基础插件实现
#[derive(Debug, Clone)]
pub struct BasePlugin {
    plugin_id: PluginId,
    plugin_type: PluginType,
    version: String,
    description: String,
    status: PluginStatus,
    config: HashMap<String, serde_json::Value>,
}

impl BasePlugin {
    pub fn new(
        plugin_id: String,
        plugin_type: PluginType,
        version: String,
        description: String,
    ) -> Self {
        Self {
            plugin_id: PluginId(plugin_id),
            plugin_type,
            version,
            description,
            status: PluginStatus::Inactive,
            config: HashMap::new(),
        }
    }
}

impl Plugin for BasePlugin {
    fn plugin_id(&self) -> &PluginId {
        &self.plugin_id
    }
    
    fn plugin_type(&self) -> &PluginType {
        &self.plugin_type
    }
    
    fn version(&self) -> &str {
        &self.version
    }
    
    fn description(&self) -> &str {
        &self.description
    }
    
    fn status(&self) -> &PluginStatus {
        &self.status
    }
    
    fn initialize(&mut self, config: HashMap<String, serde_json::Value>) -> bool {
        self.config = config;
        self.status = PluginStatus::Active;
        true
    }
    
    fn execute(&self, context: &PluginContext, _params: HashMap<String, serde_json::Value>) -> PluginExecutionResult {
        PluginExecutionResult {
            plugin_id: self.plugin_id.clone(),
            status: "success".to_string(),
            success: true,
            error: None,
            execution_time: 0.0,
            data: HashMap::from([
                ("workflow_id".to_string(), serde_json::Value::String(context.workflow_id.clone())),
            ]),
            timestamp: Utc::now(),
        }
    }
    
    fn cleanup(&mut self) {
        self.status = PluginStatus::Inactive;
    }
    
    fn set_status(&mut self, status: PluginStatus) {
        self.status = status;
    }
}

/// 开始阶段插件：上下文摘要
#[derive(Debug, Clone)]
pub struct ContextSummaryPlugin {
    base: BasePlugin,
}

impl ContextSummaryPlugin {
    pub fn new() -> Self {
        Self {
            base: BasePlugin::new(
                "context_summary".to_string(),
                PluginType::Start,
                "1.0.0".to_string(),
                "收集和记录工作流开始时的上下文信息".to_string(),
            ),
        }
    }
}

impl Plugin for ContextSummaryPlugin {
    fn plugin_id(&self) -> &PluginId {
        self.base.plugin_id()
    }
    
    fn plugin_type(&self) -> &PluginType {
        self.base.plugin_type()
    }
    
    fn version(&self) -> &str {
        self.base.version()
    }
    
    fn description(&self) -> &str {
        self.base.description()
    }
    
    fn status(&self) -> &PluginStatus {
        self.base.status()
    }
    
    fn initialize(&mut self, config: HashMap<String, serde_json::Value>) -> bool {
        self.base.initialize(config)
    }
    
    fn execute(&self, context: &PluginContext, _params: HashMap<String, serde_json::Value>) -> PluginExecutionResult {
        let start_time = std::time::Instant::now();
        
        // 收集上下文信息
        let mut summary_data = HashMap::new();
        summary_data.insert("workflow_id".to_string(), serde_json::Value::String(context.workflow_id.clone()));
        
        if let Some(thread_id) = &context.thread_id {
            summary_data.insert("thread_id".to_string(), serde_json::Value::String(thread_id.clone()));
        }
        
        if let Some(session_id) = &context.session_id {
            summary_data.insert("session_id".to_string(), serde_json::Value::String(session_id.clone()));
        }
        
        if let Some(execution_start_time) = &context.execution_start_time {
            summary_data.insert("execution_start_time".to_string(), serde_json::Value::String(execution_start_time.to_rfc3339()));
        }
        
        // 添加元数据
        for (key, value) in &context.metadata {
            summary_data.insert(format!("metadata_{}", key), value.clone());
        }
        
        let execution_time = start_time.elapsed().as_secs_f64();
        
        PluginExecutionResult {
            plugin_id: self.plugin_id().clone(),
            status: "success".to_string(),
            success: true,
            error: None,
            execution_time,
            data: summary_data,
            timestamp: Utc::now(),
        }
    }
    
    fn cleanup(&mut self) {
        self.base.cleanup();
    }
    
    fn set_status(&mut self, status: PluginStatus) {
        self.base.set_status(status);
    }
}

/// 开始阶段插件：环境检查
#[derive(Debug, Clone)]
pub struct EnvironmentCheckPlugin {
    base: BasePlugin,
}

impl EnvironmentCheckPlugin {
    pub fn new() -> Self {
        Self {
            base: BasePlugin::new(
                "environment_check".to_string(),
                PluginType::Start,
                "1.0.0".to_string(),
                "检查工作流执行环境是否满足要求".to_string(),
            ),
        }
    }
}

impl Plugin for EnvironmentCheckPlugin {
    fn plugin_id(&self) -> &PluginId {
        self.base.plugin_id()
    }
    
    fn plugin_type(&self) -> &PluginType {
        self.base.plugin_type()
    }
    
    fn version(&self) -> &str {
        self.base.version()
    }
    
    fn description(&self) -> &str {
        self.base.description()
    }
    
    fn status(&self) -> &PluginStatus {
        self.base.status()
    }
    
    fn initialize(&mut self, config: HashMap<String, serde_json::Value>) -> bool {
        self.base.initialize(config)
    }
    
    fn execute(&self, context: &PluginContext, _params: HashMap<String, serde_json::Value>) -> PluginExecutionResult {
        let start_time = std::time::Instant::now();
        
        // 模拟环境检查
        let mut check_results = HashMap::new();
        
        // 检查内存使用情况
        let memory_usage = self.get_memory_usage();
        check_results.insert("memory_usage_mb".to_string(), serde_json::Value::Number(serde_json::Number::from(memory_usage)));
        
        // 检查CPU使用情况
        let cpu_usage = self.get_cpu_usage();
        check_results.insert("cpu_usage_percent".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(cpu_usage).unwrap()));
        
        // 检查磁盘空间
        let disk_space = self.get_disk_space();
        check_results.insert("disk_space_gb".to_string(), serde_json::Value::Number(serde_json::Number::from(disk_space)));
        
        // 检查网络连接
        let network_status = self.check_network_connectivity();
        check_results.insert("network_status".to_string(), serde_json::Value::String(network_status));
        
        let execution_time = start_time.elapsed().as_secs_f64();
        
        PluginExecutionResult {
            plugin_id: self.plugin_id().clone(),
            status: "success".to_string(),
            success: true,
            error: None,
            execution_time,
            data: check_results,
            timestamp: Utc::now(),
        }
    }
    
    fn cleanup(&mut self) {
        self.base.cleanup();
    }
    
    fn set_status(&mut self, status: PluginStatus) {
        self.base.set_status(status);
    }
}

impl EnvironmentCheckPlugin {
    fn get_memory_usage(&self) -> u64 {
        // 模拟获取内存使用情况（MB）
        512
    }
    
    fn get_cpu_usage(&self) -> f64 {
        // 模拟获取CPU使用情况（百分比）
        25.5
    }
    
    fn get_disk_space(&self) -> u64 {
        // 模拟获取磁盘空间（GB）
        1024
    }
    
    fn check_network_connectivity(&self) -> String {
        // 模拟检查网络连接
        "connected".to_string()
    }
}

/// 结束阶段插件：执行统计
#[derive(Debug, Clone)]
pub struct ExecutionStatsPlugin {
    base: BasePlugin,
}

impl ExecutionStatsPlugin {
    pub fn new() -> Self {
        Self {
            base: BasePlugin::new(
                "execution_stats".to_string(),
                PluginType::End,
                "1.0.0".to_string(),
                "收集和记录工作流执行统计信息".to_string(),
            ),
        }
    }
}

impl Plugin for ExecutionStatsPlugin {
    fn plugin_id(&self) -> &PluginId {
        self.base.plugin_id()
    }
    
    fn plugin_type(&self) -> &PluginType {
        self.base.plugin_type()
    }
    
    fn version(&self) -> &str {
        self.base.version()
    }
    
    fn description(&self) -> &str {
        self.base.description()
    }
    
    fn status(&self) -> &PluginStatus {
        self.base.status()
    }
    
    fn initialize(&mut self, config: HashMap<String, serde_json::Value>) -> bool {
        self.base.initialize(config)
    }
    
    fn execute(&self, context: &PluginContext, _params: HashMap<String, serde_json::Value>) -> PluginExecutionResult {
        let start_time = std::time::Instant::now();
        
        // 计算执行时间
        let execution_duration = if let Some(start_time) = &context.execution_start_time {
            Utc::now().signed_duration_since(*start_time)
        } else {
            chrono::Duration::zero()
        };
        
        let mut stats_data = HashMap::new();
        stats_data.insert("workflow_id".to_string(), serde_json::Value::String(context.workflow_id.clone()));
        stats_data.insert("execution_duration_seconds".to_string(), serde_json::Value::Number(serde_json::Number::from(execution_duration.num_seconds())));
        
        // 模拟其他统计信息
        stats_data.insert("nodes_executed".to_string(), serde_json::Value::Number(serde_json::Number::from(15)));
        stats_data.insert("total_tokens_used".to_string(), serde_json::Value::Number(serde_json::Number::from(2500)));
        stats_data.insert("total_cost".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(0.05).unwrap()));
        
        let execution_time = start_time.elapsed().as_secs_f64();
        
        PluginExecutionResult {
            plugin_id: self.plugin_id().clone(),
            status: "success".to_string(),
            success: true,
            error: None,
            execution_time,
            data: stats_data,
            timestamp: Utc::now(),
        }
    }
    
    fn cleanup(&mut self) {
        self.base.cleanup();
    }
    
    fn set_status(&mut self, status: PluginStatus) {
        self.base.set_status(status);
    }
}

/// 结束阶段插件：结果摘要
#[derive(Debug, Clone)]
pub struct ResultSummaryPlugin {
    base: BasePlugin,
}

impl ResultSummaryPlugin {
    pub fn new() -> Self {
        Self {
            base: BasePlugin::new(
                "result_summary".to_string(),
                PluginType::End,
                "1.0.0".to_string(),
                "生成工作流执行结果摘要".to_string(),
            ),
        }
    }
}

impl Plugin for ResultSummaryPlugin {
    fn plugin_id(&self) -> &PluginId {
        self.base.plugin_id()
    }
    
    fn plugin_type(&self) -> &PluginType {
        self.base.plugin_type()
    }
    
    fn version(&self) -> &str {
        self.base.version()
    }
    
    fn description(&self) -> &str {
        self.base.description()
    }
    
    fn status(&self) -> &PluginStatus {
        self.base.status()
    }
    
    fn initialize(&mut self, config: HashMap<String, serde_json::Value>) -> bool {
        self.base.initialize(config)
    }
    
    fn execute(&self, context: &PluginContext, _params: HashMap<String, serde_json::Value>) -> PluginExecutionResult {
        let start_time = std::time::Instant::now();
        
        // 生成结果摘要
        let mut summary_data = HashMap::new();
        summary_data.insert("workflow_id".to_string(), serde_json::Value::String(context.workflow_id.clone()));
        summary_data.insert("status".to_string(), serde_json::Value::String("completed".to_string()));
        summary_data.insert("completion_time".to_string(), serde_json::Value::String(Utc::now().to_rfc3339()));
        
        // 模拟结果摘要内容
        summary_data.insert("summary".to_string(), serde_json::Value::String("工作流已成功完成所有任务".to_string()));
        summary_data.insert("key_results".to_string(), serde_json::Value::Array(vec![
            serde_json::Value::String("任务1: 数据处理完成".to_string()),
            serde_json::Value::String("任务2: 分析报告生成".to_string()),
            serde_json::Value::String("任务3: 结果保存成功".to_string()),
        ]));
        
        let execution_time = start_time.elapsed().as_secs_f64();
        
        PluginExecutionResult {
            plugin_id: self.plugin_id().clone(),
            status: "success".to_string(),
            success: true,
            error: None,
            execution_time,
            data: summary_data,
            timestamp: Utc::now(),
        }
    }
    
    fn cleanup(&mut self) {
        self.base.cleanup();
    }
    
    fn set_status(&mut self, status: PluginStatus) {
        self.base.set_status(status);
    }
}

/// 内置插件集合
pub struct BuiltinPlugins;

impl BuiltinPlugins {
    /// 获取所有内置插件
    pub fn get_all_plugins() -> Vec<Box<dyn Plugin>> {
        vec![
            Box::new(ContextSummaryPlugin::new()),
            Box::new(EnvironmentCheckPlugin::new()),
            Box::new(ExecutionStatsPlugin::new()),
            Box::new(ResultSummaryPlugin::new()),
        ]
    }
    
    /// 根据名称获取插件
    pub fn get_plugin_by_name(name: &str) -> Option<Box<dyn Plugin>> {
        match name {
            "context_summary" => Some(Box::new(ContextSummaryPlugin::new())),
            "environment_check" => Some(Box::new(EnvironmentCheckPlugin::new())),
            "execution_stats" => Some(Box::new(ExecutionStatsPlugin::new())),
            "result_summary" => Some(Box::new(ResultSummaryPlugin::new())),
            _ => None,
        }
    }
}