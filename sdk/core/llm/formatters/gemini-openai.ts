/**
 * Gemini OpenAI 兼容格式转换器
 *
 * 实现 Gemini OpenAI 兼容 API 的请求和响应格式转换
 * 使用 Gemini 的 OpenAI 兼容端点
 * 支持 thinking_budget、cached_content 等特殊参数
 */

import { BaseFormatter } from './base.js';
import type { LLMRequest, LLMResult, LLMMessage, LLMToolCall } from '@modular-agent/types';
import type { ToolSchema } from '@modular-agent/types';
import type {
  FormatterConfig,
  BuildRequestResult,
  ParseStreamChunkResult
} from './types.js';
import { generateId, convertToolsToOpenAIFormat } from '@modular-agent/common-utils';

/**
 * Gemini OpenAI 兼容格式转换器
 */
export class GeminiOpenAIFormatter extends BaseFormatter {
  getSupportedProvider(): string {
    return 'GEMINI_OPENAI';
  }

  buildRequest(request: LLMRequest, config: FormatterConfig): BuildRequestResult {
    const body = this.buildRequestBody(request, config);

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.profile.headers
    };

    // 添加认证头 (支持 bearer 和 native 两种方式)
    if (config.profile.apiKey) {
      Object.assign(headers, this.buildAuthHeader(config.profile.apiKey, config, 'Authorization'));
    }

    // 添加自定义请求头
    Object.assign(headers, this.buildCustomHeaders(config));

    // 应用自定义请求体
    const finalBody = this.applyCustomBody(body, config);

    // 构建查询参数
    const queryString = this.buildQueryString(config);

    return {
      httpRequest: {
        url: `/chat/completions${queryString}`,
        method: 'POST',
        headers,
        body: finalBody,
        timeout: config.timeout
      },
      transformedBody: finalBody
    };
  }

  parseResponse(data: any, config: FormatterConfig): LLMResult {
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No candidate in response');
    }

    const content = this.extractContent(candidate.content?.parts || []);
    const toolCalls = this.extractToolCalls(candidate.content?.parts || []);

    return {
      id: data.id || 'unknown',
      model: config.profile.model,
      content,
      message: {
        role: 'assistant',
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      },
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0
      } : undefined,
      finishReason: candidate.finishReason || 'stop',
      duration: 0,
      metadata: {
        finishReason: candidate.finishReason,
        safetyRatings: candidate.safetyRatings
      }
    };
  }

  parseStreamChunk(data: any, config: FormatterConfig): ParseStreamChunkResult {
    const candidate = data.candidates?.[0];
    if (!candidate) {
      return { chunk: { done: false }, valid: false };
    }

    const content = this.extractContent(candidate.content?.parts || []);
    const toolCalls = this.extractToolCalls(candidate.content?.parts || []);

    return {
      chunk: {
        delta: content,
        done: candidate.finishReason === 'STOP',
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount || 0,
          completionTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0
        } : undefined,
        finishReason: candidate.finishReason,
        raw: data
      },
      valid: true
    };
  }

  convertTools(tools: ToolSchema[]): any {
    return convertToolsToOpenAIFormat(tools);
  }

  /**
   * 转换消息格式
   * Gemini OpenAI 兼容 API 使用 OpenAI 格式，但支持 Gemini 特有参数
   */
  convertMessages(messages: LLMMessage[]): any[] {
    return messages
      .filter(msg => msg.role !== 'system') // Gemini OpenAI 兼容 API 使用 systemInstruction 处理系统消息
      .map(msg => {
        const converted: any = {
          role: msg.role === 'assistant' ? 'model' : 'user',
          content: []
        };

        // 处理内容
        if (typeof msg.content === 'string') {
          converted.content.push({
            text: msg.content
          });
        } else if (Array.isArray(msg.content)) {
          converted.content = msg.content;
        }

        // 处理工具调用结果
        if (msg.role === 'tool' && msg.toolCallId) {
          converted.role = 'user';
          converted.content = [{
            functionResponse: {
              name: msg.toolCallId,
              response: {
                result: typeof msg.content === 'string'
                  ? msg.content
                  : JSON.parse(JSON.stringify(msg.content))
              }
            }
          }];
        }

        // 处理工具调用
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          converted.content = msg.toolCalls.map(call => ({
            functionCall: {
              name: call.function.name,
              args: JSON.parse(call.function.arguments)
            }
          }));
        }

        return converted;
      });
  }

  parseToolCalls(toolCalls: any[]): LLMToolCall[] {
    if (!toolCalls) return [];
    return toolCalls.map(call => ({
      id: call.id || generateId(),
      type: 'function',
      function: {
        name: call.name || call.functionCall?.name,
        arguments: typeof call.args === 'string'
          ? call.args
          : JSON.stringify(call.args || call.functionCall?.args || {})
      }
    }));
  }

  /**
   * 构建请求体
   * Gemini OpenAI 兼容 API 使用 OpenAI 格式，但支持 Gemini 特有参数
   */
  private buildRequestBody(request: LLMRequest, config: FormatterConfig): any {
    const parameters = this.mergeParameters(config.profile.parameters, request.parameters);

    const body: any = {
      model: config.profile.model,
      messages: this.convertMessages(request.messages),
      stream: config.stream || false
    };

    // 合并参数
    const { stream, ...otherParams } = parameters;
    Object.assign(body, otherParams);

    // 添加工具
    if (request.tools && request.tools.length > 0) {
      body.tools = this.convertTools(request.tools);
    }

    return body;
  }

  /**
   * 提取文本内容
   */
  private extractContent(parts: any[]): string {
    if (!parts || !Array.isArray(parts)) {
      return '';
    }

    return parts
      .filter(part => part.text)
      .map(part => part.text)
      .join('');
  }

  /**
   * 提取工具调用
   */
  private extractToolCalls(parts: any[]): LLMToolCall[] {
    if (!parts || !Array.isArray(parts)) {
      return [];
    }

    return parts
      .filter(part => part.functionCall)
      .map(part => ({
        id: generateId(),
        type: 'function',
        function: {
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args || {})
        }
      }));
  }
}
