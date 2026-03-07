/**
 * Anthropic 格式转换器
 *
 * 实现 Anthropic API 的请求和响应格式转换
 */

import { BaseFormatter } from './base.js';
import type { LLMRequest, LLMResult, LLMMessage, LLMToolCall } from '@modular-agent/types';
import type { ToolSchema } from '@modular-agent/types';
import type {
  FormatterConfig,
  BuildRequestResult,
  ParseStreamChunkResult
} from './types.js';
import { convertToolsToAnthropicFormat } from '@modular-agent/common-utils';

/**
 * Anthropic 格式转换器
 */
export class AnthropicFormatter extends BaseFormatter {
  private readonly apiVersion: string;

  constructor(apiVersion: string = '2023-06-01') {
    super();
    this.apiVersion = apiVersion;
  }

  getSupportedProvider(): string {
    return 'ANTHROPIC';
  }

  buildRequest(request: LLMRequest, config: FormatterConfig): BuildRequestResult {
    const body = this.buildRequestBody(request, config);

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': config.profile.metadata?.['apiVersion'] || this.apiVersion,
      'anthropic-dangerous-direct-browser-access': 'false',
      ...config.profile.headers
    };

    // 添加认证头 (支持 x-api-key 和 Authorization Bearer 两种方式)
    if (config.profile.apiKey) {
      Object.assign(headers, this.buildAuthHeader(config.profile.apiKey, config, 'x-api-key'));
    }

    // 添加自定义请求头
    Object.assign(headers, this.buildCustomHeaders(config));

    // 应用自定义请求体
    const finalBody = this.applyCustomBody(body, config);

    // 构建查询参数
    const queryString = this.buildQueryString(config);

