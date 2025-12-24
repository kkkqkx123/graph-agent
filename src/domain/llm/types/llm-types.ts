/**
 * LLM相关类型定义
 */

/**
 * LLM消息角色枚举
 */
export enum LLMMessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  FUNCTION = 'function',
  TOOL = 'tool'
}

/**
 * LLM消息接口
 */
export interface ILLMMessage {
  /**
   * 消息角色
   */
  role: LLMMessageRole;
  
  /**
   * 消息内容
   */
  content: string;
  
  /**
   * 消息名称（可选，用于function调用）
   */
  name?: string;
  
  /**
   * 函数调用（可选）
   */
  functionCall?: {
    name: string;
    arguments: string;
  };
  
  /**
   * 时间戳（可选）
   */
  timestamp?: Date;
  
  /**
   * 元数据（可选）
   */
  metadata?: Record<string, any>;
}

/**
 * LLM响应接口
 */
export interface ILLMResponse {
  /**
   * 响应消息
   */
  message: ILLMMessage;
  
  /**
   * 使用情况统计
   */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  /**
   * 响应时间（毫秒）
   */
  responseTime?: number;
  
  /**
   * 模型名称
   */
  model?: string;
  
  /**
   * 完成原因
   */
  finishReason?: string;
  
  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}

/**
 * LLM请求选项
 */
export interface ILLMRequestOptions {
  /**
   * 模型名称
   */
  model?: string;
  
  /**
   * 温度参数（0-2）
   */
  temperature?: number;
  
  /**
   * 最大令牌数
   */
  maxTokens?: number;
  
  /**
   * 顶部概率采样
   */
  topP?: number;
  
  /**
   * 频率惩罚
   */
  frequencyPenalty?: number;
  
  /**
   * 存在惩罚
   */
  presencePenalty?: number;
  
  /**
   * 停止词
   */
  stop?: string[];
  
  /**
   * 流式响应
   */
  stream?: boolean;
  
  /**
   * 超时时间（毫秒）
   */
  timeout?: number;
  
  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}

/**
 * LLM客户端接口
 */
export interface ILLMClient {
  /**
   * 发送聊天请求
   */
  chat(messages: ILLMMessage[], options?: ILLMRequestOptions): Promise<ILLMResponse>;
  
  /**
   * 流式聊天请求
   */
  chatStream(
    messages: ILLMMessage[], 
    options?: ILLMRequestOptions,
    onChunk?: (chunk: ILLMResponse) => void
  ): Promise<ILLMResponse>;
  
  /**
   * 获取支持的模型列表
   */
  getModels(): Promise<string[]>;
  
  /**
   * 检查模型是否可用
   */
  isModelAvailable(model: string): Promise<boolean>;
}