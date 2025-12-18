/**
 * Gemini提供商实现
 *
 * 提供Gemini API的格式转换功能
 */

import { LLMMessage } from '../../../../domain/llm/entities/llm-request';
import { BaseProvider, ConversionContext } from '../base';
import { GeminiToolProcessor, GeminiContentProcessor } from '../processors';

export class GeminiProvider extends BaseProvider {
  constructor() {
    super('gemini', new GeminiToolProcessor(), new GeminiContentProcessor());
  }

  override getDefaultModel(): string {
    return 'gemini-1.5-pro';
  }

  override getSupportedModels(): string[] {
    return [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
      'gemini-pro-vision'
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
    return response; // 直接返回处理后的响应，不需要再buildResponse
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

    // Gemini将系统消息作为第一个用户消息处理
    if (role === 'system') {
      return this.convertSystemMessage(message, context);
    }

    // 构建基础消息
    const providerMessage: Record<string, any> = {
      role: this.getRoleMapping(role),
      parts: this.processContent(content, context)
    };

    // 添加名称
    if (name) {
      providerMessage['name'] = name;
    }

    // 添加工具调用
    if (message.tool_calls && message.tool_calls.length > 0) {
      providerMessage['function_calls'] = this.convertToolCalls(message.tool_calls, context);
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
    // Gemini将系统消息作为第一个用户消息处理
    return {
      role: 'user',
      parts: this.processContent(message.content, context)
    };
  }

  /**
   * 获取角色映射
   */
  private getRoleMapping(role: 'system' | 'user' | 'assistant' | 'tool'): string {
    const roleMapping: Record<string, string> = {
      'system': 'user', // Gemini使用user角色发送系统消息
      'user': 'user',
      'assistant': 'model',
      'tool': 'function'
    };

    return roleMapping[role] || 'user';
  }

  /**
   * 处理内容为Gemini格式
   */
  override processContent(
    content: string | Array<string | Record<string, any>>,
    context?: ConversionContext
  ): Array<Record<string, any>> {
    const processedContent: Array<Record<string, any>> = [];

    if (typeof content === 'string') {
      // 尝试解析JSON字符串
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          // 如果是数组，递归处理
          return this.processContent(parsed, context);
        } else {
          // 如果不是数组，作为文本处理
          processedContent.push({ text: content });
        }
      } catch {
        // 如果不是有效的JSON，作为文本处理
        processedContent.push({ text: content });
      }
    } else if (Array.isArray(content)) {
      for (const item of content) {
        if (typeof item === 'string') {
          processedContent.push({ text: item });
        } else if (typeof item === 'object') {
          if (item['type'] === 'text') {
            processedContent.push({ text: item['text'] || '' });
          } else if (item['type'] === 'image') {
            const processedImage = this.processImageContent(item, context);
            if (processedImage) {
              processedContent.push(processedImage);
            }
          }
        }
      }
    } else {
      processedContent.push({ text: String(content) });
    }

    return processedContent;
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
      inline_data: {
        mime_type: mediaType,
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
   * 转换工具调用
   */
  private convertToolCalls(
    toolCalls: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>,
    context: ConversionContext
  ): Array<Record<string, any>> {
    const functionCalls: Array<Record<string, any>> = [];

    for (const toolCall of toolCalls) {
      if (toolCall['type'] === 'function') {
        const functionDef = toolCall['function'] || {};
        const functionCall = {
          name: functionDef['name'] || '',
          args: functionDef['arguments'] || {}
        };
        functionCalls.push(functionCall);
      }
    }

    return functionCalls;
  }

  /**
   * 构建请求数据
   */
  private buildRequest(
    messages: Record<string, any>[],
    parameters: Record<string, any>,
    context: ConversionContext
  ): Record<string, any> {
    // Gemini使用不同的请求结构
    const requestData: Record<string, any> = {
      contents: messages,
      generationConfig: {
        temperature: parameters['temperature'] || 0.7,
        topP: parameters['top_p'] || 0.8,
        topK: parameters['top_k'] || 40,
        maxOutputTokens: parameters['max_tokens'] || 1024,
        stopSequences: parameters['stop'] || []
      }
    };

    // 添加模型
    if ('model' in parameters) {
      requestData['model'] = `models/${parameters['model']}`;
    }

    // 添加系统指令
    if ('system_instruction' in parameters) {
      requestData['systemInstruction'] = parameters['system_instruction'];
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
          const geminiTools = this.toolProcessor.convertTools(tools, context);
          if (geminiTools.length > 0) {
            requestData['tools'] = geminiTools;

            if ('tool_choice' in parameters) {
              requestData['tool_config'] = this.toolProcessor.processToolChoice(parameters['tool_choice'], context);
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

    const candidates = response['candidates'];
    if (!candidates) {
      errors.push('响应缺少candidates字段');
      return errors;
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      errors.push('candidates必须是非空数组');
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
    const candidates = response['candidates'] || [];
    if (candidates.length === 0) {
      throw new Error('响应中没有candidates字段');
    }

    const candidate = candidates[0];
    const content = candidate.content || {};
    const parts = content.parts || [];

    // 处理内容
    let textContent = '';
    const toolCalls: any[] = [];

    for (const part of parts) {
      if ('text' in part) {
        textContent += part.text;
      } else if ('functionCall' in part) {
        const functionCall = part.functionCall;
        const toolCall = {
          id: `call_${functionCall.name || ''}_${toolCalls.length}`,
          type: 'function',
          function: {
            name: functionCall.name || '',
            arguments: JSON.stringify(functionCall.args || {})
          }
        };
        toolCalls.push(toolCall);
      }
    }

    // 构建额外参数
    const additionalKwargs = {
      model: response['model'] || '',
      usage: response['usageMetadata'] || {},
      finish_reason: candidate['finishReason'],
      index: candidate['index'] || 0
    };

    // 创建LLM消息
    const llmMessage: LLMMessage = {
      role: 'assistant',
      content: textContent
    };

    if (toolCalls.length > 0) {
      llmMessage.tool_calls = toolCalls;
    }

    return llmMessage;
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
    const candidates = response['candidates'] || [];
    const toolCalls: any[] = [];

    for (const candidate of candidates) {
      const content = candidate.content || {};
      const parts = content.parts || [];

      for (const part of parts) {
        if ('functionCall' in part) {
          const functionCall = part.functionCall;
          const toolCall = {
            id: `call_${functionCall.name || ''}_${toolCalls.length}`,
            type: 'function',
            function: {
              name: functionCall.name || '',
              arguments: JSON.stringify(functionCall.args || {})
            }
          };
          toolCalls.push(toolCall);
        }
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
      const candidates = event['candidates'] || [];
      if (candidates.length > 0) {
        const candidate = candidates[0];
        const content = candidate.content || {};
        const parts = content.parts || [];

        for (const part of parts) {
          if ('text' in part) {
            textContent += part.text;
          } else if ('functionCall' in part) {
            toolCalls.push(part.functionCall);
          }
        }
      }
    }

    const responseParts: any[] = [];
    if (textContent) {
      responseParts.push({ text: textContent });
    }
    responseParts.push(...toolCalls.map(toolCall => ({
      functionCall: toolCall
    })));

    return {
      candidates: [{
        content: {
          parts: responseParts
        }
      }]
    };
  }
}