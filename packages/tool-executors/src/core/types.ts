/**
 * 核心类型定义
 */

import type { Tool } from '@modular-agent/types';

/**
 * 执行器类型
 */
export type ExecutorType =
  | 'MCP'       /** MCP执行器 */
  | 'REST'      /** REST执行器 */
  | 'STATEFUL'  /** 有状态执行器 */
  | 'STATELESS';/** 无状态执行器 */

/**
 * 执行器配置
 */
export interface ExecutorConfig {
  /** 执行器类型 */
  type: ExecutorType;
  /** 是否启用重试 */
  enableRetry?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否使用指数退避 */
  exponentialBackoff?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 执行器元数据
 */
export interface ExecutorMetadata {
  /** 执行器类型 */
  type: ExecutorType;
  /** 执行器名称 */
  name: string;
  /** 版本 */
  version: string;
  /** 描述 */
  description?: string;
  /** 支持的工具类型 */
  supportedToolTypes: string[];
}