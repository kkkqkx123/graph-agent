/**
 * OpenAI Chat客户端实现
 *
 * 实现OpenAI Chat API调用，使用/chat/completions端点
 * 支持流式和非流式调用
 */

import { BaseLLMClient } from '../base-client';
import type {
  LLMRequest,
  LLMResult,
  LLMProfile,
  LLMMessage,
  LLMToolCall
} from '@modular-agent/types';
import { convertToolsToOpenAIFormat } from '../../tool';

/**
 * OpenAI Chat客户端
 */
export class OpenAIChatClient extends BaseLLMClient {
  constructor(profile: LLMProfile) {
    super(profile);
  }

  /**
   * 执行非流式生成
   */
  protected async doGenerate(request: LLMRequest): Promise<LLMResult> {
    return this.doHttpPost(
      '/chat/completions',
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
      '/chat/completions',
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
   */
  private buildRequestBody(request: LLMRequest, stream: boolean = false): any {
    const body: any = {
      model: this.profile.model,
      messages: this.convertMessages(request.messages),
      stream
    };

    // 合并参数
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
   */
  protected parseResponse(data: any): LLMResult {
    const choice = data.choices[0];
    const message = choice.message;

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
      }
    };
  }

  /**
   * 解析流式响应块
   *
   * OpenAI API 在流式响应中，usage 信息通常只出现在最后一个 chunk 中
   * 其他 chunk 包含内容增量，最后一个 chunk 包含完整的 usage 统计
   */
  protected parseStreamChunk(data: any): LLMResult | null {
    const choice = data.choices[0];
    if (!choice) return null;

    const delta = choice.delta;

    return {
      id: data.id,
      model: data.model,
      content: delta.content || '',
      message: {
        role: delta.role || 'assistant',
        content: delta.content || '',
        toolCalls: delta.tool_calls ? this.parseToolCalls(delta.tool_calls) : undefined
      },
      toolCalls: delta.tool_calls ? this.parseToolCalls(delta.tool_calls) : undefined,
      // OpenAI API: usage 信息通常只在最后一个 chunk 中提供
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      finishReason: choice.finish_reason || '',
      duration: 0,
      metadata: {
        created: data.created
      }
    };
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