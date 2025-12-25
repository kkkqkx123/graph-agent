/**
 * OpenAI Responses提供商实现
 *
 * 提供OpenAI Responses API的格式转换功能
 */

import { LLMMessage, LLMMessageRole } from '../../../../domain/llm/value-objects/llm-message';
import { BaseProvider, ConversionContext } from '../base';

export class OpenAIResponsesProvider extends BaseProvider {
  constructor() {
    super('openai-responses');
  }

  override getDefaultModel(): string {
    return 'gpt-4o';
  }

  override getSupportedModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo'
    ];
  }

  override convertRequest(
    messages: LLMMessage[],
    parameters: Record<string, any>
  ): Record<string, any> {
    const context = this.createContext('request', parameters);

    // 验证请求
    const errors = this.validateRequest(messages, parameters);
    if (errors.length > 0) {
      context.addError(`请求验证失败: ${errors.join(', ')}`);
      throw new Error(`请求验证失败: ${errors.join(', ')}`);
    }

    // 处理消息
    const processedMessages = this.processMessages(messages, context);

    // 构建请求
    const requestData = this.buildRequest(processedMessages, parameters, context);

    return requestData;
  }

  override convertResponse(response: Record<string, any>): any {
    const context = this.createContext('response', { response });

    // 验证响应
    const errors = this.validateResponse(response);
    if (errors.length > 0) {
      context.addWarning(`响应验证警告: ${errors.join(', ')}`);
    }

    // 构建消息
    return this.buildResponse(response, context);
  }

  override convertStreamResponse(events: Record<string, any>[]): any {
    const context = this.createContext('stream', { events });

    // 验证流式事件
    const errors = this.validateStreamEvents(events);
    if (errors.length > 0) {
      context.addWarning(`流式事件验证警告: ${errors.join(', ')}`);
    }

    // 处理流式事件
    const response = this.processStreamEvents(events);
    return this.buildResponse(response, context);
  }

  /**
   * 处理消息列表
   */
  private processMessages(
    messages: LLMMessage[],
    context: ConversionContext
  ): Record<string, any>[] {
    const processedMessages: Record<string, any>[] = [];

    for (const message of messages) {
      const processedMessage = this.convertMessage(message, context);
      if (processedMessage) {
        processedMessages.push(processedMessage);
      }
    }

    return processedMessages;
  }

  /**
   * 转换单个消息
   */
  private convertMessage(
    message: LLMMessage,
    context: ConversionContext
  ): Record<string, any> | null {
    const role = message.getRole();
    const content = message.getContent();

    // OpenAI Responses API使用不同的消息格式
    if (role === 'system') {
      return this.convertSystemMessage(message, context);
    } else if (role === 'user') {
      return this.convertHumanMessage(message, context);
    } else if (role === 'assistant') {
      return this.convertAIMessage(message, context);
    } else if (role === 'tool') {
      return this.convertToolMessage(message, context);
    } else {
      this.logger.warn(`不支持的消息类型: ${role}`);
      return null;
    }
  }

  /**
   * 转换系统消息
   */
  private convertSystemMessage(
    message: LLMMessage,
    context: ConversionContext
  ): Record<string, any> {
    // OpenAI Responses API将系统消息作为特殊参数处理
    return {
      role: 'system',
      content: this.processContent(message.getContent(), context)
    };
  }

  /**
   * 转换人类消息
   */
  private convertHumanMessage(
    message: LLMMessage,
    context: ConversionContext
  ): Record<string, any> {
    return {
      role: 'user',
      input: this.processContent(message.getContent(), context)
    };
  }

  /**
   * 转换AI消息
   */
  private convertAIMessage(
    message: LLMMessage,
    context: ConversionContext
  ): Record<string, any> {
    const providerMessage: Record<string, any> = {
      role: 'assistant',
      output: this.processContent(message.getContent(), context)
    };

    // 添加工具调用
    const toolCalls = message.getToolCalls();
    if (toolCalls && toolCalls.length > 0) {
      this.addToolCallsToMessage(providerMessage, toolCalls, context);
    }

    return providerMessage;
  }

  /**
   * 转换工具消息
   */
  private convertToolMessage(
    message: LLMMessage,
    context: ConversionContext
  ): Record<string, any> {
    // 确保工具结果是字符串格式
    const content = this.processContent(message.getContent(), context);

    const providerMessage: Record<string, any> = {
      role: 'tool',
      output: content
    };

    // 添加工具调用ID
    const toolCallId = message.getToolCallId();
    if (toolCallId) {
      providerMessage['tool_call_id'] = toolCallId;
    }

    // 添加名称
    const name = message.getName();
    if (name) {
      providerMessage['name'] = name;
    }

    return providerMessage;
  }

  /**
   * 处理内容
   */
  override processContent(
    content: string | Array<string | Record<string, any>>,
    context?: ConversionContext
  ): any {
    // OpenAI Responses API主要处理文本内容
    if (typeof content === 'string') {
      return content;
    } else if (Array.isArray(content)) {
      // 提取文本内容
      const textParts: string[] = [];
      for (const item of content) {
        if (typeof item === 'string') {
          textParts.push(item);
        } else if (typeof item === 'object' && item['type'] === 'text') {
          textParts.push(item['text'] || '');
        }
      }
      return textParts.join(' ');
    } else {
      return String(content);
    }
  }

  /**
   * 添加工具调用到消息
   */
  private addToolCallsToMessage(
    message: Record<string, any>,
    toolCalls: any[],
    context: ConversionContext
  ): Record<string, any> {
    // OpenAI Responses API使用不同的工具调用格式
    const functionCalls: any[] = [];

    for (const toolCall of toolCalls) {
      if (toolCall['type'] === 'function') {
        const func = toolCall['function'] || {};
        const functionCall = {
          name: func['name'] || '',
          arguments: func['arguments'] || {}
        };
        functionCalls.push(functionCall);
      }
    }

    if (functionCalls.length > 0) {
      message['tool_calls'] = functionCalls;
    }

    return message;
  }

  /**
   * 构建请求数据
   */
  private buildRequest(
    messages: Record<string, any>[],
    parameters: Record<string, any>,
    context: ConversionContext
  ): Record<string, any> {
    // OpenAI Responses API使用不同的请求结构
    const requestData: Record<string, any> = {
      model: parameters['model'] || this.getDefaultModel(),
      messages: []
    };

    // 处理消息
    const systemMessages: Record<string, any>[] = [];
    const conversationMessages: Record<string, any>[] = [];

    for (const message of messages) {
      if (message['role'] === 'system') {
        systemMessages.push(message);
      } else {
        conversationMessages.push(message);
      }
    }

    // 添加系统消息作为参数
    if (systemMessages.length > 0) {
      const systemContent: string[] = [];
      for (const sysMsg of systemMessages) {
        const content = sysMsg['content'] || '';
        if (content) {
          systemContent.push(content);
        }
      }

      if (systemContent.length > 0) {
        requestData['system'] = systemContent.join(' ');
      }
    }

    // 添加对话消息
    requestData['messages'] = conversationMessages;

    // 添加可选参数
    const optionalParams = [
      'temperature', 'top_p', 'max_tokens', 'stream',
      'stop', 'presence_penalty', 'frequency_penalty'
    ];

    for (const param of optionalParams) {
      if (param in parameters) {
        requestData[param] = parameters[param];
      }
    }

    // 处理工具配置
    this.handleToolsConfiguration(requestData, parameters, context);

    return requestData;
  }

  /**
   * 处理工具配置
   */
  override handleToolsConfiguration(
    requestData: Record<string, any>,
    parameters: Record<string, any>,
    context: ConversionContext
  ): void {
    if ('tools' in parameters) {
      const tools = parameters['tools'];

      // 转换为OpenAI Responses API工具格式
      const responsesTools = this.convertTools(tools, context);
      if (responsesTools.length > 0) {
        requestData['tools'] = responsesTools;

        // 处理工具选择策略
        if ('tool_choice' in parameters) {
          requestData['tool_choice'] = this.processToolChoice(parameters['tool_choice'], context);
        }
      }
    }
  }

  /**
   * 转换工具格式
   */
  override convertTools(
    tools: any[],
    context: ConversionContext
  ): any[] {
    const responsesTools: any[] = [];

    for (const tool of tools) {
      if (tool['type'] === 'function') {
        const func = tool['function'] || {};
        const responsesTool = {
          type: 'function',
          function: {
            name: func['name'] || '',
            description: func['description'] || '',
            parameters: func['parameters'] || {}
          }
        };
        responsesTools.push(responsesTool);
      }
    }

    return responsesTools;
  }

  /**
   * 处理工具选择策略
   */
  override processToolChoice(
    toolChoice: any,
    context: ConversionContext
  ): any {
    // OpenAI Responses API支持的工具选择策略
    if (toolChoice === 'required') {
      return 'required';
    } else if (toolChoice === 'auto') {
      return 'auto';
    } else if (toolChoice === 'none') {
      return 'none';
    } else if (typeof toolChoice === 'object') {
      return toolChoice;
    } else {
      return 'auto';
    }
  }

  /**
   * 提取工具调用
   */
  override extractToolCalls(
    response: Record<string, any>,
    context: ConversionContext
  ): any[] {
    // OpenAI Responses API的响应格式可能不同
    const output = response['output'] || '';
    const toolCalls: any[] = [];

    // 这里需要根据实际的OpenAI Responses API响应格式来实现
    // 暂时返回空列表
    return toolCalls;
  }

  /**
   * 构建响应消息
   */
  private buildResponse(
    response: Record<string, any>,
    context: ConversionContext
  ): LLMMessage {
    // OpenAI Responses API的响应格式
    const output = response['output'] || '';

    // 提取工具调用
    const toolCalls = this.extractToolCalls(response, context);

    // 构建额外参数
    const additionalKwargs: Record<string, any> = {
      model: response['model'] || '',
      usage: response['usage'] || {},
      finish_reason: response['finish_reason'],
      id: response['id'] || ''
    };

    // 添加工具调用信息
    if (toolCalls.length > 0) {
      additionalKwargs['tool_calls'] = toolCalls;
    }

    // 创建LLM消息
    const llmMessage = LLMMessage.fromInterface({
      role: LLMMessageRole.ASSISTANT,
      content: output,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    });

    return llmMessage;
  }

  /**
   * 验证流式事件
   */
  private validateStreamEvents(events: Record<string, any>[]): string[] {
    const errors: string[] = [];

    if (!Array.isArray(events)) {
      errors.push('流式事件必须是列表格式');
      return errors;
    }

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (typeof event !== 'object') {
        errors.push(`事件 ${i} 必须是字典`);
      }
    }

    return errors;
  }

  /**
   * 处理流式事件
   */
  private processStreamEvents(events: Record<string, any>[]): Record<string, any> {
    const contentParts: string[] = [];
    const toolCalls: any[] = [];

    for (const event of events) {
      if ('content' in event) {
        contentParts.push(String(event['content']));
      }

      if ('tool_calls' in event) {
        toolCalls.push(...(event['tool_calls'] || []));
      }
    }

    // 构建响应格式
    return {
      output: contentParts.join(''),
      tool_calls: toolCalls
    };
  }
}