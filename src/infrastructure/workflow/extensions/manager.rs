//! Extension manager implementation

use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;

use crate::domain::workflow::extensions::{
    hooks::Hook,
    plugins::Plugin,
    triggers::TriggerExtension,
};

#[derive(Debug, Error)]
pub enum ExtensionManagerError {
    #[error("扩展管理失败: {0}")]
    ManagementFailed(String),
    #[error("扩展不存在: {0}")]
    ExtensionNotFound(String),
    #[error("扩展类型不支持: {0}")]
    UnsupportedExtensionType(String),
    #[error("扩展初始化失败: {0}")]
    InitializationFailed(String),
}

pub type ExtensionManagerResult<T> = Result<T, ExtensionManagerError>;

/// 扩展管理器
#[derive(Clone)]
pub struct ExtensionManager {
    hooks: HashMap<String, Arc<dyn Hook>>,
    plugins: HashMap<String, Arc<dyn Plugin>>,
    trigger_extensions: HashMap<String, Arc<dyn TriggerExtension>>,
}

impl std::fmt::Debug for ExtensionManager {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ExtensionManager")
            .field("hooks_count", &self.hooks.len())
            .field("plugins_count", &self.plugins.len())
            .field("trigger_extensions_count", &self.trigger_extensions.len())
            .finish()
    }
}

impl ExtensionManager {
    pub fn new() -> Self {
        Self {
            hooks: HashMap::new(),
            plugins: HashMap::new(),
            trigger_extensions: HashMap::new(),
        }
    }

    /// 注册钩子
    pub fn register_hook(&mut self, hook: Arc<dyn Hook>) -> ExtensionManagerResult<()> {
        let hook_id = hook.hook_id().0.clone();
        if self.hooks.contains_key(&hook_id) {
            return Err(ExtensionManagerError::ManagementFailed(
                format!("钩子已存在: {}", hook_id)
            ));
        }
        
        self.hooks.insert(hook_id, hook);
        Ok(())
    }

    /// 注销钩子
    pub fn unregister_hook(&mut self, hook_id: &str) -> ExtensionManagerResult<()> {
        if self.hooks.remove(hook_id).is_none() {
            return Err(ExtensionManagerError::ExtensionNotFound(
                format!("钩子不存在: {}", hook_id)
            ));
        }
        Ok(())
    }

    /// 获取钩子
    pub fn get_hook(&self, hook_id: &str) -> Option<Arc<dyn Hook>> {
        self.hooks.get(hook_id).cloned()
    }

    /// 获取所有钩子
    pub fn get_all_hooks(&self) -> Vec<Arc<dyn Hook>> {
        self.hooks.values().cloned().collect()
    }

    /// 注册插件
    pub fn register_plugin(&mut self, plugin: Arc<dyn Plugin>) -> ExtensionManagerResult<()> {
        let plugin_id = plugin.plugin_id().0.clone();
        if self.plugins.contains_key(&plugin_id) {
            return Err(ExtensionManagerError::ManagementFailed(
                format!("插件已存在: {}", plugin_id)
            ));
        }
        
        self.plugins.insert(plugin_id, plugin);
        Ok(())
    }

    /// 注销插件
    pub fn unregister_plugin(&mut self, plugin_id: &str) -> ExtensionManagerResult<()> {
        if self.plugins.remove(plugin_id).is_none() {
            return Err(ExtensionManagerError::ExtensionNotFound(
                format!("插件不存在: {}", plugin_id)
            ));
        }
        Ok(())
    }

    /// 获取插件
    pub fn get_plugin(&self, plugin_id: &str) -> Option<Arc<dyn Plugin>> {
        self.plugins.get(plugin_id).cloned()
    }

    /// 获取所有插件
    pub fn get_all_plugins(&self) -> Vec<Arc<dyn Plugin>> {
        self.plugins.values().cloned().collect()
    }

    /// 注册触发器扩展
    pub fn register_trigger_extension(&mut self, trigger_extension: Arc<dyn TriggerExtension>) -> ExtensionManagerResult<()> {
        let trigger_id = trigger_extension.trigger_id().0.clone();
        if self.trigger_extensions.contains_key(&trigger_id) {
            return Err(ExtensionManagerError::ManagementFailed(
                format!("触发器扩展已存在: {}", trigger_id)
            ));
        }
        
        self.trigger_extensions.insert(trigger_id, trigger_extension);
        Ok(())
    }

    /// 注销触发器扩展
    pub fn unregister_trigger_extension(&mut self, trigger_id: &str) -> ExtensionManagerResult<()> {
        if self.trigger_extensions.remove(trigger_id).is_none() {
            return Err(ExtensionManagerError::ExtensionNotFound(
                format!("触发器扩展不存在: {}", trigger_id)
            ));
        }
        Ok(())
    }

