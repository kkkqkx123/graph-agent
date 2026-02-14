/**
 * 上下文处理器节点配置类型定义（批次感知）
 * 用于直接操作提示词消息数组，支持截断、插入、替换、过滤、清空等操作
 */

import type { MessageOperationConfig } from '../../message';

/**
 * 上下文处理器节点配置（批次感知）
 * 用于直接操作提示词消息数组，支持截断、插入、替换、过滤、清空等操作
 */
export interface ContextProcessorNodeConfig {
  /** 配置版本（可选，默认为4） */
  version?: number;
  /** 消息操作配置（批次感知） */
  operationConfig: MessageOperationConfig;
  /** 操作选项 */
  operationOptions?: {
    /** 是否只操作可见消息 */
    visibleOnly?: boolean;
    /** 是否自动创建新批次 */
    autoCreateBatch?: boolean;
  };
}