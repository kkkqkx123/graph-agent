/**
 * 对话相关事件类型定义
 */

import type { ID } from '../common';
import type { BaseEvent, EventType } from './base';

/**
 * 消息添加事件类型
 */
export interface MessageAddedEvent extends BaseEvent {
  type: EventType.MESSAGE_ADDED;
  /** 节点ID */
  nodeId?: ID;
  /** 消息角色 */
  role: string;
  /** 消息内容 */
  content: string;
  /** 工具调用（如果有） */
  toolCalls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

/**
 * 对话状态变更事件类型
 */
export interface ConversationStateChangedEvent extends BaseEvent {
  type: EventType.CONVERSATION_STATE_CHANGED;
  /** 节点ID */
  nodeId?: ID;
  /** 消息数量 */
  messageCount: number;
  /** Token使用量 */
  tokenUsage: number;
}