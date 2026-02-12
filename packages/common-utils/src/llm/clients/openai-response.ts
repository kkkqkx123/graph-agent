/**
 * OpenAI Response客户端实现
 *
 * 实现OpenAI Response API调用，使用/responses端点
 * 支持reasoning_effort、previous_response_id等特殊参数
 * 支持流式和非流式调用
 */

import { BaseLLMClient } from '../base-client';
import type {
  LLMRequest,
  LLMResult,
  LLMProfile,
  LLMMessage,
  LLMToolCall
} from '@modular-agent/types/llm';
import { convertToolsToOpenAIFormat } from '../tool-converter';

/**
 * OpenAI Response客户端
 */
export class OpenAIResponseClient extends BaseLLMClient {
  constructor(profile: LLMProfile) {
    super(profile);
  }

  /**
   * 执行非流式生成
   */
  protected async doGenerate(request: LLMRequest): Promise<LLMResult> {
    return this.doHttpPost(
      '/responses',
      this.buildRequestBody(request),
      {
        headers: this.buildHeaders(),
      }
    );
  }

  /**
   * 执行流式生成
   */
  protected async *doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    yield* this.doHttpStream(
      '/responses',
      this.buildRequestBody(request, true),
      {
        headers: this.buildHeaders(),
      }
    );
  }

  /**
   * 构建请求头
   */
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.profile.headers
    };
  }

  /**
   * 构建请求体
   * Response API使用不同的请求格式
   */
  private buildRequestBody(request: LLMRequest, stream: boolean = false): any {
    const body: any = {
      model: this.profile.model,
      input: this.convertMessages(request.messages),
      stream
    };

    // 合并参数（特殊参数和通用参数都直接合并）
    if (request.parameters) {
      Object.assign(body, request.parameters);
    }

    // 添加工具
    if (request.tools && request.tools.length > 0) {
      body.tools = convertToolsToOpenAIFormat(request.tools);
    }

    return body;
  }

  /**
   * 转换消息格式
   * Response API使用input字段而不是messages
   */
  private convertMessages(messages: LLMMessage[]): any[] {
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

      // 添加工具调用ID
      if (msg.toolCallId) {
        converted.tool_call_id = msg.toolCallId;
      }

      return converted;
    });
  }

  /**
   * 解析响应
   * Response API的响应格式与Chat API不同
   */
  protected parseResponse(data: any): LLMResult {
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

  /**
   * 解析流式响应块
   */
  protected parseStreamChunk(data: any): LLMResult | null {
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
      finishReason: data.status || '',
      duration: 0,
      metadata: {
        status: data.status,
        created: data.created_at
      }
    };
  }

  /**
   * 解析工具调用
   */
  private parseToolCalls(toolCalls: any[]): LLMToolCall[] {
    return toolCalls.map(call => ({
      id: call.id,
      type: call.type,
      function: {
        name: call.function.name,
        arguments: call.function.arguments
      }
    }));
  }
}