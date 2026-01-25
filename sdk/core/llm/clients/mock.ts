/**
 * Mock客户端实现
 * 
 * 提供模拟的LLM响应，用于测试和开发
 * 支持配置化的响应和延迟模拟
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
 * Mock客户端配置
 */
interface MockConfig {
  /** 模拟响应内容 */
  response?: string;
  /** 模拟延迟（毫秒） */
  delay?: number;
  /** 模拟工具调用 */
  mockToolCalls?: LLMToolCall[];
  /** 模拟Token使用情况 */
  mockUsage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * Mock客户端
 */
export class MockClient extends BaseLLMClient {
  private readonly mockConfig: MockConfig;

  constructor(profile: LLMProfile) {
    super(profile);
    this.mockConfig = profile.metadata?.['mockConfig'] || {};
  }

  /**
   * 执行非流式生成
   */
  protected async doGenerate(request: LLMRequest): Promise<LLMResult> {
    // 模拟延迟
    const delay = this.mockConfig.delay || 0;
    if (delay > 0) {
      await this.sleep(delay);
    }

    // 生成模拟响应
    const response = this.generateMockResponse(request);
    return response;
  }

  /**
   * 执行流式生成
   */
  protected async *doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    // 模拟延迟
    const delay = this.mockConfig.delay || 0;
    if (delay > 0) {
      await this.sleep(delay);
    }

    // 生成模拟响应
    const response = this.generateMockResponse(request);

    // 将响应拆分为多个块
    const chunks = this.splitIntoChunks(response.content, 10);

    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i] || '';
      const chunk: LLMResult = {
        id: response.id,
        model: response.model,
        content: chunkContent,
        message: {
          role: 'assistant',
          content: chunkContent
        },
        finishReason: i === chunks.length - 1 ? response.finishReason : '',
        duration: 0
      };

      yield chunk;

      // 模拟流式延迟
      if (i < chunks.length - 1) {
        await this.sleep(50);
      }
    }
  }

  /**
   * 生成模拟响应
   */
  private generateMockResponse(request: LLMRequest): LLMResult {
    const responseText = this.mockConfig.response || this.generateDefaultResponse(request);
    const toolCalls = this.mockConfig.mockToolCalls || this.generateMockToolCalls(request);
    const mockUsage = this.mockConfig.mockUsage;
    const usage = mockUsage ? {
      ...mockUsage,
      totalTokens: mockUsage.promptTokens + mockUsage.completionTokens
    } : this.calculateMockUsage(request, responseText);

    return {
      id: `mock-${Date.now()}`,
      model: this.profile.model,
      content: responseText,
      message: {
        role: 'assistant',
        content: responseText,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      },
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      duration: 0,
      metadata: {
        mock: true,
        timestamp: Date.now()
      }
    };
  }

  /**
   * 生成默认响应
   */
  private generateDefaultResponse(request: LLMRequest): string {
    const lastMessage = request.messages[request.messages.length - 1];
    const userContent = typeof lastMessage?.content === 'string'
      ? lastMessage.content
      : JSON.stringify(lastMessage?.content || '');

    return `This is a mock response to: "${userContent}"\n\nMock client is working correctly. Configure custom responses using the mockConfig in the profile metadata.`;
  }

  /**
   * 生成模拟工具调用
   */
  private generateMockToolCalls(request: LLMRequest): LLMToolCall[] {
    if (!request.tools || request.tools.length === 0) {
      return [];
    }

    // 如果请求中有工具，返回第一个工具的模拟调用
    const tool = request.tools[0];
    if (!tool) {
      return [];
    }

    return [{
      id: `mock-call-${Date.now()}`,
      type: 'function',
      function: {
        name: tool.name,
        arguments: JSON.stringify({
          mock: true,
          timestamp: Date.now()
        })
      }
    }];
  }

  /**
   * 计算模拟Token使用情况
   */
  private calculateMockUsage(request: LLMRequest, responseText: string): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } {
    // 简单估算：每个字符约等于0.25个token
    const promptText = JSON.stringify(request.messages);
    const promptTokens = Math.ceil(promptText.length * 0.25);
    const completionTokens = Math.ceil(responseText.length * 0.25);

    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens
    };
  }

  /**
   * 将文本拆分为多个块
   */
  private splitIntoChunks(text: string, chunkCount: number): string[] {
    if (chunkCount <= 1) {
      return [text];
    }

    const chunks: string[] = [];
    const chunkSize = Math.ceil(text.length / chunkCount);

    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    return chunks;
  }

  /**
   * 延迟函数
   */
  protected override async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}