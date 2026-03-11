/**
 * 核心API类型定义
 * 定义核心执行相关的类型
 */

import type { UserInteractionHandler } from '@modular-agent/types';
import type { ThreadOptions } from '@modular-agent/types';

/**
 * SDK选项
 */
export interface SDKOptions {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** 默认超时时间（毫秒） */
  defaultTimeout?: number;
  /** 是否启用检查点 */
  enableCheckpoints?: boolean;
  /** 检查点存储回调接口（由应用层实现） */
  checkpointStorageCallback?: any;
  /** 是否启用验证 */
  enableValidation?: boolean;
}

/**
 * SDK依赖项
 */
export interface SDKDependencies {
  /** 工作流注册表 */
  workflowRegistry?: any;
  /** 线程注册表 */
  threadRegistry?: any;
  /** 工具注册表 */
  toolRegistry?: any;
  /** 脚本注册表 */
  scriptRegistry?: any;
  /** 事件管理器 */
  eventManager?: any;
  /** 检查点存储回调接口（由应用层实现） */
  checkpointStorageCallback?: any;
}

export type { ThreadOptions };
