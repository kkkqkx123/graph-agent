/**
 * Gemini Native 格式转换器
 *
 * 实现 Gemini Native API 的请求和响应格式转换
 * 使用 Gemini 原生端点
 */

import { BaseFormatter } from './base.js';
import type { LLMRequest, LLMResult, LLMMessage, LLMToolCall } from '@modular-agent/types';
import type { ToolSchema } from '@modular-agent/types';
import type {
  FormatterConfig,
  BuildRequestResult,
  ParseStreamChunkResult
} from './types.js';
import { generateId, convertToolsToGeminiFormat } from '@modular-agent/common-utils';
import { extractAndFilterSystemMessages } from '../message-helper.js';

/**
 * Gemini Native 格式转换器
 */
export class GeminiNativeFormatter extends BaseFormatter {
  getSupportedProvider(): string {
    return 'GEMINI_NATIVE';
  }

  buildRequest(request: LLMRequest, config: FormatterConfig): BuildRequestResult {
    const body = this.buildRequestBody(request, config);
    const endpoint = config.stream
      ? `/models/${config.profile.model}:streamGenerateContent`
      : `/models/${config.profile.model}:generateContent`;

    return {
      httpRequest: {
        url: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.profile.headers
        },
        query: {
          key: config.profile.apiKey
        },
        body
      },
      transformedBody: body
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

  /**
   * 解析流式响应行（重写）
   *
   * Gemini Native API 直接返回 JSON，没有 data: 前缀
   */
  override parseStreamLine(line: string, config: FormatterConfig): ParseStreamChunkResult {
    // 跳过空行
    if (!line) {
      return { chunk: { done: false }, valid: false };
    }

    // Gemini Native API 直接返回 JSON，没有 data: 前缀
    try {
      const data = JSON.parse(line);
      return this.parseStreamChunk(data, config);
    } catch (e) {
      // 跳过无效 JSON
      return { chunk: { done: false }, valid: false };
    }
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
    return convertToolsToGeminiFormat(tools);
  }

  /**
   * 转换消息格式
   */
  convertMessages(messages: LLMMessage[]): any[] {
    return messages
      .filter(msg => msg.role !== 'system') // Gemini 使用 systemInstruction 处理系统消息
      .map(msg => {
        const converted: any = {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: []
        };

        // 处理内容
        if (typeof msg.content === 'string') {
          converted.parts.push({
            text: msg.content
          });
        } else if (Array.isArray(msg.content)) {
          converted.parts = msg.content;
        }

        // 处理工具调用结果
        if (msg.role === 'tool' && msg.toolCallId) {
          converted.role = 'user';
          converted.parts = [{
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
          converted.parts = msg.toolCalls.map(call => ({
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
   */
  private buildRequestBody(request: LLMRequest, config: FormatterConfig): any {
    const parameters = this.mergeParameters(config.profile.parameters, request.parameters);

    const body: any = {
      contents: [],
      generationConfig: {
        temperature: parameters['temperature'] || 0.7,
        maxOutputTokens: parameters['max_tokens'] || 4096,
        topP: parameters['top_p'] || 1.0,
        topK: parameters['top_k'] || 40
      }
    };

    // 处理系统指令
    const { systemMessage, filteredMessages } = extractAndFilterSystemMessages(request.messages);
    if (systemMessage) {
      body.systemInstruction = {
        parts: [{
          text: typeof systemMessage.content === 'string'
            ? systemMessage.content
            : JSON.stringify(systemMessage.content)
        }]
      };
    }
    body.contents = this.convertMessages(filteredMessages);

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
