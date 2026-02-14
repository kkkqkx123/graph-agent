/**
 * 线程执行相关类型定义
 */

import type { ID, Timestamp } from '../common';
import type { ThreadStatus } from './status';
import type { NodeExecutionResult } from './history';

/**
 * 线程执行选项类型
 */
export interface ThreadOptions {
  /** 输入数据对象 */
  input?: Record<string, any>;
  /** 最大执行步数 */
  maxSteps?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否启用检查点 */
  enableCheckpoints?: boolean;
  /** Token 限制阈值 */
  tokenLimit?: number;
  /** 节点执行完成回调 */
  onNodeExecuted?: (result: NodeExecutionResult) => void | Promise<void>;
  /** 工具调用回调 */
  onToolCalled?: (toolName: string, parameters: any) => void | Promise<void>;
  /** 错误回调 */
  onError?: (error: any) => void | Promise<void>;
}

/**
 * 线程执行结果类型
 *
 * 设计原则：
 * - 使用 status 字段表示执行状态，而非冗余的 success 字段
 * - 错误通过 errors 数组存储，metadata 中提供错误计数
 * - 调用方通过 status 判断成功/失败
 */
export interface ThreadResult {
  /** 线程ID */
  threadId: ID;
  /** 输出数据 */
  output: Record<string, any>;
  /** 执行时间（毫秒） */
  executionTime: Timestamp;
  /** 节点执行结果数组 */
  nodeResults: NodeExecutionResult[];
  /** 执行元数据 */
  metadata: ThreadResultMetadata;
}

/**
 * 线程执行结果元数据
 */
export interface ThreadResultMetadata {
  /** 线程状态 */
  status: ThreadStatus;
  /** 开始时间 */
  startTime: Timestamp;
  /** 结束时间 */
  endTime: Timestamp;
  /** 执行时间（毫秒） */
  executionTime: Timestamp;
  /** 节点数量 */
  nodeCount: number;
  /** 错误数量 */
  errorCount: number;
}