/**
 * LLM消息值对象
 */

import { ValueObject, Timestamp } from '../../common/value-objects';

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
 * LLM函数调用接口
 */
export interface LLMFunctionCall {
  name: string;
  arguments: string;
}

/**
 * LLM工具调用接口
 */
export interface LLMToolCall {
  id: string;
  type: string;
  function: LLMFunctionCall;
}

/**
 * LLM消息属性接口
 */
export interface LLMMessageProps {
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
  functionCall?: LLMFunctionCall;
  
  /**
   * 工具调用（可选）
   */
  toolCalls?: LLMToolCall[];
  
  /**
   * 工具调用ID（可选）
   */
  toolCallId?: string;
  
  /**
   * 时间戳（可选）
   */
  timestamp?: Timestamp;
  
  /**
   * 元数据（可选）
   */
  metadata?: Record<string, any>;
}

/**
 * LLM消息值对象
 */
export class LLMMessage extends ValueObject<LLMMessageProps> {
  /**
   * 创建系统消息
   * @param content 消息内容
   * @param metadata 元数据
   * @returns 系统消息实例
   */
  public static createSystem(content: string, metadata?: Record<string, any>): LLMMessage {
    return new LLMMessage({
      role: LLMMessageRole.SYSTEM,
      content,
      timestamp: Timestamp.now(),
      metadata
    });
  }

  /**
   * 创建用户消息
   * @param content 消息内容
   * @param metadata 元数据
   * @returns 用户消息实例
   */
  public static createUser(content: string, metadata?: Record<string, any>): LLMMessage {
    return new LLMMessage({
      role: LLMMessageRole.USER,
      content,
      timestamp: Timestamp.now(),
      metadata
    });
  }

  /**
   * 创建助手消息
   * @param content 消息内容
   * @param metadata 元数据
   * @returns 助手消息实例
   */
  public static createAssistant(content: string, metadata?: Record<string, any>): LLMMessage {
    return new LLMMessage({
      role: LLMMessageRole.ASSISTANT,
      content,
      timestamp: Timestamp.now(),
      metadata
    });
  }

  /**
   * 创建函数调用消息
   * @param name 函数名
   * @param args 函数参数
   * @param metadata 元数据
   * @returns 函数调用消息实例
   */
  public static createFunction(name: string, args: string, metadata?: Record<string, any>): LLMMessage {
    return new LLMMessage({
      role: LLMMessageRole.FUNCTION,
      content: '',
      name,
      functionCall: {
        name,
        arguments: args
      },
      timestamp: Timestamp.now(),
      metadata
    });
  }

  /**
   * 创建工具消息
   * @param content 消息内容
   * @param metadata 元数据
   * @returns 工具消息实例
   */
  public static createTool(content: string, metadata?: Record<string, any>): LLMMessage {
    return new LLMMessage({
      role: LLMMessageRole.TOOL,
      content,
      timestamp: Timestamp.now(),
      metadata
    });
  }

  /**
   * 从接口创建消息
   * @param message 消息接口
   * @returns 消息实例
   */
  public static fromInterface(message: {
    role: LLMMessageRole;
    content: string;
    name?: string;
    functionCall?: LLMFunctionCall;
    toolCalls?: LLMToolCall[];
    toolCallId?: string;
    timestamp?: Timestamp;
    metadata?: Record<string, any>;
  }): LLMMessage {
    return new LLMMessage({
      role: message.role,
      content: message.content,
      name: message.name,
      functionCall: message.functionCall,
      toolCalls: message.toolCalls,
      toolCallId: message.toolCallId,
      timestamp: message.timestamp || Timestamp.now(),
      metadata: message.metadata
    });
  }

  /**
   * 获取消息角色
   * @returns 消息角色
   */
  public getRole(): LLMMessageRole {
    return this.props.role;
  }

  /**
   * 获取消息内容
   * @returns 消息内容
   */
  public getContent(): string {
    return this.props.content;
  }

  /**
   * 获取消息名称
   * @returns 消息名称
   */
  public getName(): string | undefined {
    return this.props.name;
  }

  /**
   * 获取函数调用
   * @returns 函数调用
   */
  public getFunctionCall(): LLMFunctionCall | undefined {
    return this.props.functionCall;
  }

  /**
   * 获取工具调用
   * @returns 工具调用
   */
  public getToolCalls(): LLMToolCall[] | undefined {
    return this.props.toolCalls;
  }

