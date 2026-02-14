/**
 * 工具执行相关类型定义
 */

import type { ID, Timestamp } from '../common';
import type { Tool } from './definition';

/**
 * 工具调用记录类型
 */
export interface ToolCall {
  /** 工具调用ID */
  id: ID;
  /** 工具名称 */
  toolName: string;
  /** 工具参数 */
  parameters: Record<string, any>;
  /** 调用结果 */
  result?: any;
  /** 错误信息 */
  error?: any;
  /** 调用时间 */
  timestamp: Timestamp;
  /** 执行时间（毫秒） */
  executionTime?: Timestamp;
}

/**
 * 工具执行选项
 */
export interface ToolExecutionOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否启用指数退避 */
  exponentialBackoff?: boolean;
  /** 中止信号（用于取消执行） */
  signal?: AbortSignal;
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 重试次数 */
  retryCount: number;
}

/**
 * 工具执行器接口
 * 所有工具执行器都必须实现此接口
 */
export interface IToolExecutor {
  /**
   * 执行工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param options 执行选项
   * @param threadContext 线程上下文（可选）
   * @returns 标准化的执行结果
   */
  execute(
    tool: Tool,
    parameters: Record<string, any>,
    options?: ToolExecutionOptions,
    threadContext?: any
  ): Promise<ToolExecutionResult>;
}