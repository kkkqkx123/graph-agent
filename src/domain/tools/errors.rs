use thiserror::Error;
use crate::domain::common::id::ToolId;

/// 工具领域错误
#[derive(Debug, Clone, PartialEq, Error)]
pub enum ToolError {
    /// 工具未找到
    #[error("工具未找到: {0}")]
    ToolNotFound(ToolId),
    
    /// 工具配置无效
    #[error("工具配置无效: {0}")]
    InvalidToolConfig(String),
    
    /// 工具执行失败
    #[error("工具执行失败: {0}")]
    ExecutionFailed(String),
    
    /// 工具类型不支持
    #[error("工具类型不支持: {0:?}")]
    UnsupportedToolType(String),
    
    /// 参数验证失败
    #[error("参数验证失败: {0}")]
    ParameterValidationFailed(String),
    
    /// 工具注册失败
    #[error("工具注册失败: {0}")]
    RegistrationFailed(String),
    
    /// 工具状态错误
    #[error("工具状态错误: {0}")]
    ToolStateError(String),
    
    /// 工具依赖错误
    #[error("工具依赖错误: {0}")]
    DependencyError(String),
    
    /// 工具权限错误
    #[error("工具权限错误: {0}")]
    PermissionError(String),
    
    /// 工具超时
    #[error("工具执行超时: {0}ms")]
    Timeout(u64),
    
    /// 工具资源不足
    #[error("工具资源不足: {0}")]
    ResourceExhausted(String),
    
    /// 工具内部错误
    #[error("工具内部错误: {0}")]
    InternalError(String),
}

/// 工具验证错误
#[derive(Debug, Clone, PartialEq, Error)]
pub enum ToolValidationError {
    /// 工具名称无效
    #[error("工具名称无效: {0}")]
    InvalidToolName(String),
    
    /// 工具版本无效
    #[error("工具版本无效: {0}")]
    InvalidVersion(String),
    
    /// 参数定义无效
    #[error("参数定义无效: {0}")]
    InvalidParameterDefinition(String),
    
    /// 工具元数据无效
    #[error("工具元数据无效: {0}")]
    InvalidMetadata(String),
    
    /// 工具配置不完整
    #[error("工具配置不完整: {0}")]
    IncompleteConfig(String),
}

/// 工具执行错误
#[derive(Debug, Clone, PartialEq, Error)]
pub enum ToolExecutionError {
    /// 执行超时
    #[error("执行超时: {0}ms")]
    Timeout(u64),
    
    /// 执行被取消
    #[error("执行被取消")]
    Cancelled,
    
    /// 执行环境错误
    #[error("执行环境错误: {0}")]
    EnvironmentError(String),
    
    /// 资源访问错误
    #[error("资源访问错误: {0}")]
    ResourceAccessError(String),
    
    /// 网络错误
    #[error("网络错误: {0}")]
    NetworkError(String),
    
    /// 序列化错误
    #[error("序列化错误: {0}")]
    SerializationError(String),
    
    /// 反序列化错误
    #[error("反序列化错误: {0}")]
    DeserializationError(String),
    
    /// 外部服务错误
    #[error("外部服务错误: {0}")]
    ExternalServiceError(String),
    
    /// 安全错误
    #[error("安全错误: {0}")]
    SecurityError(String),
    
    /// 未知执行错误
    #[error("未知执行错误: {0}")]
    UnknownExecutionError(String),
}

/// 工具工厂错误
#[derive(Debug, Clone, PartialEq, Error)]
pub enum ToolFactoryError {
    /// 工具类型不支持
    #[error("工具类型不支持: {0}")]
    UnsupportedToolType(String),
    
    /// 工具创建失败
    #[error("工具创建失败: {0}")]
    CreationFailed(String),
    
    /// 工具配置错误
    #[error("工具配置错误: {0}")]
    ConfigurationError(String),
    
    /// 依赖注入失败
    #[error("依赖注入失败: {0}")]
    DependencyInjectionFailed(String),
    
    /// 工具初始化失败
    #[error("工具初始化失败: {0}")]
    InitializationFailed(String),
}

/// 工具注册表错误
#[derive(Debug, Clone, PartialEq, Error)]
pub enum ToolRegistryError {
    /// 工具名称已存在
    #[error("工具名称已存在: {0}")]
    ToolNameAlreadyExists(String),
    
