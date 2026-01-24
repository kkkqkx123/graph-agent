/**
 * Interaction 模块类型定义
 */

/**
 * 消息角色
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
}

/**
 * 消息接口
 */
export interface Message {
  readonly role: MessageRole;
  readonly content: string;
  readonly toolCallId?: string;
  readonly toolCalls?: ToolCall[];
  readonly timestamp?: string;
}

/**
 * 工具调用接口
 */
export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, any>;
  readonly result?: any;
  readonly executionTime?: number;
  readonly timestamp?: string;
}

/**
 * LLM 调用记录接口
 */
export interface LLMCall {
  readonly id: string;
  readonly provider: string;
  readonly model: string;
  readonly messages: Message[];
  readonly response: string;
  readonly toolCalls?: ToolCall[];
  readonly usage?: TokenUsage;
  readonly timestamp: string;
  readonly executionTime?: number;
}

/**
 * Token 使用情况
 */
export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

/**
 * LLM 执行结果
 */
export interface LLMExecutionResult {
  readonly success: boolean;
  readonly output?: string;
  readonly error?: string;
  readonly messages?: Message[];
  readonly toolCalls?: ToolCall[];
  readonly llmCalls?: LLMCall[];
  readonly tokenUsage?: TokenUsage;
  readonly executionTime?: number;
  readonly metadata?: Record<string, any>;
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  readonly success: boolean;
  readonly output?: any;
  readonly error?: string;
  readonly executionTime?: number;
  readonly metadata?: Record<string, any>;
}

/**
 * 用户交互结果
 */
export interface UserInteractionResult {
  readonly success: boolean;
  readonly output?: string;
  readonly error?: string;
  readonly executionTime?: number;
  readonly metadata?: Record<string, any>;
}

/**
 * LLM 配置接口
 */
export interface LLMConfig {
  readonly provider: string;
  readonly model: string;
  readonly prompt: string;
  readonly systemPrompt?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly topP?: number;
  readonly frequencyPenalty?: number;
  readonly presencePenalty?: number;
  readonly stopSequences?: string[];
  readonly stream?: boolean;
}

/**
 * 工具配置接口
 */
export interface ToolConfig {
  readonly toolId: string;
  readonly parameters: Record<string, any>;
  readonly timeout?: number;
}

/**
 * 用户交互配置接口
 */
export interface UserInteractionConfig {
  readonly interactionType: 'input' | 'confirmation' | 'selection';
  readonly prompt: string;
  readonly options?: string[];
  readonly timeout?: number;
}