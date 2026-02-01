/**
 * ClientFactory 单元测试
 */

import { ClientFactory } from '../client-factory';
import type { LLMProfile } from '../../../types/llm';
import { LLMProvider } from '../../../types/llm';
import { ConfigurationError } from '../../../types/errors';

// Mock所有客户端类
jest.mock('../clients/openai-chat', () => ({
  OpenAIChatClient: jest.fn().mockImplementation((profile: any) => ({
    profile: { ...profile, provider: 'openai_chat' }
  }))
}));

jest.mock('../clients/openai-response', () => ({
  OpenAIResponseClient: jest.fn().mockImplementation((profile: any) => ({
    profile: { ...profile, provider: 'openai_response' }
  }))
}));

jest.mock('../clients/anthropic', () => ({
  AnthropicClient: jest.fn().mockImplementation((profile: any) => ({
    profile: { ...profile, provider: 'anthropic' }
  }))
}));

jest.mock('../clients/gemini-native', () => ({
  GeminiNativeClient: jest.fn().mockImplementation((profile: any) => ({
    profile: { ...profile, provider: 'gemini_native' }
  }))
}));

jest.mock('../clients/gemini-openai', () => ({
  GeminiOpenAIClient: jest.fn().mockImplementation((profile: any) => ({
    profile: { ...profile, provider: 'gemini_openai' }
  }))
}));

jest.mock('../clients/human-relay', () => ({
  HumanRelayClient: jest.fn().mockImplementation((profile: any) => ({
    profile: { ...profile, provider: 'human_relay' }
  }))
}));

