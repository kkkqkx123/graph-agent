/**
 * 工作流统计信息DTO
 */
export interface WorkflowStatisticsDto {
  /** 总工作流数 */
  totalWorkflows: number;
  /** 草稿工作流数 */
  draftWorkflows: number;
  /** 活跃工作流数 */
  activeWorkflows: number;
  /** 非活跃工作流数 */
  inactiveWorkflows: number;
  /** 归档工作流数 */
  archivedWorkflows: number;
  /** 总执行次数 */
  totalExecutions: number;
  /** 总成功次数 */
  totalSuccesses: number;
  /** 总失败次数 */
  totalFailures: number;
  /** 平均成功率 */
  averageSuccessRate: number;
  /** 平均执行时间（秒） */
  averageExecutionTime: number;
  /** 按状态分组的工作流数 */
  workflowsByStatus: Record<string, number>;
  /** 按类型分组的工作流数 */
  workflowsByType: Record<string, number>;
  /** 标签统计 */
  tagStatistics: Record<string, number>;
}
