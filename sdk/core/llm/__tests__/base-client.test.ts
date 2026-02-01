/**
 * BaseLLMClient 单元测试
 */

import { BaseLLMClient } from '../base-client';
import type { LLMProfile, LLMRequest, LLMResult } from '../../../types/llm';
import { LLMError } from '../../../types/errors';

// 创建测试用的具体实现
class TestLLMClient extends BaseLLMClient {
  protected override async doGenerate(request: LLMRequest): Promise<LLMResult> {
    return {
      id: 'test-result-id',
      model: 'gpt-4',
      content: 'Test response',
      message: {
        role: 'assistant',
        content: 'Test response'
      },
      finishReason: 'stop',
      duration: 0,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    };
  }

  protected override async *doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    yield {
      id: 'test-result-id-1',
      model: 'gpt-4',
      content: 'Test',
      message: {
        role: 'assistant',
        content: 'Test'
      },
      finishReason: '',
      duration: 0,
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15
      }
    };
    yield {
      id: 'test-result-id-2',
      model: 'gpt-4',
      content: 'Test response',
      message: {
        role: 'assistant',
        content: 'Test response'
      },
      finishReason: 'stop',
      duration: 0,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    };
  }

  protected parseResponse(data: any): LLMResult {
    return data;
  }

  protected parseStreamChunk(data: any): LLMResult | null {
    return data;
  }
}

describe('BaseLLMClient', () => {
  let testProfile: LLMProfile;
  let client: TestLLMClient;

  beforeEach(() => {
    testProfile = {
      id: 'test-profile',
      name: 'Test Profile',
      provider: 'openai' as any,
      model: 'gpt-4',
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      parameters: {
        temperature: 0.7,
        maxTokens: 1000
      }
    };
    client = new TestLLMClient(testProfile);
  });

  describe('构造函数', () => {
    it('应该正确初始化客户端', () => {
      expect(client).toBeInstanceOf(BaseLLMClient);
    });

    it('应该正确设置profile', () => {
      const info = client.getClientInfo();
      expect(info.provider).toBe('openai');
      expect(info.model).toBe('gpt-4');
    });
  });

  describe('generate', () => {
    it('应该成功执行非流式生成', async () => {
      const request: LLMRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const result = await client.generate(request);

      expect(result.message.role).toBe('assistant');
      expect(result.finishReason).toBe('stop');
      expect(result.usage).toBeDefined();
    });

    it('应该正确合并请求参数', async () => {
      const request: LLMRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        parameters: {
          temperature: 0.9,
          maxTokens: 2000
        }
      };

      const result = await client.generate(request);
      expect(result).toBeDefined();
    });

    it('应该正确处理错误', async () => {
      class ErrorClient extends TestLLMClient {
        protected override async doGenerate(request: LLMRequest): Promise<LLMResult> {
          throw new Error('API error');
        }
      }

      const errorClient = new ErrorClient(testProfile);
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(errorClient.generate(request)).rejects.toThrow(LLMError);
    });
  });

  describe('generateStream', () => {
    it('应该成功执行流式生成', async () => {
      const request: LLMRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const chunks: LLMResult[] = [];
      for await (const chunk of client.generateStream(request)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk?.finishReason).toBe('stop');
    });

    it('应该累积token统计信息', async () => {
      const request: LLMRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const chunks: LLMResult[] = [];
      for await (const chunk of client.generateStream(request)) {
        chunks.push(chunk);
      }

      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk).toBeDefined();
      expect(lastChunk?.usage).toBeDefined();
      expect(lastChunk?.usage?.totalTokens).toBe(30);
    });

    it('应该正确处理流式错误', async () => {
      class ErrorStreamClient extends TestLLMClient {
        protected override async *doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult> {
          throw new Error('Stream error');
        }
      }

      const errorClient = new ErrorStreamClient(testProfile);
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(
        (async () => {
          for await (const _ of errorClient.generateStream(request)) {
            // 消费流
          }
        })()
      ).rejects.toThrow(LLMError);
    });
  });

  describe('mergeParameters', () => {
    it('应该正确合并profile和request参数', () => {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        parameters: {
          temperature: 0.9,
          topP: 0.95
        }
      };

      const merged = (client as any).mergeParameters(request);

      expect(merged.parameters.temperature).toBe(0.9);
      expect(merged.parameters.maxTokens).toBe(1000);
      expect(merged.parameters.topP).toBe(0.95);
    });

    it('request参数应该覆盖profile参数', () => {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        parameters: {
          temperature: 0.9,
          maxTokens: 2000
        }
      };

      const merged = (client as any).mergeParameters(request);

      expect(merged.parameters.temperature).toBe(0.9);
      expect(merged.parameters.maxTokens).toBe(2000);
    });
  });

  describe('handleError', () => {
    it('应该正确处理普通错误', () => {
      const error = new Error('Test error');
      const handled = (client as any).handleError(error);

      expect(handled).toBeInstanceOf(LLMError);
      expect(handled.message).toContain('openai API error');
    });

    it('应该正确处理带code的错误', () => {
      const error = new Error('Test error') as any;
      error.code = 401;
      const handled = (client as any).handleError(error);

      expect(handled).toBeInstanceOf(LLMError);
      expect(handled.statusCode).toBe(401);
    });

    it('应该正确处理带status的错误', () => {
      const error = new Error('Test error') as any;
      error.status = 500;
      const handled = (client as any).handleError(error);

      expect(handled).toBeInstanceOf(LLMError);
      expect(handled.statusCode).toBe(500);
    });
  });

  describe('parseStreamLine', () => {
    it('应该跳过空行', () => {
      const result = (client as any).parseStreamLine('');
      expect(result).toBeNull();
    });

    it('应该跳过[DONE]标记', () => {
      const result = (client as any).parseStreamLine('data: [DONE]');
      expect(result).toBeNull();
    });

    it('应该跳过非data:开头的行', () => {
      const result = (client as any).parseStreamLine('invalid line');
      expect(result).toBeNull();
    });

    it('应该正确解析有效的data:行', () => {
      const line = 'data: {"type":"test","content":"hello"}';
      const result = (client as any).parseStreamLine(line);
      expect(result).toBeDefined();
    });

    it('应该跳过无效的JSON', () => {
      const line = 'data: {invalid json}';
      const result = (client as any).parseStreamLine(line);
      expect(result).toBeNull();
    });
  });

  describe('getClientInfo', () => {
    it('应该返回正确的客户端信息', () => {
      const info = client.getClientInfo();

      expect(info.provider).toBe('openai');
      expect(info.model).toBe('gpt-4');
      expect(info.version).toBeDefined();
    });
  });
});