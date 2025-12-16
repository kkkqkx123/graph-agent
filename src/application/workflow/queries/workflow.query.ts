/**
 * 获取工作流查询
 */
export interface GetWorkflowQuery {
  /** 工作流ID */
  workflowId: string;
  /** 是否包含详细信息 */
  includeDetails?: boolean;
  /** 是否包含执行统计 */
  includeExecutionStats?: boolean;
}

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

/**
 * 获取工作流状态查询
 */
export interface GetWorkflowStatusQuery {
  /** 工作流ID */
  workflowId: string;
}

/**
 * 获取工作流执行历史查询
 */
export interface GetWorkflowExecutionHistoryQuery {
  /** 工作流ID */
  workflowId: string;
  /** 分页参数 */
  pagination?: {
    /** 页码 */
    page: number;
    /** 每页大小 */
    size: number;
  };
  /** 过滤条件 */
  filters?: {
    /** 执行状态过滤 */
    status?: string;
    /** 开始时间范围过滤 */
    startedAfter?: string;
    startedBefore?: string;
    /** 结束时间范围过滤 */
    endedAfter?: string;
    endedBefore?: string;
  };
  /** 排序条件 */
  sortBy?: 'startTime' | 'endTime' | 'duration';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 获取工作流统计信息查询
 */
export interface GetWorkflowStatisticsQuery {
  /** 过滤条件 */
  filters?: {
    /** 状态过滤 */
    status?: string;
    /** 类型过滤 */
    type?: string;
    /** 创建者过滤 */
    createdBy?: string;
    /** 创建时间范围过滤 */
    createdAfter?: string;
    createdBefore?: string;
  };
  /** 统计类型 */
  statisticsType?: 'basic' | 'detailed' | 'execution' | 'all';
}

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

/**
 * 获取工作流执行路径查询
 */
export interface GetWorkflowExecutionPathQuery {
  /** 工作流ID */
  workflowId: string;
  /** 执行ID */
  executionId?: string;
}

/**
 * 获取工作流标签统计查询
 */
export interface GetWorkflowTagStatsQuery {
  /** 过滤条件 */
  filters?: {
    /** 状态过滤 */
    status?: string;
    /** 类型过滤 */
    type?: string;
    /** 创建者过滤 */
    createdBy?: string;
  };
}