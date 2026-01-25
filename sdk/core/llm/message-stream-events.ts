/**
 * MessageStream 事件类型定义
 * 定义消息流相关的事件类型
 * 由于需要导入llm type，不适合集中在全局定义中
 */

import type { LLMMessage, LLMResult } from '../../types/llm';

/**
 * 消息流事件类型枚举
 */
export enum MessageStreamEventType {
  /** 连接建立 */
  CONNECT = 'connect',
  /** 流事件 */
  STREAM_EVENT = 'streamEvent',
  /** 文本增量 */
  TEXT = 'text',
  /** 工具调用 */
  TOOL_CALL = 'toolCall',
  /** 消息 */
  MESSAGE = 'message',
  /** 最终消息 */
  FINAL_MESSAGE = 'finalMessage',
  /** 错误 */
  ERROR = 'error',
  /** 中止 */
  ABORT = 'abort',
  /** 结束 */
  END = 'end'
}

/**
 * 消息流事件类型
 */
export type MessageStreamEvent =
  | MessageStreamConnectEvent
  | MessageStreamStreamEvent
  | MessageStreamTextEvent
  | MessageStreamToolCallEvent
  | MessageStreamMessageEvent
  | MessageStreamFinalMessageEvent
  | MessageStreamErrorEvent
  | MessageStreamAbortEvent
  | MessageStreamEndEvent;

/**
 * 消息流连接建立事件
 */
export interface MessageStreamConnectEvent {
  type: MessageStreamEventType.CONNECT;
  requestId: string;
}

/**
 * 消息流事件
 */
export interface MessageStreamStreamEvent {
  type: MessageStreamEventType.STREAM_EVENT;
  event: {
    type: string;
    data: any;
  };
  snapshot: LLMMessage | null;
}

/**
 * 消息流文本增量事件
 */
export interface MessageStreamTextEvent {
  type: MessageStreamEventType.TEXT;
  delta: string;
  snapshot: string;
}

/**
 * 消息流工具调用事件
 */
export interface MessageStreamToolCallEvent {
  type: MessageStreamEventType.TOOL_CALL;
  toolCall: any;
  snapshot: LLMMessage;
}

/**
 * 消息流消息事件
 */
export interface MessageStreamMessageEvent {
  type: MessageStreamEventType.MESSAGE;
  message: LLMMessage;
}

/**
 * 消息流最终消息事件
 */
export interface MessageStreamFinalMessageEvent {
  type: MessageStreamEventType.FINAL_MESSAGE;
  message: LLMMessage;
  result: LLMResult;
}

/**
 * 消息流错误事件
 */
export interface MessageStreamErrorEvent {
  type: MessageStreamEventType.ERROR;
  error: Error;
}

/**
 * 消息流中止事件
 */
export interface MessageStreamAbortEvent {
  type: MessageStreamEventType.ABORT;
  reason?: string;
}

/**
 * 消息流结束事件
 */
export interface MessageStreamEndEvent {
  type: MessageStreamEventType.END;
}