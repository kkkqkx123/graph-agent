/**
 * Anthropic提供商实现
 *
 * 提供Anthropic API的格式转换功能
 */

import { LLMMessage, LLMMessageRole } from '../../../../domain/llm/value-objects/llm-message';
import { BaseProvider, ConversionContext } from '../base';
import { AnthropicToolProcessor, AnthropicContentProcessor } from '../processors';

export class AnthropicProvider extends BaseProvider {
  constructor() {
    super('anthropic', new AnthropicToolProcessor(), new AnthropicContentProcessor());
  }

  override getDefaultModel(): string {
    return 'claude-3-sonnet-20240229';
  }

  override getSupportedModels(): string[] {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
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

        if (!message.getRole()) {
          errors.push(`消息 ${i} 缺少role字段`);
        }

        if (!message.getContent() && message.getContent() !== '') {
          errors.push(`消息 ${i} 缺少content字段`);
        }

        // 验证角色是否有效
        const validRoles = ['system', 'user', 'assistant', 'tool'];
        if (message.getRole() && !validRoles.includes(message.getRole())) {
          errors.push(`消息 ${i} 的role字段无效: ${message.getRole()}`);
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
    const role = message.getRole();
    const content = message.getContent();
    const name = message.getName();

    // Anthropic将系统消息作为第一个用户消息处理
    if (role === 'system') {
      return this.convertSystemMessage(message, context);
    }

    // 构建基础消息
    const providerMessage: Record<string, any> = {
      role: this.getRoleMapping(role),
      content: this.processContent(content, context)
    };

    // 添加名称
    if (name) {
      providerMessage['name'] = name;
    }

    return providerMessage;
  }

  /**
   * 转换系统消息
   */
  private convertSystemMessage(
    message: LLMMessage,
    context: ConversionContext
  ): Record<string, any> {
    // Anthropic将系统消息作为第一个用户消息处理
    return {
      role: 'user',
      content: this.processContent(message.getContent(), context)
    };
  }

  /**
   * 获取角色映射
   */
  private getRoleMapping(role: LLMMessageRole): string {
    const roleMapping: Record<LLMMessageRole, string> = {
      [LLMMessageRole.SYSTEM]: 'user', // Anthropic使用user角色发送系统消息
      [LLMMessageRole.USER]: 'user',
      [LLMMessageRole.ASSISTANT]: 'assistant',
      [LLMMessageRole.TOOL]: 'tool',
      [LLMMessageRole.FUNCTION]: 'tool' // 将FUNCTION映射为tool
    };

    return roleMapping[role] || 'user';
  }

  /**
   * 处理内容
   */
  override processContent(
    content: string | Array<string | Record<string, any>>,
    context?: ConversionContext
  ): Array<Record<string, any>> {
    let processedContent: Array<Record<string, any>>;

    // 处理JSON字符串格式的多模态内容
    if (typeof content === 'string') {
      try {
        const parsedContent = JSON.parse(content);
        if (Array.isArray(parsedContent)) {
          processedContent = parsedContent;
        } else {
          processedContent = [{ type: 'text', text: content }];
        }
      } catch (error) {
        // 如果不是有效的JSON，作为普通文本处理
        processedContent = [{ type: 'text', text: content }];
      }
    } else {
      processedContent = super.processContent(content, context);
    }

    // Anthropic使用不同的内容格式
    const anthropicContent: Array<Record<string, any>> = [];

    for (const item of processedContent) {
      if (item['type'] === 'text') {
        anthropicContent.push({
          type: 'text',
          text: item['text'] || ''
        });
      } else if (item['type'] === 'image') {
        const processedImage = this.processImageContent(item, context);
        if (processedImage) {
          anthropicContent.push(processedImage);
        }
      }
    }

    return anthropicContent;
  }

  /**
   * 处理图像内容
   */
  override processImageContent(
    imageItem: Record<string, any>,
    context?: ConversionContext
  ): Record<string, any> | null {
    const source = imageItem['source'] || {};

    if (!source || typeof source !== 'object') {
      this.logger.warn('图像内容缺少source字段');
      return null;
    }

    const mediaType = source['media_type'] || '';
    const imageData = source['data'] || '';

    if (!this.isSupportedImageFormat(mediaType)) {
      this.logger.warn(`不支持的图像格式: ${mediaType}`);
      return null;
    }

    if (!imageData) {
      this.logger.warn('图像内容缺少数据');
      return null;
    }

    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: imageData
      }
    };
  }

  /**
   * 检查是否为支持的图像格式
   */
  override isSupportedImageFormat(mediaType: string): boolean {
    const supportedFormats = new Set([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif'
    ]);
    return supportedFormats.has(mediaType);
  }

  /**
   * 构建请求数据
   */
  private buildRequest(
    messages: Record<string, any>[],
    parameters: Record<string, any>,
    context: ConversionContext
  ): Record<string, any> {
    // Anthropic使用不同的请求结构
    const requestData: Record<string, any> = {
      model: parameters['model'] || this.getDefaultModel(),
      messages: messages,
      max_tokens: parameters['max_tokens'] || 1024
    };

    // 添加可选参数
    const optionalParams = [
      'temperature', 'top_p', 'top_k', 'stop_sequences',
      'stream', 'system'
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
      if (Array.isArray(tools)) {
        const toolErrors = this.toolProcessor.validateTools(tools);
        if (toolErrors.length === 0) {
          const anthropicTools = this.toolProcessor.convertTools(tools, context);
          if (anthropicTools.length > 0) {
            requestData['tools'] = anthropicTools;

            if ('tool_choice' in parameters) {
              requestData['tool_choice'] = this.toolProcessor.processToolChoice(parameters['tool_choice'], context);
            }
          }
        }
      }
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

    const content = response['content'];
    if (!content) {
      errors.push('响应缺少content字段');
      return errors;
    }

    if (!Array.isArray(content)) {
      errors.push('content必须是数组格式');
      return errors;
    }

    if (content.length === 0) {
      errors.push('content不能为空数组');
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
    const content = response['content'] || [];

    if (content.length === 0) {
      throw new Error('响应内容为空');
    }

    // 处理内容
    let textContent = '';
    const toolCalls: any[] = [];

    for (const item of content) {
      if (item['type'] === 'text') {
        textContent += item['text'] || '';
      } else if (item['type'] === 'tool_use') {
        const toolCall = {
          id: item['id'] || '',
          type: 'function',
          function: {
            name: item['name'] || '',
            arguments: JSON.stringify(item['input'] || {})
          }
        };
        toolCalls.push(toolCall);
      }
    }

    // 构建额外参数
    const additionalKwargs = {
      model: response['model'] || '',
      id: response['id'] || '',
      type: response['type'] || '',
      usage: response['usage'] || {},
      stop_reason: response['stop_reason'],
      stop_sequence: response['stop_sequence']
    };

    // 创建LLM消息
    return LLMMessage.createAssistant(textContent);
  }

  /**
   * 提取工具调用
   */
  override extractToolCalls(
    response: Record<string, any>,
    context: ConversionContext
  ): Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }> {
    const content = response['content'] || [];
    const toolCalls: any[] = [];

    for (const item of content) {
      if (item['type'] === 'tool_use') {
        const toolCall = {
          id: item['id'] || '',
          type: 'function',
          function: {
            name: item['name'] || '',
            arguments: JSON.stringify(item['input'] || {})
          }
        };
        toolCalls.push(toolCall);
      }
    }

    return toolCalls;
  }

  /**
   * 处理流式事件
   */
  private processStreamEvents(events: Record<string, any>[]): Record<string, any> {
    // 合并所有流式事件的内容
    let textContent = '';
    const toolCalls: any[] = [];

    for (const event of events) {
      const delta = event['delta'] || {};

      if (delta.text) {
        textContent += delta.text;
      }

      if (delta.tool_use) {
        toolCalls.push(delta.tool_use);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: textContent
        },
        ...toolCalls.map(toolCall => ({
          type: 'tool_use',
          ...toolCall
        }))
      ]
    };
  }
}