/**
 * OpenAI Response API 格式转换器
 *
 * 实现 OpenAI Response API 的请求和响应格式转换
 * 使用 /responses 端点
 * 支持 reasoning_effort、previous_response_id 等特殊参数
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
 * OpenAI Response API 格式转换器
 */
export class OpenAIResponseFormatter extends BaseFormatter {
  getSupportedProvider(): string {
    return 'OPENAI_RESPONSE';
  }

  buildRequest(request: LLMRequest, config: FormatterConfig): BuildRequestResult {
    const body = this.buildRequestBody(request, config);

    return {
      httpRequest: {
        url: '/responses',
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
    const output = data.output || [];
    const lastOutput = output[output.length - 1] || {};

    return {
      id: data.id,
      model: data.model,
      content: lastOutput.content?.[0]?.text || '',
      message: {
        role: 'assistant',
        content: lastOutput.content?.[0]?.text || '',
        toolCalls: lastOutput.tool_calls ? this.parseToolCalls(lastOutput.tool_calls) : undefined
      },
      toolCalls: lastOutput.tool_calls ? this.parseToolCalls(lastOutput.tool_calls) : undefined,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens || 0,
        completionTokens: data.usage.output_tokens || 0,
        totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
      } : undefined,
      finishReason: data.status || 'completed',
      duration: 0,
      metadata: {
        status: data.status,
        created: data.created_at,
        previousResponseId: data.previous_response_id
      }
    };
  }

  parseStreamChunk(data: any, config: FormatterConfig): ParseStreamChunkResult {
    const output = data.output || [];
    const lastOutput = output[output.length - 1] || {};

    return {
      chunk: {
        delta: lastOutput.content?.[0]?.text || '',
        done: data.status === 'completed',
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens || 0,
          completionTokens: data.usage.output_tokens || 0,
          totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
        } : undefined,
        finishReason: data.status,
        modelVersion: data.model,
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
   * Response API 使用 input 字段而不是 messages
   */
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
   * Response API 使用不同的请求格式
   */
  private buildRequestBody(request: LLMRequest, config: FormatterConfig): any {
    const parameters = this.mergeParameters(config.profile.parameters, request.parameters);

    const body: any = {
      model: config.profile.model,
      input: this.convertMessages(request.messages),
      stream: config.stream || false
    };

    // 合并参数（特殊参数和通用参数都直接合并）
    const { stream, ...otherParams } = parameters;
    Object.assign(body, otherParams);

    // 添加工具
    if (request.tools && request.tools.length > 0) {
      body.tools = this.convertTools(request.tools);
    }

    return body;
  }
}
