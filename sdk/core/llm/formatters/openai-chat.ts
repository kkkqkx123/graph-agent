/**
 * OpenAI Chat 格式转换器
 *
 * 实现 OpenAI Chat API 的请求和响应格式转换
 * 使用 /chat/completions 端点
 */

import { BaseFormatter } from './base.js';
import type { LLMRequest, LLMResult, LLMMessage, LLMToolCall } from '@modular-agent/types';
import type { ToolSchema } from '@modular-agent/types';
import type {
  FormatterConfig,
  BuildRequestResult,
  ParseStreamChunkResult
} from './types.js';
import { convertToolsToOpenAIFormat } from '@modular-agent/common-utils';

/**
 * OpenAI Chat 格式转换器
 */
export class OpenAIChatFormatter extends BaseFormatter {
  getSupportedProvider(): string {
    return 'OPENAI_CHAT';
  }

  buildRequest(request: LLMRequest, config: FormatterConfig): BuildRequestResult {
    const body = this.buildRequestBody(request, config);

    return {
      httpRequest: {
        url: '/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.profile.headers
        },
        body
      },
      transformedBody: body
    };
  }

  parseResponse(data: any, config: FormatterConfig): LLMResult {
    const choice = data.choices[0];
    const message = choice.message;

    // Extract reasoning content (for DeepSeek R1, o1, etc.)
    const reasoningContent = message.reasoning_content;
    // Extract reasoning tokens from usage details
    const reasoningTokens = data.usage?.completion_tokens_details?.reasoning_tokens;

    return {
      id: data.id,
      model: data.model,
      content: message.content || '',
      message: this.parseMessage(message),
      toolCalls: message.tool_calls ? this.parseToolCalls(message.tool_calls) : undefined,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      finishReason: choice.finish_reason,
      duration: 0,
      metadata: {
        created: data.created,
        systemFingerprint: data.system_fingerprint
      },
      reasoningContent,
      reasoningTokens
    };
  }

  parseStreamChunk(data: any, config: FormatterConfig): ParseStreamChunkResult {
    const choice = data.choices[0];
    if (!choice) {
      return { chunk: { done: false }, valid: false };
    }

    const delta = choice.delta;
    const toolCalls = delta.tool_calls ? this.parseToolCalls(delta.tool_calls) : undefined;

    // Extract reasoning content delta (for DeepSeek R1, o1, etc.)
    const reasoningDelta = delta.reasoning_content;

    // Extract reasoning tokens from usage details
    const reasoningTokens = data.usage?.completion_tokens_details?.reasoning_tokens;

    return {
      chunk: {
        delta: delta.content || '',
        done: choice.finish_reason === 'stop',
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined,
        finishReason: choice.finish_reason,
        modelVersion: data.model,
        raw: data,
        reasoningDelta
      },
      valid: true
    };
  }

  convertTools(tools: ToolSchema[]): any {
    return convertToolsToOpenAIFormat(tools);
  }

  convertMessages(messages: LLMMessage[]): any[] {
    return messages.map(msg => {
      const converted: any = {
        role: msg.role,
        content: msg.content
      };

      // 添加工具调用
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        converted.tool_calls = msg.toolCalls.map(call => ({
          id: call.id,
          type: call.type,
          function: {
            name: call.function.name,
            arguments: call.function.arguments
          }
        }));
      }

      // 添加工具调用 ID
      if (msg.toolCallId) {
        converted.tool_call_id = msg.toolCallId;
      }

      return converted;
    });
  }

  parseToolCalls(toolCalls: any[]): LLMToolCall[] {
    return toolCalls.map(call => ({
      id: call.id,
      type: call.type || 'function',
      function: {
        name: call.function.name,
        arguments: typeof call.function.arguments === 'string'
          ? call.function.arguments
          : JSON.stringify(call.function.arguments)
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
      messages: this.convertMessages(request.messages),
      stream: config.stream || false
    };

    // 合并参数（排除 stream，已单独处理）
    const { stream, ...otherParams } = parameters;
    Object.assign(body, otherParams);

    // 添加工具
    if (request.tools && request.tools.length > 0) {
      body.tools = this.convertTools(request.tools);
    }

    // Handle reasoning configuration (for o1, DeepSeek R1, etc.)
    // Users can set parameters.reasoning = { effort: 'high', summary: 'detailed' }
    // The deepMerge will handle this correctly

    return body;
  }

  /**
   * 解析消息
   */
  private parseMessage(message: any): LLMMessage {
    return {
      role: message.role,
      content: message.content || '',
      toolCalls: message.tool_calls ? this.parseToolCalls(message.tool_calls) : undefined
    };
  }
}
