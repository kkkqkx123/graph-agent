/**
 * LLMWrapper 单元测试
 * 测试 LLMWrapper 的核心功能，使用简单的 mock
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMWrapper } from '../wrapper.js';
import type { LLMProfile, LLMRequest, LLMResult, LLMClient } from '@modular-agent/types';
import { LLMError, ConfigurationError, AbortError } from '@modular-agent/types';
import { MessageStream } from '../index.js';

// Mock ProfileManager
class MockProfileManager {
  private profiles: Map<string, LLMProfile> = new Map();
  private defaultProfileId: string | null = null;

  register(profile: LLMProfile): void {
    this.profiles.set(profile.id, profile);
  }

  get(profileId?: string): LLMProfile | undefined {
    const id = profileId || this.defaultProfileId;
    return id ? this.profiles.get(id) : undefined;
  }

  remove(profileId: string): void {
    this.profiles.delete(profileId);
  }

  list(): LLMProfile[] {
    return Array.from(this.profiles.values());
  }

  clear(): void {
    this.profiles.clear();
    this.defaultProfileId = null;
  }

  setDefault(profileId: string): void {
    if (!this.profiles.has(profileId)) {
      throw new ConfigurationError('Profile not found', profileId);
    }
    this.defaultProfileId = profileId;
  }

  getDefault(): LLMProfile | undefined {
    return this.defaultProfileId ? this.profiles.get(this.defaultProfileId) : undefined;
  }
}

// Mock ClientFactory
class MockClientFactory {
  private clientCache: Map<string, LLMClient> = new Map();
  private mockClient: LLMClient | null = null;

  setMockClient(client: LLMClient): void {
    this.mockClient = client;
  }

  createClient(profile: LLMProfile): LLMClient {
    const cacheKey = profile.id;
    if (this.clientCache.has(cacheKey)) {
      return this.clientCache.get(cacheKey)!;
    }
    const client = this.mockClient || this.createDefaultMockClient();
    this.clientCache.set(cacheKey, client);
    return client;
  }

  clearCache(): void {
    this.clientCache.clear();
  }

  clearClientCache(profileId: string): void {
    for (const key of this.clientCache.keys()) {
      if (key.startsWith(profileId)) {
        this.clientCache.delete(key);
      }
    }
  }

  private createDefaultMockClient(): LLMClient {
    return {
      generate: vi.fn(),
      generateStream: vi.fn()
    };
  }
}

// Mock EventManager
class MockEventManager {
  private events: any[] = [];

  emit(event: any): void {
    this.events.push(event);
  }

  getEvents(): any[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }
}

describe('LLMWrapper', () => {
  let wrapper: LLMWrapper;
  let mockProfileManager: MockProfileManager;
  let mockClientFactory: MockClientFactory;
  let mockEventManager: MockEventManager;
  let mockClient: LLMClient;

  const testProfile: LLMProfile = {
    id: 'test-profile',
    name: 'Test Profile',
    provider: 'OPENAI_CHAT',
    model: 'gpt-4',
    apiKey: 'test-api-key',
    parameters: {
      temperature: 0.7,
      maxTokens: 1000
    }
  };

  const testRequest: LLMRequest = {
    profileId: 'test-profile',
    messages: [
      { role: 'user', content: 'Hello' }
    ]
  };

  beforeEach(() => {
    mockProfileManager = new MockProfileManager();
    mockClientFactory = new MockClientFactory();
    mockEventManager = new MockEventManager();

    // 创建 mock 客户端
    mockClient = {
      generate: vi.fn(),
      generateStream: vi.fn()
    };
    mockClientFactory.setMockClient(mockClient);

    // 注册测试 profile
    mockProfileManager.register(testProfile);

    // 创建 wrapper 实例并注入 mock
    wrapper = new LLMWrapper(mockEventManager as any);
    (wrapper as any).profileManager = mockProfileManager;
    (wrapper as any).clientFactory = mockClientFactory;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Profile 管理', () => {
    it('应该能够注册 Profile', () => {
      const newProfile: LLMProfile = {
        id: 'new-profile',
        name: 'New Profile',
        provider: 'ANTHROPIC',
        model: 'claude-3',
        apiKey: 'new-api-key',
        parameters: {}
      };

      wrapper.registerProfile(newProfile);
      expect(wrapper.listProfiles()).toContainEqual(newProfile);
    });

    it('应该能够获取 Profile', () => {
      const profile = wrapper.getProfile('test-profile');
      expect(profile).toEqual(testProfile);
    });

    it('应该能够删除 Profile', () => {
      wrapper.removeProfile('test-profile');
      expect(wrapper.listProfiles()).not.toContainEqual(testProfile);
    });

    it('应该能够列出所有 Profile', () => {
      const profiles = wrapper.listProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0]).toEqual(testProfile);
    });

    it('应该能够清除所有 Profile', () => {
      wrapper.clearAll();
      expect(wrapper.listProfiles()).toHaveLength(0);
    });

    it('应该能够设置默认 Profile', () => {
      wrapper.setDefaultProfile('test-profile');
      expect(wrapper.getDefaultProfileId()).toBe('test-profile');
    });

    it('获取不存在的 Profile 应该抛出 ConfigurationError', () => {
      expect(() => wrapper.getProfile('non-existent')).toThrow(ConfigurationError);
    });
  });

  describe('非流式生成 (generate)', () => {
    it('应该成功生成响应', async () => {
      const mockResult: LLMResult = {
        id: 'test-id',
        model: 'gpt-4',
        content: 'Hello!',
        message: { role: 'assistant', content: 'Hello!' },
        finishReason: 'stop',
        duration: 0 // wrapper 会重新计算 duration
      };

      vi.mocked(mockClient.generate).mockResolvedValue(mockResult);

      const result = await wrapper.generate(testRequest);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.content).toBe('Hello!');
        // wrapper 会重新计算 duration，所以应该大于 0
        expect(result.value.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('应该正确传递 signal 到客户端', async () => {
      const mockResult: LLMResult = {
        id: 'test-id',
        model: 'gpt-4',
        content: 'Hello!',
        message: { role: 'assistant', content: 'Hello!' },
        finishReason: 'stop',
        duration: 100
      };

      vi.mocked(mockClient.generate).mockResolvedValue(mockResult);

      const controller = new AbortController();
      const requestWithSignal: LLMRequest = {
        ...testRequest,
        signal: controller.signal
      };

      await wrapper.generate(requestWithSignal);

      expect(mockClient.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: controller.signal
        })
      );
    });

    it('应该处理 Profile 不存在的错误', async () => {
      const requestWithInvalidProfile: LLMRequest = {
        ...testRequest,
        profileId: 'non-existent'
      };

      // getProfile 会抛出 ConfigurationError，所以需要捕获异常
      await expect(wrapper.generate(requestWithInvalidProfile)).rejects.toThrow(ConfigurationError);
    });

    it('应该处理客户端错误', async () => {
      const error = new Error('API Error');
      vi.mocked(mockClient.generate).mockRejectedValue(error);

      const result = await wrapper.generate(testRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LLMError);
        expect(result.error.message).toContain('OPENAI_CHAT API error');
      }
    });

    it('应该处理 AbortError', async () => {
      const abortError = new AbortError('Operation aborted');
      vi.mocked(mockClient.generate).mockRejectedValue(abortError);

      const controller = new AbortController();
      controller.abort();

      const requestWithSignal: LLMRequest = {
        ...testRequest,
        signal: controller.signal
      };

      const result = await wrapper.generate(requestWithSignal);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LLMError);
      }
    });
  });

  describe('流式生成 (generateStream)', () => {
    it('应该成功生成流式响应', async () => {
      const mockChunks: LLMResult[] = [
        {
          id: 'test-id',
          model: 'gpt-4',
          content: 'Hello',
          message: { role: 'assistant', content: 'Hello' },
          finishReason: '',
          duration: 50
        },
        {
          id: 'test-id',
          model: 'gpt-4',
          content: 'Hello!',
          message: { role: 'assistant', content: 'Hello!' },
          finishReason: 'stop',
          duration: 100
        }
      ];

      async function* generateMockStream(): AsyncIterable<LLMResult> {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      }

      vi.mocked(mockClient.generateStream).mockReturnValue(generateMockStream());

      const result = await wrapper.generateStream(testRequest);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeInstanceOf(MessageStream);
      }
    });

    it('应该正确传递 signal 到客户端', async () => {
      async function* generateMockStream(): AsyncIterable<LLMResult> {
        yield {
          id: 'test-id',
          model: 'gpt-4',
          content: 'Hello',
          message: { role: 'assistant', content: 'Hello' },
          finishReason: 'stop',
          duration: 100
        };
      }

      vi.mocked(mockClient.generateStream).mockReturnValue(generateMockStream());

      const controller = new AbortController();
      const requestWithSignal: LLMRequest = {
        ...testRequest,
        signal: controller.signal
      };

      await wrapper.generateStream(requestWithSignal);

      expect(mockClient.generateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: controller.signal
        })
      );
    });

    it('应该处理 Profile 不存在的错误', async () => {
      const requestWithInvalidProfile: LLMRequest = {
        ...testRequest,
        profileId: 'non-existent'
      };

      // getProfile 会抛出 ConfigurationError，所以需要捕获异常
      await expect(wrapper.generateStream(requestWithInvalidProfile)).rejects.toThrow(ConfigurationError);
    });

    it('应该处理客户端错误', async () => {
      const error = new Error('Stream Error');
      vi.mocked(mockClient.generateStream).mockImplementation(() => {
        throw error;
      });

      const result = await wrapper.generateStream(testRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LLMError);
        expect(result.error.message).toContain('OPENAI_CHAT API error');
      }
    });

    it('应该正确处理 AbortError 并中止 MessageStream', async () => {
      const abortError = new AbortError('Operation aborted');
      vi.mocked(mockClient.generateStream).mockImplementation(() => {
        throw abortError;
      });

      const controller = new AbortController();
      controller.abort();

      const requestWithSignal: LLMRequest = {
        ...testRequest,
        signal: controller.signal
      };

      const result = await wrapper.generateStream(requestWithSignal);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LLMError);
      }

      // 验证事件管理器收到了中止事件
      const events = mockEventManager.getEvents();
      const abortEvent = events.find(e => e.type === 'LLM_STREAM_ABORTED');
      expect(abortEvent).toBeDefined();
    });

    it('应该触发 LLM_STREAM_ERROR 事件', async () => {
      const error = new Error('Stream Error');
      vi.mocked(mockClient.generateStream).mockImplementation(() => {
        throw error;
      });

      const result = await wrapper.generateStream(testRequest);

      expect(result.isErr()).toBe(true);

      // 验证事件管理器收到了错误事件
      const events = mockEventManager.getEvents();
      const errorEvent = events.find(e => e.type === 'LLM_STREAM_ERROR');
      expect(errorEvent).toBeDefined();
      expect(errorEvent.error).toBe('Stream Error');
    });

    it('应该触发 LLM_STREAM_ABORTED 事件', async () => {
      const abortError = new AbortError('Operation aborted');
      vi.mocked(mockClient.generateStream).mockImplementation(() => {
        throw abortError;
      });

      const controller = new AbortController();
      controller.abort();

      const requestWithSignal: LLMRequest = {
        ...testRequest,
        signal: controller.signal
      };

      await wrapper.generateStream(requestWithSignal);

      // 验证事件管理器收到了中止事件
      const events = mockEventManager.getEvents();
      const abortEvent = events.find(e => e.type === 'LLM_STREAM_ABORTED');
      expect(abortEvent).toBeDefined();
      expect(abortEvent.reason).toBe('Stream aborted');
    });
  });

  describe('事件管理器', () => {
    it('应该能够设置事件管理器', () => {
      const newEventManager = new MockEventManager();
      wrapper.setEventManager(newEventManager as any);
      expect((wrapper as any).eventManager).toBe(newEventManager);
    });

    it('没有事件管理器时不应该抛出错误', async () => {
      const wrapperWithoutEventManager = new LLMWrapper();
      (wrapperWithoutEventManager as any).profileManager = mockProfileManager;
      (wrapperWithoutEventManager as any).clientFactory = mockClientFactory;

      const error = new Error('Stream Error');
      vi.mocked(mockClient.generateStream).mockImplementation(() => {
        throw error;
      });

      const result = await wrapperWithoutEventManager.generateStream(testRequest);

      expect(result.isErr()).toBe(true);
      // 不应该抛出错误
    });
  });

  describe('错误转换', () => {
    it('应该正确转换普通错误', async () => {
      const error = new Error('API Error');
      vi.mocked(mockClient.generate).mockRejectedValue(error);

      const result = await wrapper.generate(testRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LLMError);
        expect(result.error.message).toContain('OPENAI_CHAT API error: API Error');
        expect(result.error.provider).toBe('OPENAI_CHAT');
        expect(result.error.model).toBe('gpt-4');
      }
    });

    it('应该正确转换带 code 的错误', async () => {
      const error = new Error('Rate limit exceeded');
      (error as any).code = 429;
      vi.mocked(mockClient.generate).mockRejectedValue(error);

      const result = await wrapper.generate(testRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LLMError);
        expect(result.error.statusCode).toBe(429);
      }
    });

    it('应该正确转换带 status 的错误', async () => {
      const error = new Error('Internal server error');
      (error as any).status = 500;
      vi.mocked(mockClient.generate).mockRejectedValue(error);

      const result = await wrapper.generate(testRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LLMError);
        expect(result.error.statusCode).toBe(500);
      }
    });

    it('应该正确转换非 Error 对象', async () => {
      vi.mocked(mockClient.generate).mockRejectedValue('String error');

      const result = await wrapper.generate(testRequest);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LLMError);
        expect(result.error.message).toContain('OPENAI_CHAT API error: String error');
      }
    });
  });
});
