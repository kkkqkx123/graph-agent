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
    /** 创建时间范围过滤 */
    createdAfter?: string;
    createdBefore?: string;
  };
  /** 是否包含使用次数 */
  includeUsageCount?: boolean;
  /** 是否按使用频率排序 */
  sortByUsage?: boolean;
}