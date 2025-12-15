/**
 * OpenAI提供商实现
 * 
 * 提供OpenAI API的格式转换功能
 */

import { LLMMessage } from '../../../../../domain/llm/entities/llm-request';
import { BaseProvider, ConversionContext } from '../base';

export class OpenAIProvider extends BaseProvider {
  constructor() {
    super('openai');
  }

  override getDefaultModel(): string {
    return 'gpt-3.5-turbo';
  }

  override getSupportedModels(): string[] {
    return [
      'gpt-3.5-turbo',
      'gpt-4',
      'gpt-4-turbo-preview',
      'gpt-4o',
      'gpt-4o-mini',
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

    // 处理流式事件
    const response = this.processStreamEvents(events);
    return this.buildResponse(response, context);
  }

  override validateRequest(
    messages: LLMMessage[],
    parameters: Record<string, any>
  ): string[] {
    const errors: string[] = [];

    if (!messages || messages.length === 0) {
      errors.push('消息列表不能为空');
    }

    if (!parameters || typeof parameters !== 'object') {
      errors.push('参数必须是对象格式');
    }

    // 验证每个消息的格式
    if (messages) {
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        if (!message || typeof message !== 'object') {
          errors.push(`消息 ${i} 必须是对象格式`);
          continue;
        }

        if (!message.role) {
          errors.push(`消息 ${i} 缺少role字段`);
        }

        if (!message.content && message.content !== '') {
          errors.push(`消息 ${i} 缺少content字段`);
        }

        // 验证角色是否有效
        const validRoles = ['system', 'user', 'assistant', 'tool'];
        if (message.role && !validRoles.includes(message.role)) {
          errors.push(`消息 ${i} 的role字段无效: ${message.role}`);
        }
      }
    }

    return errors;
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
    const role = message.role;
    const content = message.content;
    const name = message.name;

    // 构建基础消息
    const providerMessage: Record<string, any> = {
      role: this.getRoleMapping(role),
      content: content
    };

    // 添加名称
    if (name) {
      providerMessage['name'] = name;
    }

    // 添加工具调用
    if (message.tool_calls && message.tool_calls.length > 0) {
      providerMessage['tool_calls'] = message.tool_calls;
    }

    return providerMessage;
  }

  /**
   * 获取角色映射
   */
  private getRoleMapping(role: 'system' | 'user' | 'assistant' | 'tool'): string {
    const roleMapping: Record<string, string> = {
      'system': 'system',
      'user': 'user',
      'assistant': 'assistant',
      'tool': 'tool'
    };

    return roleMapping[role] || 'user';
  }

  /**
   * 构建请求数据
   */
  private buildRequest(
    messages: Record<string, any>[],
    parameters: Record<string, any>,
    context: ConversionContext
  ): Record<string, any> {
    // 基础请求结构
    const requestData: Record<string, any> = {
      model: parameters['model'] || this.getDefaultModel(),
      messages: messages
    };

    // 添加可选参数
    const optionalParams = this.getOptionalParameters();
    for (const param of optionalParams) {
      if (param in parameters) {
        requestData[param] = parameters[param];
      }
    }

    // 处理特殊参数
    this.handleSpecialParameters(requestData, parameters, context);

    // 处理工具配置
    this.handleToolsConfiguration(requestData, parameters, context);

    return requestData;
  }

  /**
   * 获取可选参数列表
   */
  override getOptionalParameters(): string[] {
    return [
      'temperature', 'top_p', 'n', 'stream', 'stop',
      'max_tokens', 'presence_penalty', 'frequency_penalty',
      'logit_bias', 'user', 'service_tier', 'seed'
    ];
  }

  /**
   * 处理特殊参数
   */
  override handleSpecialParameters(
    requestData: Record<string, any>,
    parameters: Record<string, any>,
    context: ConversionContext
  ): void {
    // 处理response_format
    if ('response_format' in parameters) {
      requestData['response_format'] = parameters['response_format'];
    }

    // 处理reasoning_effort (GPT-5特有)
    if ('reasoning_effort' in parameters) {
      requestData['reasoning_effort'] = parameters['reasoning_effort'];
    }

    // 处理stream_options
    if ('stream_options' in parameters) {
      requestData['stream_options'] = parameters['stream_options'];
    }
  }

  /**
   * 转换工具格式
   */
  override convertTools(
    tools: any[],
    context: ConversionContext
  ): any[] {
    // OpenAI工具格式已经是标准格式，直接返回
    return tools;
  }

  /**
   * 处理工具选择策略
   */
  override processToolChoice(
    toolChoice: any,
    context: ConversionContext
  ): any {
    // OpenAI支持的工具选择策略
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
   * 验证响应格式
   */
  override validateResponse(
    response: Record<string, any>
  ): string[] {
    const errors: string[] = [];

    if (!response || typeof response !== 'object') {
      errors.push('响应必须是对象格式');
      return errors;
    }

    const choices = response['choices'];
    if (!choices) {
      errors.push('响应缺少choices字段');
      return errors;
    }

    if (!Array.isArray(choices) || choices.length === 0) {
      errors.push('choices必须是非空数组');
      return errors;
    }

    return errors;
  }

  /**
   * 构建响应消息
   */
  private buildResponse(
    response: Record<string, any>,
    context: ConversionContext
  ): LLMMessage {
    const choices = response['choices'] || [];
    if (choices.length === 0) {
      throw new Error('响应中没有choices字段');
    }

    const choice = choices[0];
    const message = choice.message || {};

    // 提取基本信息
    const role = message.role || 'assistant';
    const content = message.content || '';

    // 提取工具调用
    const toolCalls = this.extractToolCalls(response, context);

    // 构建额外参数
    const additionalKwargs = this.buildResponseMetadata(response, choice, context);

    // 添加工具调用信息
    if (toolCalls.length > 0) {
      additionalKwargs['tool_calls'] = toolCalls;
    }

    // 创建LLM消息
    const llmMessage: LLMMessage = {
      role: role as 'system' | 'user' | 'assistant' | 'tool',
      content: content
    };

    if (toolCalls.length > 0) {
      llmMessage.tool_calls = toolCalls;
    }

    return llmMessage;
  }

  /**
   * 构建响应元数据
   */
  override buildResponseMetadata(
    response: Record<string, any>,
    choice: Record<string, any>,
    context: ConversionContext
  ): Record<string, any> {
    const metadata = super.buildResponseMetadata(response, choice, context);

    // 添加OpenAI特有的元数据
    metadata['system_fingerprint'] = response['system_fingerprint'];
    metadata['service_tier'] = response['service_tier'];

    return metadata;
  }

  /**
   * 处理流式事件
   */
  private processStreamEvents(events: Record<string, any>[]): Record<string, any> {
    // 合并所有流式事件的内容
    let content = '';
    const toolCalls: any[] = [];

    for (const event of events) {
      const choices = event['choices'] || [];
      if (choices.length > 0) {
        const delta = choices[0].delta || {};

        if (delta.content) {
          content += delta.content;
        }

        if (delta.tool_calls) {
          toolCalls.push(...delta.tool_calls);
        }
      }
    }

    return {
      choices: [{
        message: {
          role: 'assistant',
          content: content,
          tool_calls: toolCalls
        }
      }]
    };
  }
}