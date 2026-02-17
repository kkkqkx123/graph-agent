/**
 * LLMWrapper 集成测试
 * 测试 LLMWrapper 的完整调用链，与实际调用场景完全一致
 * 
 * 测试范围：
 * - Profile 管理的完整流程
 * - 客户端创建和缓存的完整流程
 * - 非流式生成的完整调用链
 * - 流式生成的完整调用链
 * - Signal 中断的完整流程
 * - 错误处理和事件触发的完整流程
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMWrapper } from '../wrapper.js';
import type { LLMProfile, LLMRequest, LLMResult, LLMClient } from '@modular-agent/types';
import { LLMError, ConfigurationError, AbortError, ThreadInterruptedException } from '@modular-agent/types';
import { MessageStream } from '@modular-agent/common-utils';
import { EventManager } from '../../services/event-manager.js';

// 创建真实的 LLM 客户端模拟
class RealisticMockLLMClient implements LLMClient {
  private profile: LLMProfile;
  private shouldFail: boolean = false;
  private failureError: Error | null = null;
  private delayMs: number = 0;
  private streamDelayMs: number = 0;

  constructor(profile: LLMProfile) {
    this.profile = profile;
  }

  setFailure(shouldFail: boolean, error?: Error): void {
    this.shouldFail = shouldFail;
    this.failureError = error || new Error('Mock client error');
  }

  setDelay(delayMs: number): void {
    this.delayMs = delayMs;
  }

  setStreamDelay(delayMs: number): void {
    this.streamDelayMs = delayMs;
  }

  async generate(request: LLMRequest): Promise<LLMResult> {
    // 检查 signal
    if (request.signal?.aborted) {
      throw new AbortError('Operation aborted', request.signal.reason);
    }

    // 模拟延迟
    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }

    // 检查是否应该失败
    if (this.shouldFail) {
      throw this.failureError!;
    }

    // 返回模拟结果
    return {
      id: `mock-${Date.now()}`,
      model: this.profile.model,
      content: 'Mock response',
      message: {
        role: 'assistant',
        content: 'Mock response'
      },
      finishReason: 'stop',
      duration: 0
    };
  }

  async *generateStream(request: LLMRequest): AsyncIterable<LLMResult> {
    // 检查 signal
    if (request.signal?.aborted) {
      throw new AbortError('Operation aborted', request.signal.reason);
    }

    // 模拟流式响应 - 最后一个 chunk 包含完整内容
    const chunks = [
      { content: 'Mock', finishReason: '' },
      { content: ' ', finishReason: '' },
      { content: 'response', finishReason: 'stop' }
    ];

    let fullContent = '';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // 检查 signal（在每次迭代时）
      if (request.signal?.aborted) {
        throw new AbortError('Operation aborted', request.signal.reason);
      }

      // 模拟延迟
      if (this.streamDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, this.streamDelayMs));
      }

      // 检查是否应该失败
      if (this.shouldFail) {
        throw this.failureError!;
      }

      fullContent += chunk.content;

      // 最后一个 chunk 的 content 应该是完整内容
      const isLastChunk = i === chunks.length - 1;
      
      yield {
        id: `mock-${Date.now()}`,
        model: this.profile.model,
        content: isLastChunk ? fullContent : chunk.content,
        message: {
          role: 'assistant',
          content: fullContent  // 消息内容累积
        },
        finishReason: chunk.finishReason,
        duration: 0
      };
    }
  }
}

describe('LLMWrapper 集成测试', () => {
  let wrapper: LLMWrapper;
  let eventManager: EventManager;
  let mockClients: Map<string, RealisticMockLLMClient>;

  const testProfiles: LLMProfile[] = [
    {
      id: 'openai-profile',
      name: 'OpenAI Profile',
      provider: 'OPENAI_CHAT',
      model: 'gpt-4',
      apiKey: 'openai-api-key',
      parameters: {
        temperature: 0.7,
        maxTokens: 1000
      }
    },
    {
      id: 'anthropic-profile',
      name: 'Anthropic Profile',
      provider: 'ANTHROPIC',
      model: 'claude-3',
      apiKey: 'anthropic-api-key',
      parameters: {
        temperature: 0.5,
        maxTokens: 2000
      }
    }
  ];

  beforeEach(() => {
    eventManager = new EventManager();
    wrapper = new LLMWrapper(eventManager);
    mockClients = new Map();

    // 注册所有测试 profiles
    testProfiles.forEach(profile => {
      wrapper.registerProfile(profile);
      // 创建 mock 客户端
      const mockClient = new RealisticMockLLMClient(profile);
      mockClients.set(profile.id, mockClient);
    });

    // 替换 ClientFactory 的 createClient 方法 - 保留缓存逻辑
    const clientFactory = (wrapper as any).clientFactory;
    const originalGetCacheKey = clientFactory.getCacheKey.bind(clientFactory);
    const originalCreateClientByProvider = clientFactory.createClientByProvider.bind(clientFactory);
    
    // 重写 getCacheKey 以使用 profile id
    clientFactory.getCacheKey = (profile: LLMProfile) => profile.id;
    
    // 重写 createClientByProvider 以返回 mock 客户端
    clientFactory.createClientByProvider = (profile: LLMProfile) => {
      const mockClient = mockClients.get(profile.id);
      if (mockClient) {
        return mockClient;
      }
      return originalCreateClientByProvider(profile);
    };
  });

  afterEach(() => {
    wrapper.clearAll();
    vi.clearAllMocks();
  });

  describe('完整调用链：Profile 管理', () => {
    it('应该支持完整的 Profile 生命周期', () => {
      // 1. 注册 Profile
      const newProfile: LLMProfile = {
        id: 'new-profile',
        name: 'New Profile',
        provider: 'GEMINI_NATIVE',
        model: 'gemini-pro',
        apiKey: 'gemini-api-key',
        parameters: {}
      };
      wrapper.registerProfile(newProfile);

      // 2. 列出所有 Profiles
      const profiles = wrapper.listProfiles();
      expect(profiles).toHaveLength(3);
      expect(profiles).toContainEqual(newProfile);

      // 3. 获取特定 Profile
      const retrieved = wrapper.getProfile('new-profile');
      expect(retrieved).toEqual(newProfile);

      // 4. 设置默认 Profile
      wrapper.setDefaultProfile('new-profile');
      expect(wrapper.getDefaultProfileId()).toBe('new-profile');

      // 5. 删除 Profile
      wrapper.removeProfile('new-profile');
      expect(wrapper.listProfiles()).toHaveLength(2);
      // 注意：删除 profile 后，默认 profile ID 不会自动清除
    });

    it('应该正确处理客户端缓存', () => {
      const clientFactory = (wrapper as any).clientFactory;

      // 第一次创建客户端
      const client1 = clientFactory.createClient(testProfiles[0]);
      const stats1 = clientFactory.getCacheStats();
      expect(stats1.totalClients).toBe(1);

      // 第二次创建相同 profile 的客户端（应该使用缓存）
      const client2 = clientFactory.createClient(testProfiles[0]);
      const stats2 = clientFactory.getCacheStats();
      expect(stats2.totalClients).toBe(1);
      expect(client1).toBe(client2);

      // 创建不同 profile 的客户端
      const client3 = clientFactory.createClient(testProfiles[1]);
      const stats3 = clientFactory.getCacheStats();
      expect(stats3.totalClients).toBe(2);
      expect(client3).not.toBe(client1);

      // 清除特定 profile 的缓存
      clientFactory.clearClientCache(testProfiles[0].id);
      const stats4 = clientFactory.getCacheStats();
      expect(stats4.totalClients).toBe(1);

      // 清除所有缓存
      clientFactory.clearCache();
      const stats5 = clientFactory.getCacheStats();
      expect(stats5.totalClients).toBe(0);
    });
  });

  describe('完整调用链：非流式生成', () => {
    it('应该成功完成非流式生成的完整流程', async () => {
      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      // 执行生成
      const result = await wrapper.generate(request);

      // 验证结果
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toBe('Mock response');
        expect(result.value.model).toBe('gpt-4');
        expect(result.value.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('应该正确处理带参数的请求', async () => {
      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        parameters: {
          temperature: 0.9,
          maxTokens: 500
        }
      };

      const result = await wrapper.generate(request);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toBe('Mock response');
      }
    });

    it('应该正确处理带工具的请求', async () => {
      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'What is the weather?' }
        ],
        tools: [
          {
            id: 'get_weather',
            description: 'Get current weather',
            parameters: {
              properties: {
                location: { type: 'string' }
              },
              required: []
            }
          }
        ]
      };

      const result = await wrapper.generate(request);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('完整调用链：流式生成', () => {
    it('应该成功完成流式生成的完整流程', async () => {
      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const result = await wrapper.generateStream(request);

      // 验证结果
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stream = result.value;
        expect(stream).toBeInstanceOf(MessageStream);

        // 流处理已完成，直接验证流状态
        expect(stream.isEnded()).toBe(true);
        
        // 验证最终结果
        const finalResult = await stream.getFinalResult();
        expect(finalResult.content).toBe('Mock response');
      }
    });

    it('应该正确处理流式生成的完整数据流', async () => {
      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const result = await wrapper.generateStream(request);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stream = result.value;

        // 等待流结束
        await stream.done();

        // 验证最终结果
        const finalResult = await stream.getFinalResult();
        expect(finalResult.content).toBe('Mock response');
      }
    });

    it('应该正确获取最终结果', async () => {
      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const result = await wrapper.generateStream(request);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stream = result.value;

        // 等待流结束
        await stream.done();

        // 获取最终结果
        const finalResult = await stream.getFinalResult();
        expect(finalResult.content).toBe('Mock response');
        expect(finalResult.finishReason).toBe('stop');
      }
    });
  });

  describe('完整调用链：Signal 中断', () => {
    it('应该正确中断非流式生成', async () => {
      const mockClient = mockClients.get('openai-profile')!;
      mockClient.setDelay(100);

      const controller = new AbortController();
      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        signal: controller.signal
      };

      // 立即中止
      controller.abort();

      const result = await wrapper.generate(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LLMError);
      }
    });

    it('应该正确中断流式生成并更新 MessageStream 状态', async () => {
      const mockClient = mockClients.get('openai-profile')!;
      mockClient.setStreamDelay(50);

      const controller = new AbortController();
      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        signal: controller.signal
      };

      // 在启动流之前设置中止定时器
      setTimeout(() => {
        controller.abort();
      }, 75);

      // 执行流式生成 - 会在处理过程中遇到中止
      const result = await wrapper.generateStream(request);

      // 由于 signal 在流处理过程中被中止，应该返回错误
      if (result.isOk()) {
        const stream = result.value;
        // 如果返回了 stream，验证它已被中止
        expect(stream.isAborted()).toBe(true);
      } else {
        // 或者返回错误结果
        expect(result.error).toBeInstanceOf(LLMError);
      }
    });

    it('应该正确触发中止事件', async () => {
      const mockClient = mockClients.get('openai-profile')!;
      mockClient.setStreamDelay(50);

      const controller = new AbortController();
      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        signal: controller.signal
      };

      // 监听事件
      const events: any[] = [];
      eventManager.on('LLM_STREAM_ABORTED', (event) => {
        events.push(event);
      });

      // 在启动流之前设置中止定时器
      setTimeout(() => {
        controller.abort();
      }, 75);

      // 执行流式生成
      const result = await wrapper.generateStream(request);

      // 验证事件被触发
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('LLM_STREAM_ABORTED');
    });

    it('应该正确处理 ThreadInterruptedException', async () => {
      const threadException = new ThreadInterruptedException(
        'Thread stopped',
        'STOP',
        'thread-123',
        'node-456'
      );

      const controller = new AbortController();
      controller.abort(threadException);

      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        signal: controller.signal
      };

      // 监听事件
      const events: any[] = [];
      eventManager.on('LLM_STREAM_ABORTED', (event) => {
        events.push(event);
      });

      const result = await wrapper.generateStream(request);

      // 当 signal 已经中止时，generateStream 应该返回错误
      // 或者如果流已经开始处理，可能返回 ok 但 stream 会被中止
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LLMError);
      } else {
        // 如果返回了 stream，检查它是否被中止
        expect(result.value.isAborted()).toBe(true);
      }

      // 验证事件被触发
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('LLM_STREAM_ABORTED');
    });
  });

  describe('完整调用链：错误处理', () => {
    it('应该正确处理客户端错误并触发事件', async () => {
      const mockClient = mockClients.get('openai-profile')!;
      mockClient.setFailure(true, new Error('API rate limit exceeded'));

      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      // 监听事件
      const events: any[] = [];
      eventManager.on('LLM_STREAM_ERROR', (event) => {
        events.push(event);
      });

      const result = await wrapper.generateStream(request);

      // 验证返回错误结果
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LLMError);
        expect(result.error.message).toContain('OPENAI_CHAT API error');
      }

      // 验证事件
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('LLM_STREAM_ERROR');
      expect(events[0].error).toBe('API rate limit exceeded');
    });

    it('应该处理 Profile 不存在的错误', async () => {
      const request: LLMRequest = {
        profileId: 'non-existent-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      // getProfile 会抛出 ConfigurationError
      await expect(wrapper.generate(request)).rejects.toThrow(ConfigurationError);
    });

    it('应该正确处理网络错误', async () => {
      const networkError = new Error('Network timeout');
      (networkError as any).code = 'ETIMEDOUT';

      const mockClient = mockClients.get('openai-profile')!;
      mockClient.setFailure(true, networkError);

      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const result = await wrapper.generate(request);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LLMError);
        expect(result.error.message).toContain('OPENAI_CHAT API error');
      }
    });
  });

  describe('完整调用链：多 Profile 场景', () => {
    it('应该支持使用不同 Profile 进行生成', async () => {
      const request1: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const request2: LLMRequest = {
        profileId: 'anthropic-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const result1 = await wrapper.generate(request1);
      const result2 = await wrapper.generate(request2);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.model).toBe('gpt-4');
        expect(result2.value.model).toBe('claude-3');
      }
    });

    it('应该支持切换默认 Profile', async () => {
      // 设置第一个 profile 为默认
      wrapper.setDefaultProfile('openai-profile');

      const request1: LLMRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const result1 = await wrapper.generate(request1);
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value.model).toBe('gpt-4');
      }

      // 切换到第二个 profile
      wrapper.setDefaultProfile('anthropic-profile');

      const result2 = await wrapper.generate(request1);
      expect(result2.isOk()).toBe(true);
      if (result2.isOk()) {
        expect(result2.value.model).toBe('claude-3');
      }
    });
  });

  describe('完整调用链：性能和资源管理', () => {
    it('应该正确计算响应时间', async () => {
      const mockClient = mockClients.get('openai-profile')!;
      mockClient.setDelay(100);

      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const startTime = Date.now();
      const result = await wrapper.generate(request);
      const endTime = Date.now();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.duration).toBeGreaterThanOrEqual(100);
        expect(result.value.duration).toBeLessThanOrEqual(endTime - startTime + 50);
      }
    });

    it('应该正确清理资源', async () => {
      const request: LLMRequest = {
        profileId: 'openai-profile',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      // 执行多次生成
      for (let i = 0; i < 5; i++) {
        const result = await wrapper.generate(request);
        expect(result.isOk()).toBe(true);
      }

      // 清除所有资源
      wrapper.clearAll();

      // 验证资源已清理
      expect(wrapper.listProfiles()).toHaveLength(0);
      expect(wrapper.getDefaultProfileId()).toBeNull();
    });
  });
});