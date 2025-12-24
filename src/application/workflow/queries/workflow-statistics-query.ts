/**
 * 获取工作流统计信息查询
 */
export interface GetWorkflowStatisticsQuery {
  /** 工作流ID */
  workflowId?: string;
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
    /** 标签过滤 */
    tags?: string[];
  };
}