    return {
      httpRequest: {
        url: `/v1/messages${queryString}`,
        method: 'POST',
        headers,
        body: finalBody,
        timeout: config.timeout
      },
      transformedBody: finalBody
    };
  }

  parseResponse(data: any, config: FormatterConfig): LLMResult {
    const content = this.extractContent(data.content);
    const toolCalls = this.extractToolCalls(data.content);

    // Extract thinking content (for Claude extended thinking)
    const thinkingContent = this.extractThinkingContent(data.content);

    return {
      id: data.id,
      model: data.model,
      content,
      message: {
        role: 'assistant',
        content,
        toolCalls
      },
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      } : undefined,
      finishReason: data.stop_reason,
      duration: 0,
      metadata: {
        type: data.type,
        stopReason: data.stop_reason
      },
      reasoningContent: thinkingContent
    };
  }

  parseStreamChunk(data: any, config: FormatterConfig): ParseStreamChunkResult {
    switch (data.type) {
      case 'content_block_delta':
        // Text delta event
        if (data.delta && data.delta.type === 'text_delta' && data.delta.text) {
          return {
            chunk: {
              delta: data.delta.text,
              done: false,
              raw: data
            },
            valid: true
          };
        }
        // Thinking delta event (for Claude extended thinking)
        if (data.delta && data.delta.type === 'thinking_delta' && data.delta.thinking) {
          return {
            chunk: {
              delta: '',
              done: false,
              reasoningDelta: data.delta.thinking,
              raw: data
            },
            valid: true
          };
        }
        break;

      case 'content_block_start':
        // Content block start event (tool call)
        if (data.content_block && data.content_block.type === 'tool_use') {
          const toolCall: LLMToolCall = {
            id: data.content_block.id,
            type: 'function',
            function: {
              name: data.content_block.name,
              arguments: JSON.stringify(data.content_block.input || {})
            }
          };
          return {
            chunk: {
              delta: '',
              done: false,
              raw: { toolCall }
            },
            valid: true
          };
        }
        // Thinking block start event
        if (data.content_block && data.content_block.type === 'thinking') {
          return {
            chunk: {
              delta: '',
              done: false,
              raw: data
            },
            valid: true
          };
        }
        break;

      case 'message_delta':
        // Message delta event (contains usage)
        if (data.usage) {
          return {
            chunk: {
              delta: '',
              done: data.delta?.stop_reason === 'end_turn',
              usage: {
                promptTokens: data.usage.input_tokens || 0,
                completionTokens: data.usage.output_tokens || 0,
                totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
              },
              finishReason: data.delta?.stop_reason,
              raw: data
            },
            valid: true
          };
        }
        break;

      case 'message_start':
        // Message start event
        if (data.message?.usage) {
          return {
            chunk: {
              delta: '',
              done: false,
              usage: {
                promptTokens: data.message.usage.input_tokens || 0,
                completionTokens: 0,
                totalTokens: data.message.usage.input_tokens || 0
              },
              raw: data
            },
            valid: true
          };
        }
        break;

      default:
        break;
    }

    return { chunk: { done: false }, valid: false };
  }

  convertTools(tools: ToolSchema[]): any {
    return convertToolsToAnthropicFormat(tools);
  }

  convertMessages(messages: LLMMessage[]): any[] {
    return messages
      .filter(msg => msg.role !== 'system') // Anthropic 不支持 system 消息在 messages 数组中
      .map(msg => {
        const converted: any = {
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: []
        };

        // 处理内容
        if (typeof msg.content === 'string') {
          converted.content.push({
            type: 'text',
            text: msg.content
          });
        } else if (Array.isArray(msg.content)) {
          converted.content = msg.content;
        }

        // 添加工具调用结果
        if (msg.role === 'tool' && msg.toolCallId) {
          converted.role = 'user';
          converted.content = [{
            type: 'tool_result',
            tool_use_id: msg.toolCallId,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          }];
        }

        // 添加工具调用
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          converted.content = msg.toolCalls.map(call => ({
            type: 'tool_use',
            id: call.id,
            name: call.function.name,
            input: JSON.parse(call.function.arguments)
          }));
        }

        return converted;
      });
  }

  parseToolCalls(toolCalls: any[]): LLMToolCall[] {
    if (!toolCalls) return [];
    return toolCalls.map(call => ({
      id: call.id,
      type: 'function',
      function: {
        name: call.name,
        arguments: typeof call.input === 'string' ? call.input : JSON.stringify(call.input || {})
      }
    }));
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(request: LLMRequest, config: FormatterConfig): any {
    const parameters = this.mergeParameters(config.profile.parameters, request.parameters);

    const body: any = {
      model: config.profile.model,
      ['max_tokens']: parameters['max_tokens'] || 4096,
      stream: config.stream || false
    };

    // 处理系统消息
    const { systemMessage, filteredMessages } = this.extractSystemMessage(request.messages);
    if (systemMessage) {
      body.system = typeof systemMessage.content === 'string'
        ? systemMessage.content
        : JSON.stringify(systemMessage.content);
    }
    body.messages = this.convertMessages(filteredMessages);

    // 合并其他参数（排除 stream 和 max_tokens，已单独处理）
    const { stream, max_tokens, ...otherParams } = parameters;
    Object.assign(body, otherParams);

    // 添加工具
    if (request.tools && request.tools.length > 0) {
      body.tools = this.convertTools(request.tools);
    }

    // Handle thinking configuration (for Claude extended thinking)
    // Users can set parameters.thinking = { type: 'enabled', budget_tokens: 10000 }
    // or parameters.thinking = { type: 'adaptive', effort: 'high' }
    // The deepMerge will handle this correctly

    return body;
  }

  /**
   * 提取文本内容
   */
  private extractContent(content: any[]): string {
    if (!content || !Array.isArray(content)) {
      return '';
    }

    return content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('');
  }

  /**
   * 提取工具调用
   */
  private extractToolCalls(content: any[]): LLMToolCall[] {
    if (!content || !Array.isArray(content)) {
      return [];
    }

    return content
      .filter(item => item.type === 'tool_use')
      .map(item => ({
        id: item.id,
        type: 'function',
        function: {
          name: item.name,
          arguments: JSON.stringify(item.input || {})
        }
      }));
  }

  /**
   * 提取思考内容
   *
   * 从 Anthropic 响应中提取 thinking 类型的内容块
   */
  private extractThinkingContent(content: any[]): string | undefined {
    if (!content || !Array.isArray(content)) {
      return undefined;
    }

    const thinkingBlocks = content.filter(item => item.type === 'thinking');
    if (thinkingBlocks.length === 0) {
      return undefined;
    }

    return thinkingBlocks
      .map(block => block.thinking || '')
      .join('\n');
  }
}
