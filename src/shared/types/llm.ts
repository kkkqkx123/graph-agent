/**
 * LLM类型定义
 */

import { EntityId, Entity, DomainEvent } from './common';

/**
 * LLM提供商
 */
export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  MOCK = 'mock'
}

/**
 * LLM模型状态
 */
export enum LLMModelStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  RATE_LIMITED = 'rate_limited'
}

/**
 * LLM模型实体
 */
export interface ILLMModel extends Entity {
  provider: LLMProvider;
  name: string;
  version: string;
  status: LLMModelStatus;
  config: Record<string, any>;
  metadata: Record<string, any>;
}

/**
 * LLM消息角色
 */
export enum LLMMessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool'
}

/**
 * LLM消息
 */
export interface ILLMMessage {
  role: LLMMessageRole;
  content: string;
  metadata?: Record<string, any>;
}

/**
 * LLM请求参数
 */
export interface ILLMRequest {
  modelId: EntityId;
  messages: ILLMMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  metadata?: Record<string, any>;
}

/**
 * LLM响应
 */
export interface ILLMResponse {
  id: string;
  modelId: EntityId;
  message: ILLMMessage;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  metadata?: Record<string, any>;
}

/**
 * LLM事件
 */
export interface LLMEvent extends DomainEvent {
  modelId: EntityId;
}

/**
 * LLM请求事件
 */
export interface LLMRequestEvent extends LLMEvent {
  request: ILLMRequest;
}

/**
 * LLM响应事件
 */
export interface LLMResponseEvent extends LLMEvent {
  response: ILLMResponse;
}