    /// 获取触发器扩展
    pub fn get_trigger_extension(&self, trigger_id: &str) -> Option<Arc<dyn TriggerExtension>> {
        self.trigger_extensions.get(trigger_id).cloned()
    }

    /// 获取所有触发器扩展
    pub fn get_all_trigger_extensions(&self) -> Vec<Arc<dyn TriggerExtension>> {
        self.trigger_extensions.values().cloned().collect()
    }

    /// 批量注册内置扩展
    pub fn register_builtin_extensions(&mut self) -> ExtensionManagerResult<()> {
        // 注册内置钩子
        for hook in crate::domain::workflow::extensions::hooks::BuiltinHooks::get_all_hooks() {
            let hook_id = hook.hook_id().0.clone();
            if self.hooks.contains_key(&hook_id) {
                continue; // 跳过已存在的钩子
            }
            self.hooks.insert(hook_id, hook.into());
        }

        // 注册内置插件
        for plugin in crate::domain::workflow::extensions::plugins::BuiltinPlugins::get_all_plugins() {
            let plugin_id = plugin.plugin_id().0.clone();
            if self.plugins.contains_key(&plugin_id) {
                continue; // 跳过已存在的插件
            }
            self.plugins.insert(plugin_id, plugin.into());
        }

        // 注册内置触发器扩展
        for trigger_extension in crate::domain::workflow::extensions::triggers::BuiltinTriggerExtensions::get_all_extensions() {
            let trigger_id = trigger_extension.trigger_id().0.clone();
            if self.trigger_extensions.contains_key(&trigger_id) {
                continue; // 跳过已存在的触发器扩展
            }
            self.trigger_extensions.insert(trigger_id, trigger_extension.into());
        }

        Ok(())
    }

    /// 初始化所有扩展
    pub async fn initialize_all_extensions(&mut self) -> ExtensionManagerResult<()> {
        let mut errors = Vec::new();

        // 初始化钩子
        for (hook_id, hook) in &self.hooks {
            // 注意：这里简化处理，实际可能需要更复杂的初始化逻辑
            // 由于 trait 对象的克隆限制，我们跳过实际的初始化
            if !hook.is_initialized() {
                errors.push(format!("钩子初始化失败: {}", hook_id));
            }
        }

        // 初始化插件
        for (plugin_id, plugin) in &self.plugins {
            // 注意：这里简化处理，实际可能需要更复杂的初始化逻辑
            if !matches!(plugin.status(), crate::domain::workflow::extensions::plugins::PluginStatus::Active) {
                errors.push(format!("插件初始化失败: {}", plugin_id));
            }
        }

        // 初始化触发器扩展
        for (trigger_id, trigger_extension) in &self.trigger_extensions {
            // 触发器扩展默认都是初始化的
            if !trigger_extension.is_enabled() {
                errors.push(format!("触发器扩展初始化失败: {}", trigger_id));
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(ExtensionManagerError::InitializationFailed(
                format!("扩展初始化失败: {}", errors.join(", "))
            ))
        }
    }

    /// 清理所有扩展
    pub fn cleanup_all_extensions(&mut self) {
        // 清理钩子
        self.hooks.clear();

        // 清理插件
        self.plugins.clear();

        // 清理触发器扩展
        self.trigger_extensions.clear();
    }

    /// 执行钩子
    pub async fn execute_hooks(
        &self,
        hook_point: crate::domain::workflow::extensions::hooks::HookPoint,
        context: &crate::domain::workflow::extensions::hooks::HookContext,
    ) -> Vec<crate::domain::workflow::extensions::hooks::HookExecutionResult> {
        let mut results = Vec::new();
        
        for hook in self.hooks.values() {
            if hook.get_supported_hook_points().contains(&hook_point) {
                let result = hook.execute(hook_point.clone(), context);
                results.push(result);
            }
        }
        
        results
    }

    /// 执行插件
    pub async fn execute_plugins(
        &self,
        plugin_type: crate::domain::workflow::extensions::plugins::PluginType,
        context: &crate::domain::workflow::extensions::plugins::PluginContext,
        params: HashMap<String, serde_json::Value>,
    ) -> Vec<crate::domain::workflow::extensions::plugins::PluginExecutionResult> {
        let mut results = Vec::new();
        
        for plugin in self.plugins.values() {
            if plugin.plugin_type() == &plugin_type {
                let result = plugin.execute(&context, params.clone());
                results.push(result);
            }
        }
        
        results
    }

    /// 评估触发器扩展
    pub async fn evaluate_trigger_extensions(
        &self,
        context: &crate::domain::workflow::graph::value_objects::ExecutionContext,
        params: HashMap<String, serde_json::Value>,
    ) -> Vec<crate::domain::workflow::extensions::triggers::TriggerExtensionResult> {
        let mut results = Vec::new();
        
        for trigger_extension in self.trigger_extensions.values() {
            let result = trigger_extension.evaluate(context, params.clone());
            results.push(result);
        }
        
        results
    }

    /// 获取扩展统计信息
    pub fn get_extension_stats(&self) -> ExtensionStats {
        ExtensionStats {
            total_hooks: self.hooks.len(),
            total_plugins: self.plugins.len(),
            total_trigger_extensions: self.trigger_extensions.len(),
            active_hooks: self.hooks.values().filter(|h| h.is_initialized()).count(),
            active_plugins: self.plugins.values().filter(|p| matches!(p.status(), crate::domain::workflow::extensions::plugins::PluginStatus::Active)).count(),
            active_trigger_extensions: self.trigger_extensions.len(), // 触发器扩展默认都是活跃的
        }
    }
}

/// 扩展统计信息
#[derive(Debug, Clone)]
pub struct ExtensionStats {
    pub total_hooks: usize,
    pub total_plugins: usize,
    pub total_trigger_extensions: usize,
    pub active_hooks: usize,
    pub active_plugins: usize,
    pub active_trigger_extensions: usize,
}

/// 扩展管理器构建器
pub struct ExtensionManagerBuilder {
    manager: ExtensionManager,
}

impl ExtensionManagerBuilder {
    pub fn new() -> Self {
        Self {
            manager: ExtensionManager::new(),
        }
    }

