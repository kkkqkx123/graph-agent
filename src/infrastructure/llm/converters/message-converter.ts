/**
 * 统一消息转换器
 *
 * 提供所有消息格式转换的统一入口
 */

import { LLMMessage, LLMMessageRole } from '../../../domain/llm/value-objects/llm-message';
import { MessageRole } from './base';

/**
 * 基础消息接口
 */
export interface BaseMessage {
  content: string;
  name?: string;
  additionalKwargs?: Record<string, any>;
}

/**
 * 人类消息
 */
export class HumanMessage implements BaseMessage {
  constructor(
    public content: string,
    public name?: string,
    public additionalKwargs: Record<string, any> = {}
  ) { }
}

/**
 * AI消息
 */
export class AIMessage implements BaseMessage {
  constructor(
    public content: string,
    public name?: string,
    public toolCalls?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>,
    public additionalKwargs: Record<string, any> = {}
  ) { }
}

/**
 * 系统消息
 */
export class SystemMessage implements BaseMessage {
  constructor(
    public content: string,
    public name?: string,
    public additionalKwargs: Record<string, any> = {}
  ) { }
}

/**
 * 工具消息
 */
export class ToolMessage implements BaseMessage {
  constructor(
    public content: string,
    public toolCallId: string,
    public name?: string,
    public additionalKwargs: Record<string, any> = {}
  ) { }
}

/**
 * 消息转换器
 */
export class MessageConverter {
  private providers: Map<string, any> = new Map();

  constructor() {
    this.registerProviders();
  }

  /**
   * 注册所有提供商
   */
  private registerProviders(): void {
    try {
      // 动态导入提供商实现
      // 这里使用动态导入以避免循环依赖
      // 实际实现时会在工厂中注册
    } catch (error) {
      // 如果提供商模块不存在，跳过注册
    }
  }

  /**
   * 将任意消息格式转换为基础消息
   */
  toBaseMessage(message: any, providerHint?: string): BaseMessage {
    if (message instanceof HumanMessage ||
      message instanceof AIMessage ||
      message instanceof SystemMessage ||
      message instanceof ToolMessage) {
      return message;
    }

    if (this.isLLMMessage(message)) {
      return this.llmToBase(message);
    }

    if (typeof message === 'object' && message !== null) {
      return this.dictToBase(message, providerHint);
    }

    // 默认转换为人类消息
    return new HumanMessage(String(message));
  }

  /**
   * 将基础消息转换为目标格式
   */
  fromBaseMessage(
    message: BaseMessage,
    targetFormat: string = 'llm',
    provider?: string
  ): any {
    if (targetFormat === 'llm') {
      return this.baseToLLM(message);
    }

    if (targetFormat === 'dict') {
      return this.baseToDict(message);
    }

    if (provider && this.providers.has(provider)) {
      return this.baseToProvider(message, provider);
    }

    // 默认转换为字典格式
    return this.baseToDict(message);
  }

  /**
   * 批量转换消息列表为基础格式
   */
  convertMessageList(messages: any[], providerHint?: string): BaseMessage[] {
    return messages.map(msg => this.toBaseMessage(msg, providerHint));
  }

  /**
   * 批量转换基础消息列表
   */
  convertFromBaseList(
    messages: BaseMessage[],
    targetFormat: string = 'llm',
    provider?: string
  ): any[] {
    return messages.map(msg => this.fromBaseMessage(msg, targetFormat, provider));
  }

  /**
   * 检查是否为LLMMessage
   */
  private isLLMMessage(message: any): message is LLMMessage {
    return message &&
      typeof message === 'object' &&
      typeof message.getRole === 'function' &&
      typeof message.getContent === 'function';
  }

  /**
   * 将LLM消息转换为基础消息
   */
  private llmToBase(message: LLMMessage): BaseMessage {
    const role = message.getRole();
    const content = message.getContent();
    const name = message.getName();
    const metadata = message.getMetadata() || {};

    if (role === LLMMessageRole.USER) {
      return new HumanMessage(content, name, metadata);
    } else if (role === LLMMessageRole.ASSISTANT) {
      return new AIMessage(content, name, message.getToolCalls(), metadata);
    } else if (role === LLMMessageRole.SYSTEM) {
      return new SystemMessage(content, name, metadata);
    } else if (role === LLMMessageRole.TOOL) {
      return new ToolMessage(content, message.getToolCallId() || '', name, metadata);
    } else {
      // 默认为人类消息
      return new HumanMessage(content, name, metadata);
    }
  }

  /**
   * 将字典转换为基础消息
   */
  private dictToBase(messageDict: Record<string, any>, providerHint?: string): BaseMessage {
    const content = messageDict['content'] || '';
    const role = messageDict['role'] || 'user';
    const toolCalls = messageDict['tool_calls'] || messageDict['toolCalls'];
    const toolCallId = messageDict['tool_call_id'] || messageDict['toolCallId'] || '';

    // 处理额外参数
    const additionalKwargs: Record<string, any> = {};
    for (const [key, value] of Object.entries(messageDict)) {
      if (!['content', 'role', 'tool_calls', 'toolCalls', 'tool_call_id', 'toolCallId', 'name'].includes(key)) {
        additionalKwargs[key] = value;
      }
    }

    const name = messageDict['name'];

    if (role === 'user' || role === 'human') {
      return new HumanMessage(content, name, additionalKwargs);
    } else if (role === 'assistant' || role === 'ai') {
      return new AIMessage(content, name, toolCalls, additionalKwargs);
    } else if (role === 'system') {
      return new SystemMessage(content, name, additionalKwargs);
    } else if (role === 'tool') {
      return new ToolMessage(content, toolCallId, name, additionalKwargs);
    } else {
      // 默认为人类消息
      return new HumanMessage(content, name, additionalKwargs);
    }
  }