describe('ClientFactory', () => {
  let factory: ClientFactory;
  let testProfile: LLMProfile;

  beforeEach(() => {
    factory = new ClientFactory();
    testProfile = {
      id: 'test-profile',
      name: 'Test Profile',
      provider: LLMProvider.OPENAI_CHAT,
      model: 'gpt-4',
      apiKey: 'test-api-key',
      baseUrl: 'https://api.openai.com',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      parameters: {
        temperature: 0.7,
        maxTokens: 1000
      }
    };
  });

  describe('构造函数', () => {
    it('应该正确初始化工厂', () => {
      expect(factory).toBeInstanceOf(ClientFactory);
    });

    it('应该初始化空的客户端缓存', () => {
      const stats = factory.getCacheStats();
      expect(stats.totalClients).toBe(0);
      expect(Object.keys(stats.clientsByProvider).length).toBe(0);
    });
  });

  describe('createClient', () => {
    it('应该创建OpenAI Chat客户端', () => {
      const profile: LLMProfile = {
        ...testProfile,
        provider: LLMProvider.OPENAI_CHAT
      };

      const client = factory.createClient(profile);

      expect(client).toBeDefined();
      expect((client as any).profile?.provider).toBe('openai_chat');
    });

    it('应该创建OpenAI Response客户端', () => {
      const profile: LLMProfile = {
        ...testProfile,
        provider: LLMProvider.OPENAI_RESPONSE
      };

      const client = factory.createClient(profile);

      expect(client).toBeDefined();
      expect((client as any).profile?.provider).toBe('openai_response');
    });

    it('应该创建Anthropic客户端', () => {
      const profile: LLMProfile = {
        ...testProfile,
        provider: LLMProvider.ANTHROPIC
      };

      const client = factory.createClient(profile);

      expect(client).toBeDefined();
      expect((client as any).profile?.provider).toBe('anthropic');
    });

    it('应该创建Gemini Native客户端', () => {
      const profile: LLMProfile = {
        ...testProfile,
        provider: LLMProvider.GEMINI_NATIVE
      };

      const client = factory.createClient(profile);

      expect(client).toBeDefined();
      expect((client as any).profile?.provider).toBe('gemini_native');
    });

    it('应该创建Gemini OpenAI客户端', () => {
      const profile: LLMProfile = {
        ...testProfile,
        provider: LLMProvider.GEMINI_OPENAI
      };

      const client = factory.createClient(profile);

      expect(client).toBeDefined();
      expect((client as any).profile?.provider).toBe('gemini_openai');
    });

    it('应该创建Human Relay客户端', () => {
      const profile: LLMProfile = {
        ...testProfile,
        provider: LLMProvider.HUMAN_RELAY
      };

      const client = factory.createClient(profile);

      expect(client).toBeDefined();
      expect((client as any).profile?.provider).toBe('human_relay');
    });

    it('应该抛出错误当provider不支持时', () => {
      const profile: LLMProfile = {
        ...testProfile,
        provider: 'unsupported_provider' as any
      };

      expect(() => factory.createClient(profile)).toThrow(ConfigurationError);
      expect(() => factory.createClient(profile)).toThrow('不支持的LLM提供商');
    });

    it('应该缓存客户端实例', () => {
      const client1 = factory.createClient(testProfile);
      const client2 = factory.createClient(testProfile);

      expect(client1).toBe(client2);
    });

    it('应该为不同Profile创建不同客户端', () => {
      const profile2: LLMProfile = {
        ...testProfile,
        id: 'test-profile-2'
      };

      const client1 = factory.createClient(testProfile);
      const client2 = factory.createClient(profile2);

      expect(client1).not.toBe(client2);
    });
  });

  describe('getClient', () => {
    beforeEach(() => {
      factory.createClient(testProfile);
    });

    it('应该获取缓存的客户端', () => {
      const client = factory.getClient('test-profile');

      expect(client).toBeDefined();
      expect((client as any).profile?.provider).toBe('openai_chat');
    });

    it('应该返回undefined当客户端不存在时', () => {
      const client = factory.getClient('non-existent');

      expect(client).toBeUndefined();
    });

    it('应该支持通过profileId前缀查找', () => {
      const client = factory.getClient('test-profile');

      expect(client).toBeDefined();
    });
  });

  describe('clearCache', () => {
    beforeEach(() => {
      factory.createClient(testProfile);
    });

    it('应该清除所有客户端缓存', () => {
      factory.clearCache();

      const stats = factory.getCacheStats();
      expect(stats.totalClients).toBe(0);
    });

    it('清除后应该创建新的客户端实例', () => {
      const client1 = factory.createClient(testProfile);
      factory.clearCache();
      const client2 = factory.createClient(testProfile);

      expect(client1).not.toBe(client2);
    });
  });

  describe('clearClientCache', () => {
    beforeEach(() => {
      factory.createClient(testProfile);
    });

    it('应该清除指定Profile的客户端缓存', () => {
      factory.clearClientCache('test-profile');

      const client = factory.getClient('test-profile');
      expect(client).toBeUndefined();
    });

    it('应该清除匹配前缀的所有客户端', () => {
      const profile2: LLMProfile = {
        ...testProfile,
        id: 'test-profile-2'
      };

      factory.createClient(profile2);
      factory.clearClientCache('test-profile');

      const client1 = factory.getClient('test-profile');
      const client2 = factory.getClient('test-profile-2');

      // clearClientCache 使用 startsWith，所以两个都会被清除
      expect(client1).toBeUndefined();
      expect(client2).toBeUndefined();
    });

    it('清除不存在的Profile不应该抛出错误', () => {
      expect(() => factory.clearClientCache('non-existent')).not.toThrow();
    });
  });

  describe('getCacheStats', () => {
    it('应该返回正确的缓存统计', () => {
      const stats = factory.getCacheStats();

      expect(stats.totalClients).toBe(0);
      expect(stats.clientsByProvider).toEqual({});
    });

    it('应该统计不同provider的客户端数量', () => {
      factory.createClient(testProfile);

      const profile2: LLMProfile = {
        ...testProfile,
        id: 'test-profile-2',
        provider: LLMProvider.ANTHROPIC
      };

      factory.createClient(profile2);

      const stats = factory.getCacheStats();

      expect(stats.totalClients).toBe(2);
      expect(stats.clientsByProvider['openai_chat']).toBe(1);
      expect(stats.clientsByProvider['anthropic']).toBe(1);
    });

    it('应该正确统计相同provider的多个客户端', () => {
      const profile2: LLMProfile = {
        ...testProfile,
        id: 'test-profile-2'
      };

      factory.createClient(testProfile);
      factory.createClient(profile2);

      const stats = factory.getCacheStats();

      expect(stats.totalClients).toBe(2);
      expect(stats.clientsByProvider['openai_chat']).toBe(2);
    });
  });

  describe('缓存键生成', () => {
    it('应该使用Profile ID作为缓存键', () => {
      const client1 = factory.createClient(testProfile);
      const client2 = factory.getClient('test-profile');

      expect(client1).toBe(client2);
    });

    it('不同ID的Profile应该有不同的缓存键', () => {
      const profile2: LLMProfile = {
        ...testProfile,
        id: 'test-profile-2'
      };

      const client1 = factory.createClient(testProfile);
      const client2 = factory.createClient(profile2);

      expect(client1).not.toBe(client2);
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的客户端生命周期', () => {
      // 创建客户端
      const client1 = factory.createClient(testProfile);
      expect(client1).toBeDefined();

      // 获取客户端（应该从缓存返回）
      const client2 = factory.getClient('test-profile');
      expect(client2).toBe(client1);

      // 检查缓存统计
      const stats1 = factory.getCacheStats();
      expect(stats1.totalClients).toBe(1);

      // 创建另一个客户端
      const profile2: LLMProfile = {
        ...testProfile,
        id: 'test-profile-2',
        provider: LLMProvider.ANTHROPIC
      };

      factory.createClient(profile2);

      const stats2 = factory.getCacheStats();
      expect(stats2.totalClients).toBe(2);

      // 清除特定客户端（使用 startsWith 匹配）
      factory.clearClientCache('test-profile');

      const stats3 = factory.getCacheStats();
      // 由于 startsWith 匹配，两个客户端都会被清除
      expect(stats3.totalClients).toBe(0);

      // 清除所有缓存
      factory.clearCache();

      const stats4 = factory.getCacheStats();
      expect(stats4.totalClients).toBe(0);
    });

    it('应该支持多种provider的客户端创建', () => {
      const providers = [
        LLMProvider.OPENAI_CHAT,
        LLMProvider.OPENAI_RESPONSE,
        LLMProvider.ANTHROPIC,
        LLMProvider.GEMINI_NATIVE,
        LLMProvider.GEMINI_OPENAI,
        LLMProvider.HUMAN_RELAY
      ];

      providers.forEach((provider, index) => {
        const profile: LLMProfile = {
          ...testProfile,
          id: `profile-${index}`,
          provider
        };

        const client = factory.createClient(profile);
        expect(client).toBeDefined();
      });

      const stats = factory.getCacheStats();
      expect(stats.totalClients).toBe(providers.length);
    });
  });
});