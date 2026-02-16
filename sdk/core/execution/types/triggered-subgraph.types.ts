/**
 * 触发子工作流相关类型定义
 * 
 * 设计原则：
 * - 简洁明了的类型定义
 * - 支持同步和异步执行模式
 * - 提供完整的触发子工作流生命周期状态
 */

import type { ID } from '@modular-agent/types';
import type { ThreadContext } from '../context/thread-context';
import type { ThreadResult } from '@modular-agent/types';
import { TaskStatus } from './task.types';

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