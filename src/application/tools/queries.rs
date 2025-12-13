use serde::{Deserialize, Serialize};
use crate::domain::common::id::ToolId;
use crate::domain::tools::ToolType;

/// 获取工具查询
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GetToolQuery {
    /// 工具标识符（ID或名称）
    pub tool_identifier: String,
    /// 是否包含详细信息
    pub include_details: bool,
}

/// 列出工具查询
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ListToolsQuery {
    /// 过滤条件
    pub filters: ToolFilters,
    /// 分页参数
    pub pagination: Option<PaginationParams>,
    /// 排序参数
    pub sorting: Option<SortingParams>,
}

/// 根据类型获取工具查询
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GetToolsByTypeQuery {
    /// 工具类型
    pub tool_type: ToolType,
    /// 是否包含详细信息
    pub include_details: bool,
}

/// 搜索工具查询
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchToolsQuery {
    /// 搜索关键词
    pub keyword: String,
    /// 搜索字段
    pub search_fields: Vec<SearchField>,
    /// 过滤条件
    pub filters: Option<ToolFilters>,
    /// 分页参数
    pub pagination: Option<PaginationParams>,
    /// 排序参数
    pub sorting: Option<SortingParams>,
}

/// 获取工具统计查询
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GetToolStatisticsQuery {
    /// 统计类型
    pub statistics_type: StatisticsType,
    /// 时间范围（可选）
    pub time_range: Option<TimeRange>,
    /// 过滤条件
    pub filters: Option<ToolFilters>,
}

/// 获取工具执行历史查询
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GetToolExecutionHistoryQuery {
    /// 工具ID
    pub tool_id: ToolId,
    /// 时间范围
    pub time_range: Option<TimeRange>,
    /// 分页参数
    pub pagination: Option<PaginationParams>,
    /// 是否包含详细信息
    pub include_details: bool,
}

/// 工具过滤器
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolFilters {
    /// 工具类型
    pub tool_type: Option<ToolType>,
    /// 名称模式
    pub name_pattern: Option<String>,
    /// 标签
    pub tags: Vec<String>,
    /// 作者
    pub author: Option<String>,
    /// 是否启用
    pub enabled: Option<bool>,
    /// 版本范围
    pub version_range: Option<String>,
}

/// 分页参数
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PaginationParams {
    /// 页码（从1开始）
    pub page: u32,
    /// 每页大小
    pub page_size: u32,
}

/// 排序参数
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SortingParams {
    /// 排序字段
    pub field: SortingField,
    /// 排序方向
    pub direction: SortDirection,
}

/// 搜索字段
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SearchField {
    /// 名称
    Name,
    /// 描述
    Description,
    /// 作者
    Author,
    /// 标签
    Tags,
    /// 所有字段
    All,
}

/// 统计类型
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum StatisticsType {
    /// 使用次数统计
    UsageCount,
    /// 执行时间统计
    ExecutionTime,
    /// 成功率统计
    SuccessRate,
    /// 错误统计
    ErrorRate,
    /// 综合统计
    Overall,
}

/// 时间范围
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TimeRange {
    /// 开始时间
    pub start_time: crate::domain::common::timestamp::Timestamp,
    /// 结束时间
    pub end_time: crate::domain::common::timestamp::Timestamp,
}

/// 排序字段
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SortingField {
    /// 名称
    Name,
    /// 创建时间
    CreatedAt,
    /// 更新时间
    UpdatedAt,
    /// 版本
    Version,
    /// 作者
    Author,
    /// 使用次数
    UsageCount,
}

/// 排序方向
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SortDirection {
    /// 升序
    Asc,
    /// 降序
    Desc,
}

impl GetToolQuery {
    /// 创建新的获取工具查询
    pub fn new(tool_identifier: String) -> Self {
        Self {
            tool_identifier,
            include_details: false,
        }
    }

    /// 设置是否包含详细信息
    pub fn with_details(mut self, include_details: bool) -> Self {
        self.include_details = include_details;
        self
    }
}