  /**
   * 获取工具调用ID
   * @returns 工具调用ID
   */
  public getToolCallId(): string | undefined {
    return this.props.toolCallId;
  }

  /**
   * 获取时间戳
   * @returns 时间戳
   */
  public getTimestamp(): Timestamp | undefined {
    return this.props.timestamp;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public getMetadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  /**
   * 检查是否为系统消息
   * @returns 是否为系统消息
   */
  public isSystem(): boolean {
    return this.props.role === LLMMessageRole.SYSTEM;
  }

  /**
   * 检查是否为用户消息
   * @returns 是否为用户消息
   */
  public isUser(): boolean {
    return this.props.role === LLMMessageRole.USER;
  }

  /**
   * 检查是否为助手消息
   * @returns 是否为助手消息
   */
  public isAssistant(): boolean {
    return this.props.role === LLMMessageRole.ASSISTANT;
  }

  /**
   * 检查是否为函数调用消息
   * @returns 是否为函数调用消息
   */
  public isFunction(): boolean {
    return this.props.role === LLMMessageRole.FUNCTION;
  }

  /**
   * 检查是否为工具消息
   * @returns 是否为工具消息
   */
  public isTool(): boolean {
    return this.props.role === LLMMessageRole.TOOL;
  }

  /**
   * 检查是否有函数调用
   * @returns 是否有函数调用
   */
  public hasFunctionCall(): boolean {
    return this.props.functionCall !== undefined;
  }

  /**
   * 检查是否有工具调用
   * @returns 是否有工具调用
   */
  public hasToolCalls(): boolean {
    return this.props.toolCalls !== undefined && this.props.toolCalls.length > 0;
  }

  /**
   * 更新消息内容
   * @param content 新内容
   * @returns 新消息实例
   */
  public updateContent(content: string): LLMMessage {
    return new LLMMessage({
      ...this.props,
      content,
      timestamp: Timestamp.now()
    });
  }

  /**
   * 添加元数据
   * @param key 键
   * @param value 值
   * @returns 新消息实例
   */
  public addMetadata(key: string, value: any): LLMMessage {
    const metadata = { ...this.props.metadata };
    metadata[key] = value;
    
    return new LLMMessage({
      ...this.props,
      metadata
    });
  }

  /**
   * 转换为接口格式
   * @returns 接口格式
   */
  public toInterface(): {
    role: LLMMessageRole;
    content: string;
    name?: string;
    functionCall?: LLMFunctionCall;
    toolCalls?: LLMToolCall[];
    toolCallId?: string;
    timestamp?: Timestamp;
    metadata?: Record<string, any>;
  } {
    return {
      role: this.props.role,
      content: this.props.content,
      name: this.props.name,
      functionCall: this.props.functionCall,
      toolCalls: this.props.toolCalls,
      toolCallId: this.props.toolCallId,
      timestamp: this.props.timestamp,
      metadata: this.props.metadata
    };
  }

  /**
   * 验证消息的有效性
   */
  public override validate(): void {
    if (!this.props.content && this.props.role !== LLMMessageRole.FUNCTION && this.props.role !== LLMMessageRole.TOOL) {
      throw new Error('消息内容不能为空');
    }

    if (this.props.role === LLMMessageRole.FUNCTION && !this.props.name) {
      throw new Error('函数调用消息必须包含名称');
    }

    if (this.props.functionCall && (!this.props.functionCall.name || !this.props.functionCall.arguments)) {
      throw new Error('函数调用必须包含名称和参数');
    }

    if (this.props.toolCalls) {
      for (const toolCall of this.props.toolCalls) {
        if (!toolCall.id || !toolCall.type || !toolCall.function) {
          throw new Error('工具调用必须包含id、type和function');
        }
        if (!toolCall.function.name || !toolCall.function.arguments) {
          throw new Error('工具调用函数必须包含名称和参数');
        }
      }
    }
  }

  /**
   * 获取消息的摘要信息
   * @returns 摘要信息
   */
  public getSummary(): Record<string, any> {
    return {
      role: this.props.role,
      contentLength: this.props.content.length,
      name: this.props.name,
      hasFunctionCall: this.hasFunctionCall(),
      hasToolCalls: this.hasToolCalls(),
      toolCallCount: this.props.toolCalls ? this.props.toolCalls.length : 0,
      timestamp: this.props.timestamp,
      metadataKeys: this.props.metadata ? Object.keys(this.props.metadata) : []
    };
  }
}