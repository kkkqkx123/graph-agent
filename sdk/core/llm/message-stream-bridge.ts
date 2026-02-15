/**
 * MessageStream 事件桥接器
 * 将 MessageStream 事件转换为 SDK EventManager 事件
 */

import {
  MessageStream,
  MessageStreamEventType,
  type MessageStreamAbortEvent,
  type MessageStreamErrorEvent
} from '@modular-agent/common-utils';
import type { EventManager } from '../services/event-manager';
import { EventType } from '@modular-agent/types';
import { now } from '@modular-agent/common-utils';
import { safeEmit } from '../execution/utils/event/event-emitter';

/**
 * 桥接器上下文
 */
export interface MessageStreamBridgeContext {
  /** 线程ID */
  threadId?: string;
  /** 节点ID */
  nodeId?: string;
  /** 工作流ID */
  workflowId?: string;
}

/**
 * MessageStream 事件桥接器
 *
 * 职责：
 * - 监听 MessageStream 事件
 * - 将 MessageStream 事件转换为 SDK EventManager 事件
 * - 管理事件监听器的生命周期
 *
 * 设计原则：
 * - 保持 MessageStream 独立，不依赖 SDK
 * - 集中管理事件转换逻辑
 * - 自动清理资源，避免内存泄漏
 */
export class MessageStreamBridge {
  private destroyed: boolean = false;
  private abortListener: ((event: MessageStreamAbortEvent) => void) | null = null;
  private errorListener: ((event: MessageStreamErrorEvent) => void) | null = null;

  constructor(
    private messageStream: MessageStream,
    private eventManager: EventManager,
    private context: MessageStreamBridgeContext
  ) {
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听 ABORT 事件
    this.abortListener = (event: MessageStreamAbortEvent) => {
      if (this.destroyed) return;
      
      safeEmit(this.eventManager, {
        type: EventType.LLM_STREAM_ABORTED,
        timestamp: now(),
        workflowId: this.context.workflowId || '',
        threadId: this.context.threadId || '',
        nodeId: this.context.nodeId || '',
        reason: event.reason || 'Stream aborted'
      });
    };
    this.messageStream.on(MessageStreamEventType.ABORT, this.abortListener);

    // 监听 ERROR 事件
    this.errorListener = (event: MessageStreamErrorEvent) => {
      if (this.destroyed) return;
      
      safeEmit(this.eventManager, {
        type: EventType.LLM_STREAM_ERROR,
        timestamp: now(),
        workflowId: this.context.workflowId || '',
        threadId: this.context.threadId || '',
        nodeId: this.context.nodeId || '',
        error: event.error.message
      });
    };
    this.messageStream.on(MessageStreamEventType.ERROR, this.errorListener);

    // 可以在这里添加更多事件监听器
    // 例如：TEXT, TOOL_CALL, MESSAGE 等
  }

  /**
   * 销毁桥接器，移除所有事件监听器
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    // 移除所有事件监听器
    if (this.abortListener) {
      this.messageStream.off(MessageStreamEventType.ABORT, this.abortListener);
      this.abortListener = null;
    }
    if (this.errorListener) {
      this.messageStream.off(MessageStreamEventType.ERROR, this.errorListener);
      this.errorListener = null;
    }
    // 可以在这里移除其他监听器
  }
}