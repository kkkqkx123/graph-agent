/**
 * OpenAI Response客户端实现
 *
 * 实现OpenAI Response API调用，使用/responses端点
 * 支持reasoning_effort、previous_response_id等特殊参数
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
 * OpenAI Response客户端
 */
export class OpenAIResponseClient extends BaseLLMClient {
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
      '/responses',
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
      `${this.profile.baseUrl || 'https://api.openai.com/v1'}/responses`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Response API error (${response.status}): ${error}`);
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
   * Response API使用不同的请求格式
   */
  private buildRequestBody(request: LLMRequest, stream: boolean = false): any {
    const body: any = {
      model: this.profile.model,
      input: this.convertMessages(request.messages),
      stream
    };

    // Response API特有的参数
    if (request.parameters) {
      // reasoning_effort: 推理努力程度
      if (request.parameters['reasoning_effort']) {
        body.reasoning_effort = request.parameters['reasoning_effort'];
      }

      // previous_response_id: 前一个响应ID，用于连续对话
      if (request.parameters['previous_response_id']) {
        body.previous_response_id = request.parameters['previous_response_id'];
      }

      // verbosity: 详细程度
      if (request.parameters['verbosity']) {
        body.verbosity = request.parameters['verbosity'];
      }

      // 其他通用参数
      const { reasoning_effort, previous_response_id, verbosity, ...otherParams } = request.parameters;
      Object.assign(body, otherParams);
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
  private parseResponse(data: any, request: LLMRequest): LLMResult {
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
  private parseStreamChunk(data: any, request: LLMRequest): LLMResult | null {
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