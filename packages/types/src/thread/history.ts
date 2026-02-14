/**
 * 线程历史记录类型定义
 */

import type { ID, Timestamp } from '../common';

/**
 * 节点执行结果类型
 */
export interface NodeExecutionResult {
  /** 节点ID */
  nodeId: ID;
  /** 节点类型 */
  nodeType: string;
  /** 执行状态 */
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
  /** 执行步骤序号 */
  step: number;
  /** 错误信息 */
  error?: any;
  /** 执行时间（毫秒） */
  executionTime?: Timestamp;
  /** 开始时间 */
  startTime?: Timestamp;
  /** 结束时间 */
  endTime?: Timestamp;
  /** 时间戳 */
  timestamp?: Timestamp;
}

/**
 * 执行历史条目类型
 */
export interface ExecutionHistoryEntry {
  /** 执行步骤序号 */
  step: number;
  /** 节点ID */
  nodeId: ID;
  /** 节点类型 */
  nodeType: string;
  /** 执行状态 */
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
  /** 时间戳 */
  timestamp: Timestamp;
  /** 执行数据（用于追踪和调试） */
  data?: any;
  /** 错误信息 */
  error?: any;
}