    /// 工具ID已存在
    #[error("工具ID已存在: {0}")]
    ToolIdAlreadyExists(ToolId),
    
    /// 工具未找到
    #[error("工具未找到: {0}")]
    ToolNotFound(ToolId),
    
    /// 注册表已满
    #[error("注册表已满")]
    RegistryFull,
    
    /// 注册表不可用
    #[error("注册表不可用: {0}")]
    RegistryUnavailable(String),
}

impl ToolError {
    /// 创建工具未找到错误
    pub fn tool_not_found(id: ToolId) -> Self {
        Self::ToolNotFound(id)
    }
    
    /// 创建工具配置无效错误
    pub fn invalid_tool_config(message: impl Into<String>) -> Self {
        Self::InvalidToolConfig(message.into())
    }
    
    /// 创建工具执行失败错误
    pub fn execution_failed(message: impl Into<String>) -> Self {
        Self::ExecutionFailed(message.into())
    }
    
    /// 创建工具类型不支持错误
    pub fn unsupported_tool_type(tool_type: impl Into<String>) -> Self {
        Self::UnsupportedToolType(tool_type.into())
    }
    
    /// 创建参数验证失败错误
    pub fn parameter_validation_failed(message: impl Into<String>) -> Self {
        Self::ParameterValidationFailed(message.into())
    }
    
    /// 创建工具注册失败错误
    pub fn registration_failed(message: impl Into<String>) -> Self {
        Self::RegistrationFailed(message.into())
    }
    
    /// 创建工具状态错误
    pub fn tool_state_error(message: impl Into<String>) -> Self {
        Self::ToolStateError(message.into())
    }
    
    /// 创建工具依赖错误
    pub fn dependency_error(message: impl Into<String>) -> Self {
        Self::DependencyError(message.into())
    }
    
    /// 创建工具权限错误
    pub fn permission_error(message: impl Into<String>) -> Self {
        Self::PermissionError(message.into())
    }
    
    /// 创建工具超时错误
    pub fn timeout(timeout_ms: u64) -> Self {
        Self::Timeout(timeout_ms)
    }
    
    /// 创建工具资源不足错误
    pub fn resource_exhausted(message: impl Into<String>) -> Self {
        Self::ResourceExhausted(message.into())
    }
    
    /// 创建工具内部错误
    pub fn internal_error(message: impl Into<String>) -> Self {
        Self::InternalError(message.into())
    }
}

impl ToolValidationError {
    /// 创建工具名称无效错误
    pub fn invalid_tool_name(name: impl Into<String>) -> Self {
        Self::InvalidToolName(name.into())
    }
    
    /// 创建工具版本无效错误
    pub fn invalid_version(version: impl Into<String>) -> Self {
        Self::InvalidVersion(version.into())
    }
    
    /// 创建参数定义无效错误
    pub fn invalid_parameter_definition(message: impl Into<String>) -> Self {
        Self::InvalidParameterDefinition(message.into())
    }
    
    /// 创建工具元数据无效错误
    pub fn invalid_metadata(message: impl Into<String>) -> Self {
        Self::InvalidMetadata(message.into())
    }
    
    /// 创建工具配置不完整错误
    pub fn incomplete_config(message: impl Into<String>) -> Self {
        Self::IncompleteConfig(message.into())
    }
}

impl ToolExecutionError {
    /// 创建执行超时错误
    pub fn timeout(timeout_ms: u64) -> Self {
        Self::Timeout(timeout_ms)
    }
    
    /// 创建执行被取消错误
    pub fn cancelled() -> Self {
        Self::Cancelled
    }
    
    /// 创建执行环境错误
    pub fn environment_error(message: impl Into<String>) -> Self {
        Self::EnvironmentError(message.into())
    }
    
    /// 创建资源访问错误
    pub fn resource_access_error(message: impl Into<String>) -> Self {
        Self::ResourceAccessError(message.into())
    }
    
    /// 创建网络错误
    pub fn network_error(message: impl Into<String>) -> Self {
        Self::NetworkError(message.into())
    }
    
    /// 创建序列化错误
    pub fn serialization_error(message: impl Into<String>) -> Self {
        Self::SerializationError(message.into())
    }
    
    /// 创建反序列化错误
    pub fn deserialization_error(message: impl Into<String>) -> Self {
        Self::DeserializationError(message.into())
    }
    
