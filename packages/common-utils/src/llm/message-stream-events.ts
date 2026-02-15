/**
 * MessageStream 事件类型定义
 * 定义消息流相关的事件类型
 * 由于需要导入llm type且仅内部使用，不适合集中在全局定义中
 */

import type { LLMMessage, LLMResult } from '@modular-agent/types';

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
  END = 'end',
  
  // 新增事件类型
  /** 引用事件 */
  CITATION = 'citation',
  /** 思考事件 */
  THINKING = 'thinking',
  /** 签名事件 */
  SIGNATURE = 'signature',
  /** 输入 JSON 事件 */
  INPUT_JSON = 'inputJson',
  /** 内容块开始事件 */
  CONTENT_BLOCK_START = 'contentBlockStart',
  /** 内容块停止事件 */
  CONTENT_BLOCK_STOP = 'contentBlockStop'
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
  | MessageStreamEndEvent
  // 新增事件类型
  | MessageStreamCitationEvent
  | MessageStreamThinkingEvent
  | MessageStreamSignatureEvent
  | MessageStreamInputJsonEvent
  | MessageStreamContentBlockStartEvent
  | MessageStreamContentBlockStopEvent;

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

/**
 * 引用位置类型
 */
export type CitationLocationType =
  | 'char_location'
  | 'page_location'
  | 'content_block_location'
  | 'web_search_result_location'
  | 'search_result_location';

/**
 * 引用位置
 */
export interface CitationLocation {
  /** 引用的文本 */
  cited_text: string;
  /** 文档索引 */
  document_index: number;
  /** 文档标题 */
  document_title: string | null;
  /** 位置类型 */
  type: CitationLocationType;
  /** 文件 ID（可选） */
  file_id?: string;
}

/**
 * 字符位置引用
 */
export interface CitationCharLocation extends CitationLocation {
  type: 'char_location';
  /** 起始字符索引 */
  start_char_index: number;
  /** 结束字符索引 */
  end_char_index: number;
}

/**
 * 页面位置引用
 */
export interface CitationPageLocation extends CitationLocation {
  type: 'page_location';
  /** 起始页码 */
  start_page_number: number;
  /** 结束页码 */
  end_page_number: number;
}

/**
 * 内容块位置引用
 */
export interface CitationContentBlockLocation extends CitationLocation {
  type: 'content_block_location';
  /** 起始块索引 */
  start_block_index: number;
  /** 结束块索引 */
  end_block_index: number;
}

/**
 * Web 搜索结果位置引用
 */
export interface CitationWebSearchResultLocation extends CitationLocation {
  type: 'web_search_result_location';
  /** 加密内容 */
  encrypted_content: string;
  /** URL */
  url: string;
  /** 页面年龄（可选） */
  page_age?: string | null;
}

/**
 * 搜索结果位置引用
 */
export interface CitationSearchResultLocation extends CitationLocation {
  type: 'search_result_location';
  /** 起始块索引 */
  start_block_index: number;
  /** 搜索结果索引 */
  search_result_index: number;
  /** 来源 */
  source: string;
  /** 标题 */
  title: string | null;
}

/**
 * 引用类型
 */
export type TextCitation =
  | CitationCharLocation
  | CitationPageLocation
  | CitationContentBlockLocation
  | CitationWebSearchResultLocation
  | CitationSearchResultLocation;

/**
 * 消息流引用事件
 */
export interface MessageStreamCitationEvent {
  type: MessageStreamEventType.CITATION;
  /** 引用信息 */
  citation: TextCitation;
  /** 所有引用的快照 */
  citationsSnapshot: TextCitation[];
}

/**
 * 消息流思考事件
 */
export interface MessageStreamThinkingEvent {
  type: MessageStreamEventType.THINKING;
  /** 思考增量 */
  thinkingDelta: string;
  /** 思考快照 */
  thinkingSnapshot: string;
}

/**
 * 消息流签名事件
 */
export interface MessageStreamSignatureEvent {
  type: MessageStreamEventType.SIGNATURE;
  /** 签名 */
  signature: string;
}

/**
 * 消息流输入 JSON 事件
 */
export interface MessageStreamInputJsonEvent {
  type: MessageStreamEventType.INPUT_JSON;
  /** 部分 JSON */
  partialJson: string;
  /** JSON 快照 */
  jsonSnapshot: unknown;
}

/**
 * 消息流内容块开始事件
 */
export interface MessageStreamContentBlockStartEvent {
  type: MessageStreamEventType.CONTENT_BLOCK_START;
  /** 内容块索引 */
  index: number;
  /** 内容块 */
  contentBlock: {
    type: 'text' | 'tool_use' | 'thinking' | 'image' | 'document';
    [key: string]: any;
  };
}

/**
 * 消息流内容块停止事件
 */
export interface MessageStreamContentBlockStopEvent {
  type: MessageStreamEventType.CONTENT_BLOCK_STOP;
  /** 内容块索引 */
  index: number;
}