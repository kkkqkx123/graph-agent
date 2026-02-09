/**
 * 核心API类型定义
 * 定义核心执行相关的类型
 */

import type { UserInteractionHandler } from '../../types/interaction';
import type { ThreadOptions } from '../../types/thread';
import type { ExecutionContext } from '../../core/execution/context/execution-context';

/**
 * SDK配置选项
 */
export interface SDKOptions {
  /** 自定义WorkflowRegistry */
  workflowRegistry?: any;
  /** 自定义ThreadRegistry */
  threadRegistry?: any;
  
  // API配置选项
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存过期时间（毫秒） */
  cacheTTL?: number;
  /** 是否启用验证 */
  enableValidation?: boolean;
  /** 是否启用日志 */
  enableLogging?: boolean;
}

/**
 * SDK依赖注入配置
 * 用于测试和自定义配置
 */
export interface SDKDependencies {
  /** 自定义WorkflowRegistry */
  workflowRegistry?: any;
  /** 自定义ThreadRegistry */
  threadRegistry?: any;
  /** 自定义ExecutionContext */
  executionContext?: ExecutionContext;
}

// 重新导出ThreadOptions供API层使用
export type { ThreadOptions };