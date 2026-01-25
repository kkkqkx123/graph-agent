/**
 * Execution类型定义
 * 定义工作流执行相关的类型
 */

import { Thread, ThreadOptions, ThreadResult } from './thread';
import { WorkflowDefinition } from './workflow';

/**
 * 执行选项类型
 */
export interface ExecutionOptions {
  /** 工作流定义 */
  workflow: WorkflowDefinition;
  /** 线程选项 */
  threadOptions?: ThreadOptions;
  /** 是否启用事件监听 */
  enableEvents?: boolean;
  /** 是否启用日志记录 */
  enableLogging?: boolean;
  /** 自定义执行上下文 */
  context?: Record<string, any>;
}

/**
 * 执行结果类型
 */
export interface ExecutionResult {
  /** 执行是否成功 */
  success: boolean;
  /** 线程结果 */
  threadResult: ThreadResult;
  /** 执行元数据 */
  metadata: ExecutionMetadata;
}

/**
 * 执行元数据类型
 */
export interface ExecutionMetadata {
  /** 执行ID */
  executionId: string;
  /** 工作流ID */
  workflowId: string;
  /** 线程ID */
  threadId: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 执行时长（毫秒） */
  duration: number;
  /** 执行步数 */
  steps: number;
  /** 执行的节点数量 */
  nodesExecuted: number;
  /** 执行的边数量 */
  edgesTraversed: number;
  /** 是否使用了检查点 */
  usedCheckpoints: boolean;
  /** 检查点数量 */
  checkpointCount: number;
  /** 自定义字段 */
  customFields?: Record<string, any>;
}

/**
 * 执行上下文类型
 */
export interface ExecutionContext {
  /** 工作流定义 */
  workflow: WorkflowDefinition;
  /** 当前线程 */
  thread: Thread;
  /** 执行选项 */
  options: ExecutionOptions;
  /** 执行元数据 */
  metadata: ExecutionMetadata;
  /** 自定义上下文数据 */
  contextData: Record<string, any>;
}

/**
 * 执行状态类型
 */
export enum ExecutionState {
  /** 未开始 */
  NOT_STARTED = 'NOT_STARTED',
  /** 执行中 */
  RUNNING = 'RUNNING',
  /** 已暂停 */
  PAUSED = 'PAUSED',
  /** 已完成 */
  COMPLETED = 'COMPLETED',
  /** 已失败 */
  FAILED = 'FAILED',
  /** 已取消 */
  CANCELLED = 'CANCELLED',
  /** 超时 */
  TIMEOUT = 'TIMEOUT'
}