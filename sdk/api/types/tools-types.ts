/**
 * 工具API类型定义
 * 定义工具服务相关的类型
 */

import type { ToolType } from '../../types/tool';

/**
 * 工具过滤器
 */
export interface ToolFilter {
  /** 工具名称 */
  name?: string;
  /** 工具类型 */
  type?: ToolType;
  /** 工具分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
}

/**
 * 工具执行选项
 */
export interface ToolOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否启用日志 */
  enableLogging?: boolean;
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  /** 执行是否成功 */
  success: boolean;
  /** 执行结果数据 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 工具名称 */
  toolName: string;
}

/**
 * 工具测试结果
 */
export interface ToolTestResult {
  /** 测试是否通过 */
  passed: boolean;
  /** 测试结果数据 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 测试时间（毫秒） */
  testTime: number;
  /** 工具名称 */
  toolName: string;
}