impl ListToolsQuery {
    /// 创建新的列出工具查询
    pub fn new() -> Self {
        Self {
            filters: ToolFilters::new(),
            pagination: None,
            sorting: None,
        }
    }

    /// 设置过滤器
    pub fn with_filters(mut self, filters: ToolFilters) -> Self {
        self.filters = filters;
        self
    }

    /// 设置分页参数
    pub fn with_pagination(mut self, pagination: PaginationParams) -> Self {
        self.pagination = Some(pagination);
        self
    }

    /// 设置排序参数
    pub fn with_sorting(mut self, sorting: SortingParams) -> Self {
        self.sorting = Some(sorting);
        self
    }
}

impl GetToolsByTypeQuery {
    /// 创建新的根据类型获取工具查询
    pub fn new(tool_type: ToolType) -> Self {
        Self {
            tool_type,
            include_details: false,
        }
    }

    /// 设置是否包含详细信息
    pub fn with_details(mut self, include_details: bool) -> Self {
        self.include_details = include_details;
        self
    }
}

impl SearchToolsQuery {
    /// 创建新的搜索工具查询
    pub fn new(keyword: String) -> Self {
        Self {
            keyword,
            search_fields: vec![SearchField::All],
            filters: None,
            pagination: None,
            sorting: None,
        }
    }

    /// 设置搜索字段
    pub fn with_search_fields(mut self, search_fields: Vec<SearchField>) -> Self {
        self.search_fields = search_fields;
        self
    }

    /// 设置过滤器
    pub fn with_filters(mut self, filters: ToolFilters) -> Self {
        self.filters = Some(filters);
        self
    }

    /// 设置分页参数
    pub fn with_pagination(mut self, pagination: PaginationParams) -> Self {
        self.pagination = Some(pagination);
        self
    }

    /// 设置排序参数
    pub fn with_sorting(mut self, sorting: SortingParams) -> Self {
        self.sorting = Some(sorting);
        self
    }
}

impl GetToolStatisticsQuery {
    /// 创建新的获取工具统计查询
    pub fn new(statistics_type: StatisticsType) -> Self {
        Self {
            statistics_type,
            time_range: None,
            filters: None,
        }
    }

    /// 设置时间范围
    pub fn with_time_range(mut self, time_range: TimeRange) -> Self {
        self.time_range = Some(time_range);
        self
    }

    /// 设置过滤器
    pub fn with_filters(mut self, filters: ToolFilters) -> Self {
        self.filters = Some(filters);
        self
    }
}

impl GetToolExecutionHistoryQuery {
    /// 创建新的获取工具执行历史查询
    pub fn new(tool_id: ToolId) -> Self {
        Self {
            tool_id,
            time_range: None,
            pagination: None,
            include_details: false,
        }
    }

    /// 设置时间范围
    pub fn with_time_range(mut self, time_range: TimeRange) -> Self {
        self.time_range = Some(time_range);
        self
    }

    /// 设置分页参数
    pub fn with_pagination(mut self, pagination: PaginationParams) -> Self {
        self.pagination = Some(pagination);
        self
    }

    /// 设置是否包含详细信息
    pub fn with_details(mut self, include_details: bool) -> Self {
        self.include_details = include_details;
        self
    }
}

impl ToolFilters {
    /// 创建新的工具过滤器
    pub fn new() -> Self {
        Self {
            tool_type: None,
            name_pattern: None,
            tags: Vec::new(),
            author: None,
            enabled: None,
            version_range: None,
        }
    }

    /// 设置工具类型
    pub fn with_tool_type(mut self, tool_type: ToolType) -> Self {
        self.tool_type = Some(tool_type);
        self
    }

    /// 设置名称模式
    pub fn with_name_pattern(mut self, name_pattern: String) -> Self {
        self.name_pattern = Some(name_pattern);
        self
    }

