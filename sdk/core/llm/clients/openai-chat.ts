/**
 * OpenAI Chat客户端实现
 *
 * 实现OpenAI Chat API调用，使用/chat/completions端点
 * 支持流式和非流式调用
 */

import { BaseLLMClient } from '../base-client';
import { HttpClient } from '../../http';
import type {
  LLMRequest,
  LLMResult,
  LLMProfile,
  LLMMessage,
  LLMToolCall
} from '../../../types/llm';

/**
 * OpenAI Chat客户端
 */
export class OpenAIChatClient extends BaseLLMClient {
  private readonly httpClient: HttpClient;

  constructor(profile: LLMProfile) {
    super(profile);
    this.httpClient = new HttpClient({
      baseURL: profile.baseUrl || 'https://api.openai.com/v1',
      timeout: profile.timeout || 30000,
      maxRetries: profile.maxRetries || 3,
      retryDelay: profile.retryDelay || 1000,
      enableCircuitBreaker: true,
      enableRateLimiter: true,
    });
  }

  /**
   * 执行非流式生成
   */
  protected async doGenerate(request: LLMRequest): Promise<LLMResult> {
    const response = await this.httpClient.post(
      '/chat/completions',
      this.buildRequestBody(request),
      {
        headers: this.buildHeaders(),
      }
    );

    return this.parseResponse(response.data, request);
  }

  /**
   * 执行流式生成
   */
  protected async *doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    const body = this.buildRequestBody(request, true);
    const headers = this.buildHeaders();

    const response = await fetch(
      `${this.profile.baseUrl || 'https://api.openai.com/v1'}/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Chat API error (${response.status}): ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') {
            continue;
          }

          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6);
            try {
              const data = JSON.parse(dataStr);
              const chunk = this.parseStreamChunk(data, request);
              if (chunk) {
                yield chunk;
              }
            } catch (e) {
              // 跳过无效JSON
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 构建请求头
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.profile.apiKey}`
    };

    // 添加自定义headers（用于第三方API渠道）
    if (this.profile.headers) {
      Object.assign(headers, this.profile.headers);
    }

    return headers;
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
      body.tools = request.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
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
  private parseResponse(data: any, request: LLMRequest): LLMResult {
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
   */
  private parseStreamChunk(data: any, request: LLMRequest): LLMResult | null {
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