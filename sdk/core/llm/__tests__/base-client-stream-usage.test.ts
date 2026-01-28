/**
 * BaseLLMClient 流式响应 Token 统计测试
 */

import { BaseLLMClient } from '../base-client';
import type { LLMRequest, LLMResult, LLMProfile } from '../../../types/llm';

// 创建一个测试用的客户端实现
class TestStreamClient extends BaseLLMClient {
  constructor(profile: LLMProfile) {
    super(profile);
  }

  protected async doGenerate(request: LLMRequest): Promise<LLMResult> {
    throw new Error('Not implemented');
  }

  protected async *doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    // 模拟流式响应，包含多个 chunk
    // 模拟 message_start 事件（包含初始 usage）
    yield {
      id: 'test-1',
      model: 'test-model',
      content: '',
      message: { role: 'assistant', content: '' },
      usage: {
        promptTokens: 100,
        completionTokens: 0,
        totalTokens: 100
      },
      finishReason: '',
      duration: 0
    };

    // 模拟 content_block_delta 事件（文本增量）
    yield {
      id: 'test-2',
      model: 'test-model',
      content: 'Hello',
      message: { role: 'assistant', content: 'Hello' },
      finishReason: '',
      duration: 0
    };

    yield {
      id: 'test-3',
      model: 'test-model',
      content: ' world',
      message: { role: 'assistant', content: ' world' },
      finishReason: '',
      duration: 0
    };

    // 模拟 message_delta 事件（包含更新的 usage）
    yield {
      id: 'test-4',
      model: 'test-model',
      content: '',
      message: { role: 'assistant', content: '' },
      usage: {
        promptTokens: 100,
        completionTokens: 10,
        totalTokens: 110
      },
      finishReason: '',
      duration: 0
    };

    // 模拟最后一个 chunk（包含 finishReason）
    yield {
      id: 'test-5',
      model: 'test-model',
      content: '!',
      message: { role: 'assistant', content: '!' },
      finishReason: 'stop',
      duration: 0
    };
  }

  protected parseResponse(data: any): LLMResult {
    throw new Error('Not implemented');
  }

  protected parseStreamChunk(data: any): LLMResult | null {
    throw new Error('Not implemented');
  }
}

describe('BaseLLMClient 流式响应 Token 统计', () => {
  let client: TestStreamClient;
  let profile: LLMProfile;

  beforeEach(() => {
    profile = {
      id: 'test-profile',
      name: 'Test Profile',
      provider: 'OPENAI_CHAT' as any,
      model: 'test-model',
      apiKey: 'test-key',
      parameters: {}
    };
    client = new TestStreamClient(profile);
  });

  it('应该在流式响应中正确累积 token 统计', async () => {
    const request: LLMRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      stream: true
    };

    const chunks: LLMResult[] = [];
    for await (const chunk of client.generateStream(request)) {
      chunks.push(chunk);
    }

    // 验证收到了所有 chunk
    expect(chunks.length).toBe(5);

    // 验证第一个 chunk 包含初始 usage
    expect(chunks[0]!.usage).toBeDefined();
    expect(chunks[0]!.usage?.promptTokens).toBe(100);
    expect(chunks[0]!.usage?.completionTokens).toBe(0);
    expect(chunks[0]!.usage?.totalTokens).toBe(100);

    // 验证中间的 chunk 不包含 usage（除了 message_delta 事件）
    expect(chunks[1]!.usage).toBeUndefined();
    expect(chunks[2]!.usage).toBeUndefined();

    // 验证 message_delta 事件包含更新的 usage
    expect(chunks[3]!.usage).toBeDefined();
    expect(chunks[3]!.usage?.promptTokens).toBe(100);
    expect(chunks[3]!.usage?.completionTokens).toBe(10);
    expect(chunks[3]!.usage?.totalTokens).toBe(110);

    // 验证最后一个 chunk（有 finishReason）包含累积的 usage
    expect(chunks[4]!.finishReason).toBe('stop');
    expect(chunks[4]!.usage).toBeDefined();
    expect(chunks[4]!.usage?.promptTokens).toBe(100);
    expect(chunks[4]!.usage?.completionTokens).toBe(10);
    expect(chunks[4]!.usage?.totalTokens).toBe(110);
  });

  it('应该在没有 usage 的流式响应中正常工作', async () => {
    // 创建一个不返回 usage 的测试客户端
    class NoUsageClient extends TestStreamClient {
      protected override async *doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult> {
        yield {
          id: 'test-1',
          model: 'test-model',
          content: 'Hello',
          message: { role: 'assistant', content: 'Hello' },
          finishReason: '',
          duration: 0
        };

        yield {
          id: 'test-2',
          model: 'test-model',
          content: ' world',
          message: { role: 'assistant', content: ' world' },
          finishReason: 'stop',
          duration: 0
        };
      }
    }

    const noUsageClient = new NoUsageClient(profile);
    const request: LLMRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      stream: true
    };

    const chunks: LLMResult[] = [];
    for await (const chunk of noUsageClient.generateStream(request)) {
      chunks.push(chunk);
    }

    // 验证收到了所有 chunk
    expect(chunks.length).toBe(2);

    // 验证所有 chunk 都没有 usage
    expect(chunks[0]!.usage).toBeUndefined();
    expect(chunks[1]!.usage).toBeUndefined();
  });

  it('应该在多次流式更新中正确累积 usage', async () => {
    // 创建一个多次更新 usage 的测试客户端
    class MultiUpdateClient extends TestStreamClient {
      protected override async *doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult> {
        // 第一次 usage 更新
        yield {
          id: 'test-1',
          model: 'test-model',
          content: '',
          message: { role: 'assistant', content: '' },
          usage: {
            promptTokens: 100,
            completionTokens: 5,
            totalTokens: 105
          },
          finishReason: '',
          duration: 0
        };

        // 第二次 usage 更新
        yield {
          id: 'test-2',
          model: 'test-model',
          content: 'Hello',
          message: { role: 'assistant', content: 'Hello' },
          usage: {
            promptTokens: 100,
            completionTokens: 10,
            totalTokens: 110
          },
          finishReason: '',
          duration: 0
        };

        // 第三次 usage 更新
        yield {
          id: 'test-3',
          model: 'test-model',
          content: ' world',
          message: { role: 'assistant', content: ' world' },
          usage: {
            promptTokens: 100,
            completionTokens: 15,
            totalTokens: 115
          },
          finishReason: '',
          duration: 0
        };

        // 最后一个 chunk
        yield {
          id: 'test-4',
          model: 'test-model',
          content: '!',
          message: { role: 'assistant', content: '!' },
          finishReason: 'stop',
          duration: 0
        };
      }
    }

    const multiUpdateClient = new MultiUpdateClient(profile);
    const request: LLMRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      stream: true
    };

    const chunks: LLMResult[] = [];
    for await (const chunk of multiUpdateClient.generateStream(request)) {
      chunks.push(chunk);
    }

    // 验证收到了所有 chunk
    expect(chunks.length).toBe(4);

    // 验证最后一个 chunk 包含最新的累积 usage
    expect(chunks[3]!.usage).toBeDefined();
    expect(chunks[3]!.usage?.promptTokens).toBe(100);
    expect(chunks[3]!.usage?.completionTokens).toBe(15);
    expect(chunks[3]!.usage?.totalTokens).toBe(115);
  });
});