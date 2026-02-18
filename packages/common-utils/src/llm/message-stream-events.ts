/**
 * MessageStream 事件类型定义
 * 定义消息流相关的事件类型
 * 由于需要导入llm type且仅内部使用，不适合集中在全局定义中
 */

import type { LLMMessage } from '@modular-agent/types';

/**
 * 消息流事件类型
 */
export type MessageStreamEventType =
  | 'connect'           /** 连接建立 */
  | 'streamEvent'       /** 流事件（原始事件+快照） */
  | 'text'              /** 文本增量 */
  | 'inputJson'         /** 工具参数实时解析 */
  | 'message'           /** 完整消息接收 */
  | 'finalMessage'      /** 最终消息确认 */
  | 'error'             /** 错误 */
  | 'abort'             /** 中止 */
  | 'end';              /** 结束 */

/**
 * 消息流事件类型
 */
export type MessageStreamEvent =
  | MessageStreamConnectEvent
  | MessageStreamStreamEvent
  | MessageStreamTextEvent
  | MessageStreamInputJsonEvent
  | MessageStreamMessageEvent
  | MessageStreamFinalMessageEvent
  | MessageStreamErrorEvent
  | MessageStreamAbortEvent
  | MessageStreamEndEvent;

/**
 * 消息流连接事件
 */
export interface MessageStreamConnectEvent {
  type: 'connect';
}

/**
 * connect 事件监听器类型（展开参数）
 */
export type ConnectEventListener = () => void;

/**
 * 消息流事件（原始事件+快照）
 */
export interface MessageStreamStreamEvent {
  type: 'streamEvent';
  event: {
    type: string;
    data: any;
  };
  snapshot: LLMMessage;
}

/**
 * streamEvent 事件监听器类型（展开参数）
 */
export type StreamEventListener = (event: { type: string; data: any }, snapshot: LLMMessage) => void;

/**
 * 消息流文本增量事件
 */
export interface MessageStreamTextEvent {
  type: 'text';
  delta: string;
  snapshot: string;
}

/**
 * 文本事件监听器类型（展开参数）
 */
export type TextEventListener = (delta: string, snapshot: string) => void;

/**
 * 消息流工具参数实时解析事件
 */
export interface MessageStreamInputJsonEvent {
  type: 'inputJson';
  partialJson: string;
  parsedSnapshot: unknown;
  snapshot: LLMMessage;
}

/**
 * inputJson 事件监听器类型（展开参数）
 */
export type InputJsonEventListener = (partialJson: string, parsedSnapshot: unknown, snapshot: LLMMessage) => void;

/**
 * 消息流完整消息事件
 */
export interface MessageStreamMessageEvent {
  type: 'message';
  message: LLMMessage;
}

/**
 * message 事件监听器类型（展开参数）
 */
export type MessageEventListener = (message: LLMMessage) => void;

/**
 * 消息流最终消息事件
 */
export interface MessageStreamFinalMessageEvent {
  type: 'finalMessage';
  message: LLMMessage;
}

/**
 * finalMessage 事件监听器类型（展开参数）
 */
export type FinalMessageEventListener = (message: LLMMessage) => void;

/**
 * 消息流错误事件
 */
export interface MessageStreamErrorEvent {
  type: 'error';
  error: Error;
}

/**
 * error 事件监听器类型（展开参数）
 */
export type ErrorEventListener = (error: Error) => void;

/**
 * 消息流中止事件
 */
export interface MessageStreamAbortEvent {
  type: 'abort';
  reason?: string;
}

/**
 * abort 事件监听器类型（展开参数）
 */
export type AbortEventListener = (reason?: string) => void;

/**
 * 消息流结束事件
 */
export interface MessageStreamEndEvent {
  type: 'end';
}

/**
 * end 事件监听器类型（展开参数）
 */
export type EndEventListener = () => void;