    /// 添加标签
    pub fn with_tag(mut self, tag: String) -> Self {
        self.tags.push(tag);
        self
    }

    /// 设置标签列表
    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }

    /// 设置作者
    pub fn with_author(mut self, author: String) -> Self {
        self.author = Some(author);
        self
    }

    /// 设置是否启用
    pub fn with_enabled(mut self, enabled: bool) -> Self {
        self.enabled = Some(enabled);
        self
    }

    /// 设置版本范围
    pub fn with_version_range(mut self, version_range: String) -> Self {
        self.version_range = Some(version_range);
        self
    }
}

impl PaginationParams {
    /// 创建新的分页参数
    pub fn new(page: u32, page_size: u32) -> Self {
        Self { page, page_size }
    }

    /// 获取偏移量
    pub fn offset(&self) -> u32 {
        (self.page - 1) * self.page_size
    }
}

impl SortingParams {
    /// 创建新的排序参数
    pub fn new(field: SortingField, direction: SortDirection) -> Self {
        Self { field, direction }
    }
}

impl TimeRange {
    /// 创建新的时间范围
    pub fn new(
        start_time: crate::domain::common::timestamp::Timestamp,
        end_time: crate::domain::common::timestamp::Timestamp,
    ) -> Self {
        Self { start_time, end_time }
    }
}

impl Default for ToolFilters {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_tool_query() {
        let query = GetToolQuery::new("test_tool".to_string())
            .with_details(true);
        
        assert_eq!(query.tool_identifier, "test_tool");
        assert!(query.include_details);
    }

    #[test]
    fn test_list_tools_query() {
        let filters = ToolFilters::new()
            .with_tool_type(ToolType::Builtin)
            .with_name_pattern("test".to_string());
        
        let pagination = PaginationParams::new(1, 10);
        let sorting = SortingParams::new(SortingField::Name, SortDirection::Asc);
        
        let query = ListToolsQuery::new()
            .with_filters(filters)
            .with_pagination(pagination)
            .with_sorting(sorting);
        
        assert!(query.filters.tool_type.is_some());
        assert!(query.pagination.is_some());
        assert!(query.sorting.is_some());
    }

    #[test]
    fn test_search_tools_query() {
        let query = SearchToolsQuery::new("test".to_string())
            .with_search_fields(vec![SearchField::Name, SearchField::Description])
            .with_filters(ToolFilters::new().with_tool_type(ToolType::Builtin));
        
        assert_eq!(query.keyword, "test");
        assert_eq!(query.search_fields.len(), 2);
        assert!(query.filters.is_some());
    }

    #[test]
    fn test_tool_filters() {
        let filters = ToolFilters::new()
            .with_tool_type(ToolType::Builtin)
            .with_name_pattern("test".to_string())
            .with_tag("utility".to_string())
            .with_author("test_author".to_string())
            .with_enabled(true)
            .with_version_range("1.0.0".to_string());
        
        assert_eq!(filters.tool_type, Some(ToolType::Builtin));
        assert_eq!(filters.name_pattern, Some("test".to_string()));
        assert_eq!(filters.tags, vec!["utility".to_string()]);
        assert_eq!(filters.author, Some("test_author".to_string()));
        assert_eq!(filters.enabled, Some(true));
        assert_eq!(filters.version_range, Some("1.0.0".to_string()));
    }

    #[test]
    fn test_pagination_params() {
        let pagination = PaginationParams::new(2, 20);
        
        assert_eq!(pagination.page, 2);
        assert_eq!(pagination.page_size, 20);
        assert_eq!(pagination.offset(), 20);
    }

    #[test]
    fn test_sorting_params() {
        let sorting = SortingParams::new(SortingField::CreatedAt, SortDirection::Desc);
        
        match sorting.field {
            SortingField::CreatedAt => {}
            _ => panic!("Expected CreatedAt field"),
        }
        
        match sorting.direction {
            SortDirection::Desc => {}
            _ => panic!("Expected Desc direction"),
        }
    }
}