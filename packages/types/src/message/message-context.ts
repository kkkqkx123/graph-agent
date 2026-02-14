/**
 * 消息操作上下文类型定义
 * 定义消息操作所需的上下文信息
 */

import type { LLMMessage } from './message';
import type { MessageMarkMap } from './message-mark-map';

/**
 * 消息操作上下文
 * 包含执行消息操作所需的所有信息
 */
export interface MessageOperationContext {
  /** 消息数组 */
  messages: LLMMessage[];
  /** 消息标记映射 */
  markMap: MessageMarkMap;
  /** 操作选项 */
  options?: {
    /** 是否只操作可见消息 */
    visibleOnly?: boolean;
    /** 是否自动创建新批次 */
    autoCreateBatch?: boolean;
  };
}