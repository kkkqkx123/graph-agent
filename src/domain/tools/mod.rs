pub mod entities;
pub mod value_objects;
pub mod errors;
pub mod events;

// 重新导出主要类型
pub use entities::{Tool, ToolType, ToolRegistry};
pub use value_objects::{
    ToolConfig, ToolMetadata, ToolExecutionResult, ParameterDefinition, ParameterType,
    SerializedValue, ToolError as ToolExecutionErrorValue, TokenUsage, ValidationError
};
pub use errors::{
    ToolError, ToolValidationError, ToolExecutionError, ToolFactoryError, ToolRegistryError
};
pub use events::{ToolEvent, ToolEventBuilder};