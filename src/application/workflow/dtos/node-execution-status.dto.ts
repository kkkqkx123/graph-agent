/**
 * 节点执行状态DTO
 */
export interface NodeExecutionStatusDto {
  /** 节点ID */
  nodeId: string;
  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 执行持续时间（毫秒） */
  duration?: number;
  /** 执行结果 */
  result?: Record<string, unknown>;
  /** 执行错误 */
  error?: string;
  /** 重试次数 */
  retryCount: number;
  /** 执行日志 */
  logs: Array<{
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: string;
  }>;
}