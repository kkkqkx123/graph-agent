/**
 * 搜索工作流查询
 */
export interface SearchWorkflowsQuery {
  /** 搜索关键词 */
  keyword: string;
  /** 搜索范围 */
  searchIn?: 'name' | 'description' | 'tags' | 'all';
  /** 过滤条件 */
  filters?: {
    /** 状态过滤 */
    status?: string;
    /** 类型过滤 */
    type?: string;
    /** 创建者过滤 */
    createdBy?: string;
  };
  /** 排序条件 */
  sortBy?: 'relevance' | 'name' | 'createdAt' | 'updatedAt' | 'executionCount' | 'successRate';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页参数 */
  pagination?: {
    /** 页码 */
    page: number;
    /** 每页大小 */
    size: number;
  };
}
