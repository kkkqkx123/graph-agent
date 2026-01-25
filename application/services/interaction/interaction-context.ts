/**
 * Interaction 上下文接口
 *
 * 负责维护交互过程中的状态，包括消息历史、变量、工具调用记录等
 */

import { Message } from '../../domain/interaction/value-objects/message';
import { ToolCall } from '../../domain/interaction/value-objects/tool-call';
import { LLMCall } from '../../domain/interaction/value-objects/llm-call';
import { InteractionTokenUsage } from '../../domain/interaction/value-objects/token-usage';

/**
 * Interaction 上下文接口
 */
export interface IInteractionContext {
  /**
   * 获取消息历史
   */
  getMessages(): Message[];

  /**
   * 添加消息
   */
  addMessage(message: Message): void;

  /**
   * 清空消息历史
   */
  clearMessages(): void;

  /**
   * 获取变量
   */
  getVariable(key: string): any;

  /**
   * 设置变量
   */
  setVariable(key: string, value: any): void;

  /**
   * 获取所有变量
   */
  getAllVariables(): Record<string, any>;

  /**
   * 获取工具调用记录
   */
  getToolCalls(): ToolCall[];

  /**
   * 添加工具调用记录
   */
  addToolCall(toolCall: ToolCall): void;

  /**
   * 获取 LLM 调用记录
   */
  getLLMCalls(): LLMCall[];

  /**
   * 添加 LLM 调用记录
   */
  addLLMCall(llmCall: LLMCall): void;

  /**
   * 获取 Token 使用情况
   */
  getTokenUsage(): InteractionTokenUsage;

  /**
   * 更新 Token 使用情况
   */
  updateTokenUsage(usage: InteractionTokenUsage): void;

  /**
   * 获取元数据
   */
  getMetadata(key: string): any;

  /**
   * 设置元数据
   */
  setMetadata(key: string, value: any): void;

  /**
   * 克隆上下文
   */
  clone(): IInteractionContext;
}

/**
 * Interaction 上下文实现
 */
export class InteractionContext implements IInteractionContext {
  private messages: Message[];
  private variables: Map<string, any>;
  private toolCalls: ToolCall[];
  private llmCalls: LLMCall[];
  private tokenUsage: InteractionTokenUsage;
  private metadata: Map<string, any>;

  constructor() {
    this.messages = [];
    this.variables = new Map();
    this.toolCalls = [];
    this.llmCalls = [];
    this.tokenUsage = new InteractionTokenUsage({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
    this.metadata = new Map();
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  addMessage(message: Message): void {
    this.messages.push(message);
  }

  clearMessages(): void {
    this.messages = [];
  }

  getVariable(key: string): any {
    return this.variables.get(key);
  }

  setVariable(key: string, value: any): void {
    this.variables.set(key, value);
  }

  getAllVariables(): Record<string, any> {
    return Object.fromEntries(this.variables);
  }

  getToolCalls(): ToolCall[] {
    return [...this.toolCalls];
  }

  addToolCall(toolCall: ToolCall): void {
    this.toolCalls.push(toolCall);
  }

  getLLMCalls(): LLMCall[] {
    return [...this.llmCalls];
  }

  addLLMCall(llmCall: LLMCall): void {
    this.llmCalls.push(llmCall);
  }

  getTokenUsage(): InteractionTokenUsage {
    return this.tokenUsage;
  }

  updateTokenUsage(usage: InteractionTokenUsage): void {
    this.tokenUsage = this.tokenUsage.add(usage);
  }

  getMetadata(key: string): any {
    return this.metadata.get(key);
  }

  setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }

  clone(): IInteractionContext {
    const cloned = new InteractionContext();
    
    // 克隆消息
    cloned.messages = [...this.messages];
    
    // 克隆变量
    this.variables.forEach((value, key) => {
      cloned.variables.set(key, value);
    });
    
    // 克隆工具调用
    cloned.toolCalls = [...this.toolCalls];
    
    // 克隆 LLM 调用
    cloned.llmCalls = [...this.llmCalls];
    
    // 克隆 Token 使用情况
    cloned.tokenUsage = this.tokenUsage;
    
    // 克隆元数据
    this.metadata.forEach((value, key) => {
      cloned.metadata.set(key, value);
    });
    
    return cloned;
  }
}