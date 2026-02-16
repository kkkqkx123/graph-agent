/**
 * 任务队列和线程池相关类型定义
 * 
 * 设计原则：
 * - 简洁明了的类型定义
 * - 支持同步和异步执行模式
 * - 提供完整的任务生命周期状态
 */

import type { ID } from '@modular-agent/types';
import type { ThreadContext } from '../context/thread-context';
import type { ThreadResult } from '@modular-agent/types';

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  /** 已排队，等待执行 */
  QUEUED = 'QUEUED',
  /** 正在执行 */
  RUNNING = 'RUNNING',
  /** 执行完成 */
  COMPLETED = 'COMPLETED',
  /** 执行失败 */
  FAILED = 'FAILED',
  /** 已取消 */
  CANCELLED = 'CANCELLED',
  /** 执行超时 */
  TIMEOUT = 'TIMEOUT'
}

/**
 * 执行器状态枚举
 */
export enum WorkerStatus {
  /** 空闲，可以接受新任务 */
  IDLE = 'IDLE',
  /** 忙碌，正在执行任务 */
  BUSY = 'BUSY',
  /** 正在关闭 */
  SHUTTING_DOWN = 'SHUTTING_DOWN'
}

/**
 * 触发子工作流任务接口
 */
export interface TriggeredSubgraphTask {
  /** 子工作流ID */
  subgraphId: ID;
  /** 输入数据 */
  input: Record<string, any>;
  /** 触发器ID */
  triggerId: string;
  /** 主工作流线程上下文 */
  mainThreadContext: ThreadContext;
  /** 配置选项 */
  config?: {
    /**
     * 是否等待子工作流完成
     * - true: 同步执行（默认），调用者会阻塞直到子工作流完成
     * - false: 异步执行，调用者立即返回，子工作流在后台执行
     */
    waitForCompletion?: boolean;
    /** 超时时间（毫秒） */
    timeout?: number;
    /** 是否记录历史 */
    recordHistory?: boolean;
    /** 元数据 */
    metadata?: any;
  };
}

/**
 * 执行单个触发子工作流的返回结果（同步执行）
 */
export interface ExecutedSubgraphResult {
  /** 子工作流上下文 */
  subgraphContext: ThreadContext;
  /** 执行结果 */
  threadResult: ThreadResult;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 任务提交结果（异步执行）
 */
export interface TaskSubmissionResult {
  /** 任务ID */
  taskId: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 消息 */
  message: string;
  /** 提交时间（毫秒） */
  submitTime: number;
}

/**
 * 任务信息接口
 */
export interface TaskInfo {
  /** 任务ID */
  id: string;
  /** 线程上下文 */
  threadContext: ThreadContext;
  /** 任务状态 */
  status: TaskStatus;
  /** 提交时间 */
  submitTime: number;
  /** 开始执行时间 */
  startTime?: number;
  /** 完成时间 */
  completeTime?: number;
  /** 执行结果（成功时） */
  result?: ThreadResult;
  /** 错误信息（失败时） */
  error?: Error;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 队列统计接口
 */
export interface QueueStats {
  /** 待执行队列长度 */
  pendingCount: number;
  /** 运行中任务数 */
  runningCount: number;
  /** 已完成任务数 */
  completedCount: number;
  /** 失败任务数 */
  failedCount: number;
  /** 取消任务数 */
  cancelledCount: number;
}

/**
 * 线程池统计接口
 */
export interface PoolStats {
  /** 总执行器数 */
  totalExecutors: number;
  /** 空闲执行器数 */
  idleExecutors: number;
  /** 忙碌执行器数 */
  busyExecutors: number;
  /** 最小执行器数 */
  minExecutors: number;
  /** 最大执行器数 */
  maxExecutors: number;
}

/**
 * 子工作流管理器配置接口
 */
export interface SubworkflowManagerConfig {
  /** 最小执行器数 */
  minExecutors?: number;
  /** 最大执行器数 */
  maxExecutors?: number;
  /** 空闲超时时间（毫秒），超过此时间空闲执行器将被回收 */
  idleTimeout?: number;
  /** 最大队列长度 */
  maxQueueSize?: number;
  /** 任务保留时间（毫秒），已完成任务保留时间 */
  taskRetentionTime?: number;
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number;
}

/**
 * 队列任务接口（内部使用）
 */
export interface QueueTask {
  /** 任务ID */
  taskId: string;
  /** 线程上下文 */
  threadContext: ThreadContext;
  /** Promise resolve函数 */
  resolve: (value: ExecutedSubgraphResult) => void;
  /** Promise reject函数 */
  reject: (error: Error) => void;
  /** 提交时间 */
  submitTime: number;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 执行器包装接口（内部使用）
 */
export interface ExecutorWrapper {
  /** 执行器ID */
  executorId: string;
  /** 执行器实例 */
  executor: any;
  /** 执行器状态 */
  status: WorkerStatus;
  /** 当前任务ID（如果正在执行） */
  currentTaskId?: string;
  /** 最后使用时间 */
  lastUsedTime: number;
  /** 空闲超时定时器 */
  idleTimer?: NodeJS.Timeout;
}