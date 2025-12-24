import { NodeExecutionStatusDto } from './node-execution-status.dto';

/**
 * 工作流执行状态DTO
 */
export interface WorkflowExecutionStatusDto {
  /** 工作流ID */
  workflowId: string;
  /** 执行ID */
  executionId: string;
  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime?: string;
  /** 执行持续时间（毫秒） */
  duration?: number;
  /** 当前节点ID */
  currentNodeId?: string;
  /** 已执行节点数 */
  executedNodes: number;
  /** 总节点数 */
  totalNodes: number;
  /** 已执行边数 */
  executedEdges: number;
  /** 总边数 */
  totalEdges: number;
  /** 执行路径 */
  executionPath: string[];
  /** 节点执行状态 */
  nodeStatuses: Record<string, NodeExecutionStatusDto>;
  /** 执行输出 */
  output: Record<string, unknown>;
  /** 执行错误 */
  error?: string;
  /** 执行统计信息 */
  statistics: {
    /** 平均节点执行时间（毫秒） */
    averageNodeExecutionTime: number;
    /** 最长节点执行时间（毫秒） */
    maxNodeExecutionTime: number;
    /** 最短节点执行时间（毫秒） */
    minNodeExecutionTime: number;
    /** 成功率 */
    successRate: number;
  };
}