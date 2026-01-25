/**
 * Gemini OpenAI兼容客户端实现
 * 
 * 实现Gemini OpenAI兼容API调用，使用Gemini的OpenAI兼容端点
 * 支持thinking_budget、cached_content等特殊参数
 * 支持流式和非流式调用
 */

import { BaseLLMClient } from '../base-client';
import type {
  LLMRequest,
  LLMResult,
  LLMProfile,
  LLMMessage,
  LLMToolCall
} from '../../../types/llm';

/**
 * Gemini OpenAI兼容客户端
 */
export class GeminiOpenAIClient extends BaseLLMClient {
  private readonly baseUrl: string;

  constructor(profile: LLMProfile) {
    super(profile);
    this.baseUrl = profile.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai';
  }

  /**
   * 执行非流式生成
   */
  protected async doGenerate(request: LLMRequest): Promise<LLMResult> {
    const url = `${this.baseUrl}/chat/completions`;
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(request);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini OpenAI API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return this.parseResponse(data, request);
  }

  /**
   * 执行流式生成
   */
  protected async *doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    const url = `${this.baseUrl}/chat/completions`;
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(request, true);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini OpenAI API error (${response.status}): ${error}`);
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
      'Content-Type': 'application/json'
    };

    // 添加自定义headers（用于第三方API渠道）
    if (this.profile.headers) {
      Object.assign(headers, this.profile.headers);
    }

    return headers;
  }

  /**
   * 构建请求体
   * Gemini OpenAI兼容API使用OpenAI格式，但支持Gemini特有参数
   */
  private buildRequestBody(request: LLMRequest, stream: boolean = false): any {
    const body: any = {
      model: this.profile.model,
      messages: this.convertMessages(request.messages),
      stream
    };

    // 合并参数
    if (request.parameters) {
      // thinking_budget: 思考预算（Gemini特有）
      if (request.parameters['thinking_budget']) {
        body.thinking_budget = request.parameters['thinking_budget'];
      }

      // cached_content: 缓存内容（Gemini特有）
      if (request.parameters['cached_content']) {
        body.cached_content = request.parameters['cached_content'];
      }

      // 其他通用参数
      const { thinking_budget, cached_content, ...otherParams } = request.parameters;
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
   */
  private convertMessages(messages: LLMMessage[]): any[] {
    return messages
      .filter(msg => msg.role !== 'system') // Gemini OpenAI兼容API使用systemInstruction处理系统消息
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

  /**
   * 解析响应
   */
  private parseResponse(data: any, request: LLMRequest): LLMResult {
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No candidate in response');
    }

    const content = this.extractContent(candidate.content?.parts || []);
    const toolCalls = this.extractToolCalls(candidate.content?.parts || []);

    return {
      id: data.id || 'unknown',
      model: this.profile.model,
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
   * 解析流式响应块
   */
  private parseStreamChunk(data: any, request: LLMRequest): LLMResult | null {
    const candidate = data.candidates?.[0];
    if (!candidate) {
      return null;
    }

    const content = this.extractContent(candidate.content?.parts || []);
    const toolCalls = this.extractToolCalls(candidate.content?.parts || []);

    return {
      id: data.id || 'unknown',
      model: this.profile.model,
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
      finishReason: candidate.finishReason || '',
      duration: 0,
      metadata: {
        finishReason: candidate.finishReason
      }
    };
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
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'function',
        function: {
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args || {})
        }
      }));
  }
}