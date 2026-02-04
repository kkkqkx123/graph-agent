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
  /** 是否启用版本管理 */
  enableVersioning?: boolean;
  /** 最大版本数 */
  maxVersions?: number;
  /** 自定义WorkflowRegistry */
  workflowRegistry?: any;
  /** 自定义ThreadRegistry */
  threadRegistry?: any;
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