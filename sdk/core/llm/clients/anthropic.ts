/**
 * Anthropic客户端实现
 *
 * 实现Anthropic API调用，处理Anthropic特定的请求和响应格式
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
 * Anthropic客户端
 */
export class AnthropicClient extends BaseLLMClient {
  private readonly httpClient: HttpClient;
  private readonly apiVersion: string;

  constructor(profile: LLMProfile) {
    super(profile);
    this.httpClient = new HttpClient({
      baseURL: profile.baseUrl || 'https://api.anthropic.com',
      timeout: profile.timeout || 30000,
      maxRetries: profile.maxRetries || 3,
      retryDelay: profile.retryDelay || 1000,
      enableCircuitBreaker: true,
      enableRateLimiter: true,
    });
    this.apiVersion = profile.metadata?.['apiVersion'] || '2023-06-01';
  }

  /**
   * 执行非流式生成
   */
  protected async doGenerate(request: LLMRequest): Promise<LLMResult> {
    const response = await this.httpClient.post(
      '/v1/messages',
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
      `${this.profile.baseUrl || 'https://api.anthropic.com'}/v1/messages`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
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
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
            continue;
          }

          const dataStr = trimmedLine.slice(6);
          try {
            const data = JSON.parse(dataStr);
            const chunk = this.parseStreamChunk(data, request);
            if (chunk) {
              yield chunk;
            }

            // 检查是否结束
            if (data.type === 'message_stop') {
              return;
            }
          } catch (e) {
            // 跳过无效JSON
            continue;
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
      'x-api-key': this.profile.apiKey,
      'anthropic-version': this.apiVersion,
      'anthropic-dangerous-direct-browser-access': 'false'
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
      max_tokens: request.parameters?.['max_tokens'] || 4096,
      stream
    };

    // 合并其他参数
    if (request.parameters) {
      const { max_tokens, ...otherParams } = request.parameters;
      Object.assign(body, otherParams);
    }

    // 添加系统消息（如果有）
    const systemMessage = request.messages.find(msg => msg.role === 'system');
    if (systemMessage) {
      body.system = systemMessage.content;
      // 从messages中移除system消息
      body.messages = body.messages.filter((msg: any) => msg.role !== 'system');
    }

    // 添加工具
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters
      }));
    }

    return body;
  }

  /**
   * 转换消息格式
   */
  private convertMessages(messages: LLMMessage[]): any[] {
    return messages
      .filter(msg => msg.role !== 'system') // Anthropic不支持system消息在messages数组中
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

  /**
   * 解析响应
   */
  private parseResponse(data: any, request: LLMRequest): LLMResult {
    const content = this.extractContent(data.content);
    const toolCalls = this.extractToolCalls(data.content);

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
      }
    };
  }

  /**
   * 解析流式响应块
   */
  private parseStreamChunk(data: any, request: LLMRequest): LLMResult | null {
    switch (data.type) {
      case 'content_block_delta':
        // 文本增量事件
        if (data.delta && data.delta.type === 'text_delta' && data.delta.text) {
          return {
            id: request.profileId || 'unknown',
            model: this.profile.model,
            content: data.delta.text,
            message: {
              role: 'assistant',
              content: data.delta.text
            },
            finishReason: '',
            duration: 0
          };
        }
        break;

      case 'content_block_start':
        // 内容块开始事件（工具调用）
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
            id: request.profileId || 'unknown',
            model: this.profile.model,
            content: '',
            message: {
              role: 'assistant',
              content: '',
              toolCalls: [toolCall]
            },
            toolCalls: [toolCall],
            finishReason: '',
            duration: 0
          };
        }
        break;

      case 'message_delta':
        // 消息增量事件（包含使用情况）
        if (data.usage) {
          return {
            id: request.profileId || 'unknown',
            model: this.profile.model,
            content: '',
            message: {
              role: 'assistant',
              content: ''
            },
            usage: {
              promptTokens: data.usage.input_tokens || 0,
              completionTokens: data.usage.output_tokens || 0,
              totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
            },
            finishReason: data.delta?.stop_reason || '',
            duration: 0
          };
        }
        break;

      default:
        // 其他事件类型忽略
        break;
    }

    return null;
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
}