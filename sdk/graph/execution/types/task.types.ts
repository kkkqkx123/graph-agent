/**
 * 任务队列和线程池相关类型定义
 *
 * 设计原则：
 * - 简洁明了的类型定义
 * - 支持同步和异步执行模式
 * - 提供完整的任务生命周期状态
 */

import type { ThreadEntity } from '../../../core/entities/thread-entity.js';
import type { ThreadResult } from '@modular-agent/types';

/**
 * 任务状态
 */
export type TaskStatus =
  | 'QUEUED'      /** 已排队，等待执行 */
  | 'RUNNING'     /** 正在执行 */
  | 'COMPLETED'   /** 执行完成 */
  | 'FAILED'      /** 执行失败 */
  | 'CANCELLED'   /** 已取消 */
  | 'TIMEOUT';    /** 执行超时 */

/**
 * 执行器状态
 */
export type WorkerStatus =
  | 'IDLE'           /** 空闲，可以接受新任务 */
  | 'BUSY'           /** 忙碌，正在执行任务 */
  | 'SHUTTING_DOWN'; /** 正在关闭 */

/**
 * 任务信息接口
 */
export interface TaskInfo {
  /** 任务 ID */
  id: string;
  /** 线程实体 */
  threadEntity: ThreadEntity;
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
 * 执行器包装接口（内部使用）
 */
export interface ExecutorWrapper {
  /** 执行器 ID */
  executorId: string;
  /** 执行器实例 */
  executor: any;
  /** 执行器状态 */
  status: WorkerStatus;
  /** 当前任务 ID（如果正在执行） */
  currentTaskId?: string;
  /** 最后使用时间 */
  lastUsedTime: number;
  /** 空闲超时定时器 */
  idleTimer?: NodeJS.Timeout;
}

/**
 * 线程池配置接口
 *
 * 用于配置 ThreadPoolService 的行为
 */
export interface ThreadPoolConfig {
  /** 最小执行器数 */
  minExecutors?: number;
  /** 最大执行器数 */
  maxExecutors?: number;
  /** 空闲超时时间（毫秒），超过此时间空闲执行器将被回收 */
  idleTimeout?: number;
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number;
}
