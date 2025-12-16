/**
 * 工作流执行结果DTO
 */
export interface WorkflowExecutionResultDto {
  /** 执行ID */
  executionId: string;
  /** 工作流ID */
  workflowId: string;
  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime?: string;
  /** 执行持续时间（毫秒） */
  duration?: number;
  /** 执行输出 */
  output: Record<string, unknown>;
  /** 执行错误 */
  error?: string;
  /** 执行日志 */
  logs: Array<{
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: string;
    nodeId?: string;
    edgeId?: string;
  }>;
  /** 执行统计信息 */
  statistics: {
    /** 执行节点数 */
    executedNodes: number;
    /** 总节点数 */
    totalNodes: number;
    /** 执行边数 */
    executedEdges: number;
    /** 总边数 */
    totalEdges: number;
    /** 执行路径 */
    executionPath: string[];
  };
  /** 执行元数据 */
  metadata: Record<string, unknown>;
}
