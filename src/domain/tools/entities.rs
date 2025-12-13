use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::domain::common::id::ToolId;
use crate::domain::common::timestamp::Timestamp;
use crate::domain::tools::value_objects::{
    ToolConfig, ToolMetadata, ToolExecutionResult, ParameterDefinition
};

/// 工具实体
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Tool {
    /// 工具唯一标识符
    pub id: ToolId,
    /// 工具名称
    pub name: String,
    /// 工具类型
    pub tool_type: ToolType,
    /// 工具配置
    pub config: ToolConfig,
    /// 工具元数据
    pub metadata: ToolMetadata,
    /// 创建时间
    pub created_at: Timestamp,
    /// 更新时间
    pub updated_at: Timestamp,
}

/// 工具类型枚举
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ToolType {
    /// 内置工具
    Builtin,
    /// 原生工具
    Native,
    /// REST工具
    Rest,
    /// MCP工具
    Mcp,
}

/// 工具注册表
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolRegistry {
    /// 注册的工具
    pub tools: HashMap<ToolId, Tool>,
    /// 工具名称到ID的映射
    pub name_to_id: HashMap<String, ToolId>,
    /// 创建时间
    pub created_at: Timestamp,
    /// 更新时间
    pub updated_at: Timestamp,
}

impl ToolRegistry {
    /// 创建新的工具注册表
    pub fn new() -> Self {
        let now = Timestamp::now();
        Self {
            tools: HashMap::new(),
            name_to_id: HashMap::new(),
            created_at: now,
            updated_at: now,
        }
    }

    /// 注册工具
    pub fn register_tool(&mut self, tool: Tool) -> Result<(), ToolRegistryError> {
        // 检查工具名称是否已存在
        if self.name_to_id.contains_key(&tool.name) {
            return Err(ToolRegistryError::ToolNameAlreadyExists(tool.name));
        }

        // 检查工具ID是否已存在
        if self.tools.contains_key(&tool.id) {
            return Err(ToolRegistryError::ToolIdAlreadyExists(tool.id));
        }

        // 注册工具
        self.name_to_id.insert(tool.name.clone(), tool.id);
        self.tools.insert(tool.id, tool);
        self.updated_at = Timestamp::now();

        Ok(())
    }

    /// 根据ID获取工具
    pub fn get_tool_by_id(&self, id: &ToolId) -> Option<&Tool> {
        self.tools.get(id)
    }

    /// 根据名称获取工具
    pub fn get_tool_by_name(&self, name: &str) -> Option<&Tool> {
        self.name_to_id
            .get(name)
            .and_then(|id| self.tools.get(id))
    }

    /// 获取所有工具
    pub fn get_all_tools(&self) -> Vec<&Tool> {
        self.tools.values().collect()
    }

    /// 根据类型获取工具
    pub fn get_tools_by_type(&self, tool_type: &ToolType) -> Vec<&Tool> {
        self.tools
            .values()
            .filter(|tool| &tool.tool_type == tool_type)
            .collect()
    }

    /// 注销工具
    pub fn unregister_tool(&mut self, id: &ToolId) -> Result<(), ToolRegistryError> {
        let tool = self.tools.remove(id)
            .ok_or(ToolRegistryError::ToolNotFound(*id))?;
        
        self.name_to_id.remove(&tool.name);
        self.updated_at = Timestamp::now();

        Ok(())
    }
}

/// 工具注册表错误
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum ToolRegistryError {
    #[error("工具名称已存在: {0}")]
    ToolNameAlreadyExists(String),
    
    #[error("工具ID已存在: {0}")]
    ToolIdAlreadyExists(ToolId),
    
    #[error("工具未找到: {0}")]
    ToolNotFound(ToolId),
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_registry() {
        let mut registry = ToolRegistry::new();
        
        // 创建测试工具
        let tool = Tool {
            id: ToolId::new(),
            name: "test_tool".to_string(),
            tool_type: ToolType::Builtin,
            config: ToolConfig {
                parameters: HashMap::new(),
                required_parameters: vec![],
                optional_parameters: vec![],
            },
            metadata: ToolMetadata {
                description: "测试工具".to_string(),
                version: "1.0.0".parse().unwrap(),
                author: Some("测试作者".to_string()),
                tags: vec!["test".to_string()],
            },
            created_at: Timestamp::now(),
            updated_at: Timestamp::now(),
        };

        // 测试注册工具
        assert!(registry.register_tool(tool.clone()).is_ok());
        
        // 测试重复注册
        assert!(registry.register_tool(tool.clone()).is_err());
        
        // 测试获取工具
        assert_eq!(registry.get_tool_by_name("test_tool"), Some(&tool));
        assert_eq!(registry.get_tool_by_id(&tool.id), Some(&tool));
        
        // 测试注销工具
        assert!(registry.unregister_tool(&tool.id).is_ok());
        assert_eq!(registry.get_tool_by_name("test_tool"), None);
    }
}