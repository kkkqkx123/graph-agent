/**
 * LLMWrapper 单元测试
 */

import { LLMWrapper } from '../wrapper';
import type { LLMProfile, LLMRequest, LLMResult } from '@modular-agent/types/llm';
import { ConfigurationError, LLMError } from '@modular-agent/types/errors';
import { BaseLLMClient } from '../base-client';

describe('LLMWrapper', () => {
  let wrapper: LLMWrapper;
  let testProfile: LLMProfile;

  beforeEach(() => {
    wrapper = new LLMWrapper();
    testProfile = {
      id: 'test-profile',
      name: 'Test Profile',
      provider: 'openai' as any,
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
    it('应该正确初始化wrapper', () => {
      expect(wrapper).toBeInstanceOf(LLMWrapper);
    });

    it('应该初始化ProfileManager和ClientFactory', () => {
      expect(wrapper.listProfiles()).toEqual([]);
    });
  });

  describe('registerProfile', () => {
    it('应该成功注册Profile', () => {
      wrapper.registerProfile(testProfile);

      const profiles = wrapper.listProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0]?.id).toBe('test-profile');
    });

    it('应该支持注册多个Profile', () => {
      const profile2: LLMProfile = {
        ...testProfile,
        id: 'test-profile-2',
        name: 'Test Profile 2'
      };

      wrapper.registerProfile(testProfile);
      wrapper.registerProfile(profile2);

      const profiles = wrapper.listProfiles();
      expect(profiles).toHaveLength(2);
    });
  });

  describe('getProfile', () => {
    beforeEach(() => {
      wrapper.registerProfile(testProfile);
    });

    it('应该通过ID获取Profile', () => {
      const profile = wrapper.getProfile('test-profile');

      expect(profile).toBeDefined();
      expect(profile?.id).toBe('test-profile');
    });

    it('应该返回默认Profile当未提供ID时', () => {
      const profile = wrapper.getProfile();

      expect(profile).toBeDefined();
      expect(profile?.id).toBe('test-profile');
    });

    it('应该抛出错误当Profile不存在时', () => {
      expect(() => wrapper.getProfile('non-existent')).toThrow(ConfigurationError);
      expect(() => wrapper.getProfile('non-existent')).toThrow('LLM Profile not found');
    });
  });

  describe('removeProfile', () => {
    beforeEach(() => {
      wrapper.registerProfile(testProfile);
    });

    it('应该成功删除Profile', () => {
      wrapper.removeProfile('test-profile');

      const profiles = wrapper.listProfiles();
      expect(profiles).toHaveLength(0);
    });
  });

  describe('listProfiles', () => {
    it('应该返回空数组当没有Profile时', () => {
      const profiles = wrapper.listProfiles();

      expect(profiles).toEqual([]);
    });

    it('应该返回所有Profile', () => {
      wrapper.registerProfile(testProfile);

      const profiles = wrapper.listProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0]?.id).toBe('test-profile');
    });
  });

  describe('clearAll', () => {
    beforeEach(() => {
      wrapper.registerProfile(testProfile);
    });

    it('应该清除所有Profile', () => {
      wrapper.clearAll();

      const profiles = wrapper.listProfiles();
      expect(profiles).toHaveLength(0);
    });
  });

  describe('setDefaultProfile', () => {
    beforeEach(() => {
      wrapper.registerProfile(testProfile);
    });

    it('应该成功设置默认Profile', () => {
      wrapper.setDefaultProfile('test-profile');

      expect(wrapper.getDefaultProfileId()).toBe('test-profile');
    });
  });

  describe('getDefaultProfileId', () => {
    it('应该返回null当没有Profile时', () => {
      expect(wrapper.getDefaultProfileId()).toBeNull();
    });

    it('应该返回默认Profile ID', () => {
      wrapper.registerProfile(testProfile);

      expect(wrapper.getDefaultProfileId()).toBe('test-profile');
    });
  });

  describe('generate', () => {
    beforeEach(() => {
      wrapper.registerProfile(testProfile);
    });

    it('应该抛出错误当Profile不存在时', async () => {
      const request: LLMRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        profileId: 'non-existent'
      };

      await expect(wrapper.generate(request)).rejects.toThrow(ConfigurationError);
      await expect(wrapper.generate(request)).rejects.toThrow('LLM Profile not found');
    });
  });

  describe('generateStream', () => {
    beforeEach(() => {
      wrapper.registerProfile(testProfile);
    });

    it('应该抛出错误当Profile不存在时', async () => {
      const request: LLMRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        profileId: 'non-existent'
      };

      await expect(
        (async () => {
          for await (const _ of wrapper.generateStream(request)) {
            // 消费流
          }
        })()
      ).rejects.toThrow(ConfigurationError);
    });
  });

  describe('错误处理', () => {
    class ErrorClient extends BaseLLMClient {
      protected override async doGenerate(request: LLMRequest): Promise<LLMResult> {
        throw new Error('API error');
      }

      protected override async *doGenerateStream(request: LLMRequest): AsyncIterable<LLMResult> {
        throw new Error('Stream error');
      }

      protected override parseResponse(data: any): LLMResult {
        return data;
      }

      protected override parseStreamChunk(data: any): LLMResult | null {
        return data;
      }
    }

    it('应该将generate错误转换为LLMError', async () => {
      wrapper.registerProfile(testProfile);

      // 模拟客户端工厂返回错误客户端
      const originalCreateClient = wrapper['clientFactory'].createClient;
      wrapper['clientFactory'].createClient = jest.fn(() => new ErrorClient(testProfile));

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        profileId: 'test-profile'
      };

      await expect(wrapper.generate(request)).rejects.toThrow(LLMError);
      await expect(wrapper.generate(request)).rejects.toMatchObject({
        provider: 'openai',
        model: 'gpt-4'
      });

      // 恢复原方法
      wrapper['clientFactory'].createClient = originalCreateClient;
    });

    it('应该将generateStream错误转换为LLMError', async () => {
      wrapper.registerProfile(testProfile);

      // 模拟客户端工厂返回错误客户端
      const originalCreateClient = wrapper['clientFactory'].createClient;
      wrapper['clientFactory'].createClient = jest.fn(() => new ErrorClient(testProfile));

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        profileId: 'test-profile'
      };

      await expect(
        (async () => {
          for await (const _ of wrapper.generateStream(request)) {
            // 消费流
          }
        })()
      ).rejects.toThrow(LLMError);

      // 恢复原方法
      wrapper['clientFactory'].createClient = originalCreateClient;
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的Profile管理流程', () => {
      // 注册Profile
      wrapper.registerProfile(testProfile);
      expect(wrapper.listProfiles()).toHaveLength(1);

      // 设置默认Profile
      wrapper.setDefaultProfile('test-profile');
      expect(wrapper.getDefaultProfileId()).toBe('test-profile');

      // 获取Profile
      const profile = wrapper.getProfile('test-profile');
      expect(profile?.id).toBe('test-profile');

      // 列出Profile
      const profiles = wrapper.listProfiles();
      expect(profiles).toHaveLength(1);

      // 删除Profile
      wrapper.removeProfile('test-profile');
      expect(wrapper.listProfiles()).toHaveLength(0);

      // 清除所有
      wrapper.clearAll();
      expect(wrapper.listProfiles()).toHaveLength(0);
    });
  });
});