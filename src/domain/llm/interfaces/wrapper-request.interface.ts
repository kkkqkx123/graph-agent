import { LLMMessage } from '../value-objects/llm-message';

/**
 * 工具定义
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

/**
 * 工具调用选项
 */
export interface ToolChoice {
  type: 'function' | 'auto' | 'none' | 'required';
  function?: {
    name: string;
  };
}

/**
 * 请求选项
 */
export interface RequestOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  tools?: ToolDefinition[];
  toolChoice?: ToolChoice;
  stream?: boolean;
  metadata?: Record<string, any>;
}

/**
 * LLM包装器请求接口
 * 
 * 类型化的请求接口，替代wrapper.ts中的any类型
 */
export interface LLMWrapperRequest {
  /**
   * 消息列表
   */
  messages: LLMMessage[];

  /**
   * 请求选项
   */
  options?: RequestOptions;

  /**
   * 提示文本（向后兼容）
   */
  prompt?: string;

  /**
   * 内容（向后兼容）
   */
  content?: string;
}

/**
 * LLM包装器响应接口
 */
export interface LLMWrapperResponse {
  /**
   * 响应内容
   */
  content: string;

  /**
   * 工具调用
   */
  toolCalls?: any[];

  /**
   * 使用统计
   */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}