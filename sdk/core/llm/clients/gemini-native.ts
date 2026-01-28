/**
 * Gemini Native客户端实现
 *
 * 实现Gemini Native API调用，使用Gemini原生端点
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
import { generateId } from '../../../utils';

/**
 * Gemini Native客户端
 */
export class GeminiNativeClient extends BaseLLMClient {
  constructor(profile: LLMProfile) {
    super(profile);
  }

  /**
   * 执行非流式生成
   */
  protected async doGenerate(request: LLMRequest): Promise<LLMResult> {
    return this.doHttpPost(
      `/models/${this.profile.model}:generateContent`,
      this.buildRequestBody(request),
      {
        headers: this.buildHeaders(),
        query: { key: this.profile.apiKey },
      }
    );
  }

  /**
   * 执行流式生成
   */
  protected async *doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    yield* this.doHttpStream(
      `/models/${this.profile.model}:streamGenerateContent`,
      this.buildRequestBody(request),
      {
        headers: this.buildHeaders(),
        query: { key: this.profile.apiKey },
      }
    );
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
   */
  private buildRequestBody(request: LLMRequest): any {
    const body: any = {
      contents: this.convertMessages(request.messages),
      generationConfig: {
        temperature: request.parameters?.['temperature'] || 0.7,
        maxOutputTokens: request.parameters?.['max_tokens'] || 4096,
        topP: request.parameters?.['top_p'] || 1.0,
        topK: request.parameters?.['top_k'] || 40
      }
    };

    // 添加系统指令（如果有）
    const systemMessage = request.messages.find(msg => msg.role === 'system');
    if (systemMessage) {
      body.systemInstruction = {
        parts: [{
          text: typeof systemMessage.content === 'string' 
            ? systemMessage.content 
            : JSON.stringify(systemMessage.content)
        }]
      };
    }

    // 添加工具
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map(tool => ({
        functionDeclarations: [{
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }]
      }));
    }

    return body;
  }

  /**
   * 转换消息格式
   */
  private convertMessages(messages: LLMMessage[]): any[] {
    return messages
      .filter(msg => msg.role !== 'system') // Gemini使用systemInstruction处理系统消息
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

  /**
   * 解析响应
   */
  protected parseResponse(data: any): LLMResult {
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
   * 解析流式响应行（重写）
   *
   * Gemini Native API 直接返回 JSON，没有 data: 前缀
   */
  protected override parseStreamLine(line: string): LLMResult | null {
    // 跳过空行
    if (!line) {
      return null;
    }

    // Gemini Native API 直接返回 JSON，没有 data: 前缀
    try {
      const data = JSON.parse(line);
      return this.parseStreamChunk(data);
    } catch (e) {
      // 跳过无效JSON
      return null;
    }
  }

  /**
   * 解析流式响应块
   */
  protected parseStreamChunk(data: any): LLMResult | null {
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
        id: generateId(),
        type: 'function',
        function: {
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args || {})
        }
      }));
  }
}