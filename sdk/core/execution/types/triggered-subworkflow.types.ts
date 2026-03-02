/**
 * 触发子工作流相关类型定义
 *
 * 设计原则：
 * - 简洁明了的类型定义
 * - 支持同步和异步执行模式
 * - 提供完整的触发子工作流生命周期状态
 */

import type { ID } from '@modular-agent/types';
import type { ThreadEntity } from '../../entities/thread-entity.js';
import type { ThreadResult } from '@modular-agent/types';
import { TaskStatus } from './task.types.js';

/**
 * 触发子工作流任务接口
 */
export interface TriggeredSubgraphTask {
  /** 子工作流 ID */
  subgraphId: ID;
  /** 输入数据 */
  input: Record<string, any>;
  /** 触发器 ID */
  triggerId: string;
  /** 主工作流线程实体 */
  mainThreadEntity: ThreadEntity;
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
  /** 子工作流实体 */
  subgraphEntity: ThreadEntity;
  /** 执行结果 */
  threadResult: ThreadResult;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 任务提交结果（异步执行）
 */
export interface TaskSubmissionResult {
  /** 任务 ID */
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
  /** 任务 ID */
  taskId: string;
  /** 线程实体 */
  threadEntity: ThreadEntity;
  /** Promise resolve 函数 */
  resolve: (value: ExecutedSubgraphResult) => void;
  /** Promise reject 函数 */
  reject: (error: Error) => void;
  /** 提交时间 */
  submitTime: number;
  /** 超时时间（毫秒） */
  timeout?: number;
}
