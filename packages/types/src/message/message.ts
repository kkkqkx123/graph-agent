/**
 * 消息基础类型定义
 * 定义消息的核心数据结构
 */

/**
 * 消息角色枚举
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool'
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
 * 引用位置基础接口
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
 * 消息内容类型
 */
export type MessageContent = string | Array<{
  type: 'text' | 'image_url' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  /** 引用列表（仅用于 text 类型） */
  citations?: TextCitation[];
  image_url?: { url: string };
  tool_use?: {
    id: string;
    name: string;
    input: Record<string, any> | string; // 支持流式传输时的字符串
  };
  tool_result?: {
    tool_use_id: string;
    content: string | Array<{ type: string; text: string }>;
  };
  /** 思考内容（仅用于 thinking 类型） */
  thinking?: string;
  /** 签名（仅用于 thinking 类型） */
  signature?: string;
}>;

/**
 * 消息基础接口
 */
export interface Message {
  /** 消息角色 */
  role: MessageRole;
  /** 消息内容 */
  content: MessageContent;
  /** 消息ID（可选） */
  id?: string;
  /** 消息时间戳（可选） */
  timestamp?: number;
  /** 其他元数据 */
  metadata?: Record<string, any>;
}

/**
 * LLM工具调用类型
 */
export interface LLMToolCall {
  /** 工具调用ID */
  id: string;
  /** 类型（function） */
  type: 'function';
  /** 函数调用信息 */
  function: {
    /** 函数名称 */
    name: string;
    /** 函数参数（JSON字符串） */
    arguments: string;
  };
}

/**
 * LLM消息接口（扩展基础消息，添加LLM特有属性）
 */
export interface LLMMessage extends Message {
  /** 思考内容（Extended Thinking，仅用于assistant角色） */
  thinking?: string;
  /** 工具调用数组（assistant角色） */
  toolCalls?: LLMToolCall[];
  /** 工具调用ID（tool角色） */
  toolCallId?: string;
}