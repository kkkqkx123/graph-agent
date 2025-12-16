/**
 * 列出工作流查询
 */
export interface ListWorkflowsQuery {
  /** 过滤条件 */
  filters?: {
    /** 名称过滤 */
    name?: string;
    /** 状态过滤 */
    status?: string;
    /** 类型过滤 */
    type?: string;
    /** 标签过滤 */
    tags?: string[];
    /** 创建者过滤 */
    createdBy?: string;
    /** 创建时间范围过滤 */
    createdAfter?: string;
    createdBefore?: string;
    /** 最后执行时间范围过滤 */
    lastExecutedAfter?: string;
    lastExecutedBefore?: string;
    /** 是否包含已删除的工作流 */
    includeDeleted?: boolean;
    /** 最小执行次数 */
    minExecutionCount?: number;
    /** 最大执行次数 */
    maxExecutionCount?: number;
    /** 最小成功率 */
    minSuccessRate?: number;
    /** 最大成功率 */
    maxSuccessRate?: number;
  };
  /** 排序条件 */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'lastExecutedAt' | 'executionCount' | 'successRate';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页参数 */
  pagination?: {
    /** 页码 */
    page: number;
    /** 每页大小 */
    size: number;
  };
  /** 是否包含摘要信息 */
  includeSummary?: boolean;
}
