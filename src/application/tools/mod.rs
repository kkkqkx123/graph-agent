pub mod service;
pub mod commands;
pub mod queries;
pub mod dto;
pub mod validation;

// 重新导出主要类型
pub use service::{ToolService, ToolRepository, ToolExecutor, ToolValidationService};
pub use commands::{
    ExecuteToolCommand, RegisterToolCommand, UnregisterToolCommand, UpdateToolConfigCommand,
    EnableToolCommand, DisableToolCommand, BatchToolOperationCommand, BatchOperationType
};
pub use queries::{
    GetToolQuery, ListToolsQuery, GetToolsByTypeQuery, SearchToolsQuery, GetToolStatisticsQuery,
    GetToolExecutionHistoryQuery, ToolFilters, PaginationParams, SortingParams, SearchField,
    StatisticsType, TimeRange, SortingField, SortDirection
};
pub use dto::{
    ExecuteToolRequest, ExecuteToolResponse, RegisterToolRequest, RegisterToolResponse,
    UpdateToolConfigRequest, UpdateToolConfigResponse, ToolDto, ToolConfigDto, ToolMetadataDto,
    ParameterDefinitionDto, ToolStatistics, ToolExecutionHistoryRecord
};
pub use validation::service::ToolValidationService as ConcreteToolValidationService;