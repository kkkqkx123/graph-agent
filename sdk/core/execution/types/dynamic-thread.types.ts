/**
 * 动态线程相关类型定义
 * 
 * 设计原则：
 * - 简洁明了的类型定义
 * - 支持同步和异步执行模式
 * - 提供完整的动态线程生命周期状态
 */

import type { ThreadContext } from '../context/thread-context.js';
import type { ThreadResult } from '@modular-agent/types';
import { TaskStatus } from './task.types.js';

/**
 * 动态线程信息接口
 */
export interface DynamicThreadInfo {
  /** 线程ID */
  id: string;
  /** 线程上下文 */
  threadContext: ThreadContext;
  /** 线程状态 */
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
  /** 父线程ID */
  parentThreadId?: string;
}

/**
 * 回调信息接口
 */
export interface CallbackInfo {
  /** 线程ID */
  threadId: string;
  /** Promise resolve函数 */
  resolve: (value: ExecutedThreadResult) => void;
  /** Promise reject函数 */
  reject: (error: Error) => void;
  /** 事件监听器数组 */
  eventListeners: Array<(event: DynamicThreadEvent) => void>;
  /** 注册时间 */
  registeredAt: number;
}

/**
 * 同步执行结果接口
 */
export interface ExecutedThreadResult {
  /** 线程上下文 */
  threadContext: ThreadContext;
  /** 线程执行结果 */
  threadResult: ThreadResult;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 异步执行结果接口
 */
export interface ThreadSubmissionResult {
  /** 线程ID */
  threadId: string;
  /** 线程状态 */
  status: TaskStatus;
  /** 状态消息 */
  message: string;
  /** 提交时间（毫秒） */
  submitTime: number;
}

/**
 * 动态线程配置接口
 */
export interface DynamicThreadConfig {
  /**
   * 是否等待完成
   * - true: 同步执行，调用者会阻塞直到线程完成
   * - false: 异步执行，调用者立即返回，线程在后台执行
   */
  waitForCompletion?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否记录历史 */
  recordHistory?: boolean;
  /** 元数据 */
  metadata?: any;
}

/**
 * 动态线程事件接口
 */
export interface DynamicThreadEvent {
  /** 事件类型 */
  type: DynamicThreadEventType;
  /** 线程ID */
  threadId: string;
  /** 事件时间 */
  timestamp: number;
  /** 事件数据 */
  data?: any;
}

/**
 * 动态线程事件类型
 */
export type DynamicThreadEventType =
  | 'DYNAMIC_THREAD_SUBMITTED'   /** 线程已提交 */
  | 'DYNAMIC_THREAD_STARTED'     /** 线程已开始 */
  | 'DYNAMIC_THREAD_COMPLETED'   /** 线程已完成 */
  | 'DYNAMIC_THREAD_FAILED'      /** 线程失败 */
  | 'DYNAMIC_THREAD_CANCELLED'   /** 线程已取消 */
  | 'DYNAMIC_THREAD_TIMEOUT';    /** 线程超时 */

/**
 * 创建动态线程请求接口
 */
export interface CreateDynamicThreadRequest {
  /** 工作流ID */
  workflowId: string;
  /** 输入数据 */
  input: Record<string, any>;
  /** 触发器ID */
  triggerId: string;
  /** 主线程上下文 */
  mainThreadContext: ThreadContext;
  /** 配置选项 */
  config?: DynamicThreadConfig;
}