    pub fn with_hook(mut self, hook: Arc<dyn Hook>) -> Self {
        let _ = self.manager.register_hook(hook);
        self
    }

    pub fn with_plugin(mut self, plugin: Arc<dyn Plugin>) -> Self {
        let _ = self.manager.register_plugin(plugin);
        self
    }

    pub fn with_trigger_extension(mut self, trigger_extension: Arc<dyn TriggerExtension>) -> Self {
        let _ = self.manager.register_trigger_extension(trigger_extension);
        self
    }

    pub fn with_builtin_extensions(mut self) -> Self {
        let _ = self.manager.register_builtin_extensions();
        self
    }

    pub fn build(self) -> ExtensionManager {
        self.manager
    }
}

impl Default for ExtensionManagerBuilder {
    fn default() -> Self {
        Self::new().with_builtin_extensions()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::workflow::extensions::hooks::{LoggingHook, HookPoint};
    use crate::domain::workflow::extensions::plugins::{ContextSummaryPlugin, PluginType};
    use crate::domain::workflow::extensions::triggers::ToolErrorTriggerExtension;

    #[tokio::test]
    async fn test_extension_manager() {
        let mut manager = ExtensionManager::new();
        
        // 注册内置扩展
        manager.register_builtin_extensions().unwrap();
        
        // 初始化所有扩展
        manager.initialize_all_extensions().await.unwrap();
        
        // 测试钩子执行
        let hook_context = crate::domain::workflow::extensions::hooks::HookContext {
            workflow_id: "test_workflow".to_string(),
            node_id: Some("test_node".to_string()),
            execution_id: Some("test_execution".to_string()),
            metadata: HashMap::new(),
        };
        
        let hook_results = manager.execute_hooks(HookPoint::BeforeExecute, &hook_context).await;
        assert!(!hook_results.is_empty());
        
        // 测试插件执行
        let plugin_context = crate::domain::workflow::extensions::plugins::PluginContext {
            workflow_id: "test_workflow".to_string(),
            thread_id: Some("test_thread".to_string()),
            session_id: Some("test_session".to_string()),
            execution_start_time: Some(chrono::Utc::now()),
            metadata: HashMap::new(),
        };
        
        let plugin_results = manager.execute_plugins(PluginType::Start, &plugin_context, HashMap::new()).await;
        assert!(!plugin_results.is_empty());
        
        // 测试触发器扩展评估
        let execution_context = crate::domain::workflow::graph::value_objects::ExecutionContext::default();
        let trigger_results = manager.evaluate_trigger_extensions(&execution_context, HashMap::new()).await;
        assert!(!trigger_results.is_empty());
        
        // 测试统计信息
        let stats = manager.get_extension_stats();
        assert!(stats.total_hooks > 0);
        assert!(stats.total_plugins > 0);
        assert!(stats.total_trigger_extensions > 0);
    }
}