  /**
   * 将基础消息转换为LLM消息
   */
  private baseToLLM(message: BaseMessage): LLMMessage {
    if (message instanceof HumanMessage) {
      return LLMMessage.createUser(message.content, message.additionalKwargs);
    } else if (message instanceof AIMessage) {
      return LLMMessage.createAssistant(message.content, message.additionalKwargs);
    } else if (message instanceof SystemMessage) {
      return LLMMessage.createSystem(message.content, message.additionalKwargs);
    } else if (message instanceof ToolMessage) {
      return LLMMessage.createTool(message.content, message.additionalKwargs);
    } else {
      return LLMMessage.createUser(message.content, message.additionalKwargs);
    }
  }

  /**
   * 将基础消息转换为字典格式
   */
  private baseToDict(message: BaseMessage): Record<string, any> {
    const result: Record<string, any> = {
      content: message.content,
      type: this.getMessageType(message)
    };

    if (message.name) {
      result['name'] = message.name;
    }

    if (message.additionalKwargs && Object.keys(message.additionalKwargs).length > 0) {
      result['additionalKwargs'] = { ...message.additionalKwargs };
    }

    if (message instanceof ToolMessage) {
      result['tool_call_id'] = message.toolCallId;
    }

    if (message instanceof AIMessage && message.toolCalls) {
      result['tool_calls'] = message.toolCalls;
    }

    return result;
  }

  /**
   * 将基础消息转换为提供商格式
   */
  private baseToProvider(message: BaseMessage, provider: string): any {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new Error(`不支持的提供商: ${provider}`);
    }

    // 转换为提供商请求格式
    const messages = [message];
    const parameters = {};

    try {
      const requestData = providerInstance.convertRequest(messages, parameters);

      // 提取消息部分
      if (requestData.messages && requestData.messages.length > 0) {
        return requestData.messages[0];
      } else {
        // 回退到基本处理
        return {
          content: message.content,
          role: 'user'
        };
      }
    } catch (error) {
      // 回退到基本处理
      return {
        content: message.content,
        role: 'user'
      };
    }
  }

  /**
   * 获取消息类型
   */
  private getMessageType(message: BaseMessage): string {
    if (message instanceof HumanMessage) {
      return 'human';
    } else if (message instanceof AIMessage) {
      return 'ai';
    } else if (message instanceof SystemMessage) {
      return 'system';
    } else if (message instanceof ToolMessage) {
      return 'tool';
    } else {
      return 'unknown';
    }
  }

  /**
   * 注册提供商
   */
  registerProvider(name: string, provider: any): void {
    this.providers.set(name, provider);
  }

  /**
   * 移除提供商
   */
  unregisterProvider(name: string): void {
    this.providers.delete(name);
  }

  /**
   * 便捷方法：创建系统消息
   */
  createSystemMessage(content: string): LLMMessage {
    return LLMMessage.createSystem(content);
  }

  /**
   * 便捷方法：创建用户消息
   */
  createUserMessage(content: string): LLMMessage {
    return LLMMessage.createUser(content);
  }

  /**
   * 便捷方法：创建助手消息
   */
  createAssistantMessage(content: string): LLMMessage {
    return LLMMessage.createAssistant(content);
  }

  /**
   * 便捷方法：创建工具消息
   */
  createToolMessage(content: string, toolCallId: string): LLMMessage {
    return LLMMessage.createTool(content);
  }

  /**
   * 检查是否包含工具调用
   */
  hasToolCalls(message: BaseMessage | LLMMessage): boolean {
    if (message instanceof LLMMessage) {
      return message.hasToolCalls();
    }

    if (message instanceof AIMessage && message.toolCalls && message.toolCalls.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * 提取工具调用信息
   */
  extractToolCalls(message: BaseMessage | LLMMessage): Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }> {
    if (message instanceof LLMMessage) {
      return message.getToolCalls() || [];
    }

    if (message instanceof AIMessage && message.toolCalls) {
      return message.toolCalls;
    }

    return [];
  }

  /**
   * 提取并解析工具调用信息
   */
  extractAndParseToolCalls(message: BaseMessage | LLMMessage): Array<{
    name: string;
    arguments: string;
    call_id: string;
  }> {
    const toolCallsData = this.extractToolCalls(message);

    return toolCallsData.map(toolCall => ({
      name: toolCall.function.name,
      arguments: toolCall.function.arguments,
      call_id: toolCall.id
    }));
  }

  /**
   * 添加工具调用到消息
   */
  addToolCallsToMessage(message: LLMMessage, toolCalls: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>): LLMMessage {
    // 创建新的消息实例，添加工具调用
    const messageData = message.toInterface();
    messageData.toolCalls = toolCalls;
    return LLMMessage.fromInterface(messageData);
  }
}