    /// 创建外部服务错误
    pub fn external_service_error(message: impl Into<String>) -> Self {
        Self::ExternalServiceError(message.into())
    }
    
    /// 创建安全错误
    pub fn security_error(message: impl Into<String>) -> Self {
        Self::SecurityError(message.into())
    }
    
    /// 创建未知执行错误
    pub fn unknown_execution_error(message: impl Into<String>) -> Self {
        Self::UnknownExecutionError(message.into())
    }
}

impl ToolFactoryError {
    /// 创建工具类型不支持错误
    pub fn unsupported_tool_type(tool_type: impl Into<String>) -> Self {
        Self::UnsupportedToolType(tool_type.into())
    }
    
    /// 创建工具创建失败错误
    pub fn creation_failed(message: impl Into<String>) -> Self {
        Self::CreationFailed(message.into())
    }
    
    /// 创建工具配置错误
    pub fn configuration_error(message: impl Into<String>) -> Self {
        Self::ConfigurationError(message.into())
    }
    
    /// 创建依赖注入失败错误
    pub fn dependency_injection_failed(message: impl Into<String>) -> Self {
        Self::DependencyInjectionFailed(message.into())
    }
    
    /// 创建工具初始化失败错误
    pub fn initialization_failed(message: impl Into<String>) -> Self {
        Self::InitializationFailed(message.into())
    }
}

impl ToolRegistryError {
    /// 创建工具名称已存在错误
    pub fn tool_name_already_exists(name: impl Into<String>) -> Self {
        Self::ToolNameAlreadyExists(name.into())
    }
    
    /// 创建工具ID已存在错误
    pub fn tool_id_already_exists(id: ToolId) -> Self {
        Self::ToolIdAlreadyExists(id)
    }
    
    /// 创建工具未找到错误
    pub fn tool_not_found(id: ToolId) -> Self {
        Self::ToolNotFound(id)
    }
    
    /// 创建注册表不可用错误
    pub fn registry_unavailable(message: impl Into<String>) -> Self {
        Self::RegistryUnavailable(message.into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_error_creation() {
        let tool_id = ToolId::new();
        
        let error = ToolError::tool_not_found(tool_id);
        assert_eq!(error, ToolError::ToolNotFound(tool_id));
        
        let error = ToolError::invalid_tool_config("配置无效");
        assert_eq!(error, ToolError::InvalidToolConfig("配置无效".to_string()));
        
        let error = ToolError::execution_failed("执行失败");
        assert_eq!(error, ToolError::ExecutionFailed("执行失败".to_string()));
    }

    #[test]
    fn test_tool_validation_error_creation() {
        let error = ToolValidationError::invalid_tool_name("名称无效");
        assert_eq!(error, ToolValidationError::InvalidToolName("名称无效".to_string()));
        
        let error = ToolValidationError::invalid_version("版本无效");
        assert_eq!(error, ToolValidationError::InvalidVersion("版本无效".to_string()));
    }

    #[test]
    fn test_tool_execution_error_creation() {
        let error = ToolExecutionError::timeout(5000);
        assert_eq!(error, ToolExecutionError::Timeout(5000));
        
        let error = ToolExecutionError::cancelled();
        assert_eq!(error, ToolExecutionError::Cancelled);
        
        let error = ToolExecutionError::network_error("网络连接失败");
        assert_eq!(error, ToolExecutionError::NetworkError("网络连接失败".to_string()));
    }

    #[test]
    fn test_tool_factory_error_creation() {
        let error = ToolFactoryError::unsupported_tool_type("未知类型");
        assert_eq!(error, ToolFactoryError::UnsupportedToolType("未知类型".to_string()));
        
        let error = ToolFactoryError::creation_failed("创建失败");
        assert_eq!(error, ToolFactoryError::CreationFailed("创建失败".to_string()));
    }

    #[test]
    fn test_tool_registry_error_creation() {
        let tool_id = ToolId::new();
        
        let error = ToolRegistryError::tool_name_already_exists("工具名");
        assert_eq!(error, ToolRegistryError::ToolNameAlreadyExists("工具名".to_string()));
        
        let error = ToolRegistryError::tool_id_already_exists(tool_id);
        assert_eq!(error, ToolRegistryError::ToolIdAlreadyExists(tool_id));
        
        let error = ToolRegistryError::tool_not_found(tool_id);
        assert_eq!(error, ToolRegistryError::ToolNotFound(tool_id));
    }
}