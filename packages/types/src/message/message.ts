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
 * 消息内容类型
 */
export type MessageContent = string | Array<{
  type: 'text' | 'image_url' | 'tool_use' | 'tool_result';
  text?: string;
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