/**
 * ProfileManager 单元测试
 */

import { ProfileManager } from '../profile-manager';
import type { LLMProfile } from '@modular-agent/types';
import { ValidationError, NotFoundError } from '@modular-agent/types';

describe('ProfileManager', () => {
  let manager: ProfileManager;
  let testProfile: LLMProfile;
  let testProfile2: LLMProfile;

  beforeEach(() => {
    manager = new ProfileManager();
    testProfile = {
      id: 'test-profile-1',
      name: 'Test Profile 1',
      provider: 'openai' as any,
      model: 'gpt-4',
      apiKey: 'test-api-key-1',
      baseUrl: 'https://api.openai.com',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      parameters: {
        temperature: 0.7,
        maxTokens: 1000
      }
    };

    testProfile2 = {
      id: 'test-profile-2',
      name: 'Test Profile 2',
      provider: 'anthropic' as any,
      model: 'claude-3',
      apiKey: 'test-api-key-2',
      baseUrl: 'https://api.anthropic.com',
      timeout: 60000,
      maxRetries: 5,
      retryDelay: 2000,
      parameters: {
        temperature: 0.5,
        maxTokens: 2000
      }
    };
  });

  describe('register', () => {
    it('应该成功注册Profile', () => {
      manager.register(testProfile);

      expect(manager.has('test-profile-1')).toBe(true);
      expect(manager.size()).toBe(1);
    });

    it('第一个注册的Profile应该成为默认Profile', () => {
      manager.register(testProfile);

      const defaultProfile = manager.getDefault();
      expect(defaultProfile?.id).toBe('test-profile-1');
    });

    it('应该拒绝缺少id的Profile', () => {
      const invalidProfile = { ...testProfile, id: '' } as any;

      expect(() => manager.register(invalidProfile)).toThrow(ValidationError);
      expect(() => manager.register(invalidProfile)).toThrow('Profile ID is required');
    });

    it('应该拒绝缺少name的Profile', () => {
      const invalidProfile = { ...testProfile, name: '' } as any;

      expect(() => manager.register(invalidProfile)).toThrow(ValidationError);
      expect(() => manager.register(invalidProfile)).toThrow('Profile name is required');
    });

    it('应该拒绝缺少provider的Profile', () => {
      const invalidProfile = { ...testProfile, provider: '' } as any;

      expect(() => manager.register(invalidProfile)).toThrow(ValidationError);
      expect(() => manager.register(invalidProfile)).toThrow('Profile provider is required');
    });

    it('应该拒绝缺少model的Profile', () => {
      const invalidProfile = { ...testProfile, model: '' } as any;

      expect(() => manager.register(invalidProfile)).toThrow(ValidationError);
      expect(() => manager.register(invalidProfile)).toThrow('Profile model is required');
    });

    it('应该拒绝缺少apiKey的Profile', () => {
      const invalidProfile = { ...testProfile, apiKey: '' } as any;

      expect(() => manager.register(invalidProfile)).toThrow(ValidationError);
      expect(() => manager.register(invalidProfile)).toThrow('Profile apiKey is required');
    });

    it('应该支持注册多个Profile', () => {
      manager.register(testProfile);
      manager.register(testProfile2);

      expect(manager.size()).toBe(2);
      expect(manager.has('test-profile-1')).toBe(true);
      expect(manager.has('test-profile-2')).toBe(true);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      manager.register(testProfile);
      manager.register(testProfile2);
    });

    it('应该通过ID获取Profile', () => {
      const profile = manager.get('test-profile-1');

      expect(profile).toBeDefined();
      expect(profile?.id).toBe('test-profile-1');
    });

    it('应该返回undefined当Profile不存在时', () => {
      const profile = manager.get('non-existent');

      expect(profile).toBeUndefined();
    });

    it('应该返回默认Profile当未提供ID时', () => {
      const profile = manager.get();

      expect(profile).toBeDefined();
      expect(profile?.id).toBe('test-profile-1');
    });
  });

  describe('getDefault', () => {
    it('应该返回第一个注册的Profile', () => {
      manager.register(testProfile);

      const defaultProfile = manager.getDefault();

      expect(defaultProfile).toBeDefined();
      expect(defaultProfile?.id).toBe('test-profile-1');
    });

    it('应该返回undefined当没有Profile时', () => {
      const defaultProfile = manager.getDefault();

      expect(defaultProfile).toBeUndefined();
    });
  });

  describe('setDefault', () => {
    beforeEach(() => {
      manager.register(testProfile);
      manager.register(testProfile2);
    });

    it('应该成功设置默认Profile', () => {
      manager.setDefault('test-profile-2');

      const defaultProfile = manager.getDefault();
      expect(defaultProfile?.id).toBe('test-profile-2');
    });

    it('应该拒绝设置不存在的Profile为默认', () => {
      expect(() => manager.setDefault('non-existent')).toThrow(NotFoundError);
      expect(() => manager.setDefault('non-existent')).toThrow('Profile not found');
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      manager.register(testProfile);
      manager.register(testProfile2);
    });

    it('应该成功删除Profile', () => {
      manager.remove('test-profile-1');

      expect(manager.has('test-profile-1')).toBe(false);
      expect(manager.size()).toBe(1);
    });

    it('删除默认Profile应该重新设置默认Profile', () => {
      manager.remove('test-profile-1');

      const defaultProfile = manager.getDefault();
      expect(defaultProfile?.id).toBe('test-profile-2');
    });

    it('删除最后一个Profile应该清除默认Profile', () => {
      manager.remove('test-profile-1');
      manager.remove('test-profile-2');

      const defaultProfile = manager.getDefault();
      expect(defaultProfile).toBeUndefined();
    });

    it('删除不存在的Profile不应该抛出错误', () => {
      expect(() => manager.remove('non-existent')).not.toThrow();
    });
  });

  describe('list', () => {
    it('应该返回空数组当没有Profile时', () => {
      const profiles = manager.list();

      expect(profiles).toEqual([]);
    });

    it('应该返回所有Profile', () => {
      manager.register(testProfile);
      manager.register(testProfile2);

      const profiles = manager.list();

      expect(profiles).toHaveLength(2);
      expect(profiles.some(p => p.id === 'test-profile-1')).toBe(true);
      expect(profiles.some(p => p.id === 'test-profile-2')).toBe(true);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      manager.register(testProfile);
      manager.register(testProfile2);
    });

    it('应该清除所有Profile', () => {
      manager.clear();

      expect(manager.size()).toBe(0);
      expect(manager.getDefault()).toBeUndefined();
    });
  });

  describe('has', () => {
    beforeEach(() => {
      manager.register(testProfile);
    });

    it('应该返回true当Profile存在时', () => {
      expect(manager.has('test-profile-1')).toBe(true);
    });

    it('应该返回false当Profile不存在时', () => {
      expect(manager.has('non-existent')).toBe(false);
    });
  });

  describe('size', () => {
    it('应该返回0当没有Profile时', () => {
      expect(manager.size()).toBe(0);
    });

    it('应该返回Profile数量', () => {
      manager.register(testProfile);
      expect(manager.size()).toBe(1);

      manager.register(testProfile2);
      expect(manager.size()).toBe(2);
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的Profile生命周期', () => {
      // 注册
      manager.register(testProfile);
      expect(manager.size()).toBe(1);
      expect(manager.getDefault()?.id).toBe('test-profile-1');

      // 注册第二个
      manager.register(testProfile2);
      expect(manager.size()).toBe(2);

      // 设置默认
      manager.setDefault('test-profile-2');
      expect(manager.getDefault()?.id).toBe('test-profile-2');

      // 获取
      const profile = manager.get('test-profile-1');
      expect(profile?.id).toBe('test-profile-1');

      // 列出
      const profiles = manager.list();
      expect(profiles).toHaveLength(2);

      // 删除
      manager.remove('test-profile-1');
      expect(manager.size()).toBe(1);
      expect(manager.getDefault()?.id).toBe('test-profile-2');

      // 清除
      manager.clear();
      expect(manager.size()).toBe(0);
      expect(manager.getDefault()).toBeUndefined();
    });

    it('应该正确处理默认Profile的自动管理', () => {
      // 第一个Profile自动成为默认
      manager.register(testProfile);
      expect(manager.getDefault()?.id).toBe('test-profile-1');

      // 添加第二个Profile，默认不变
      manager.register(testProfile2);
      expect(manager.getDefault()?.id).toBe('test-profile-1');

      // 手动设置默认
      manager.setDefault('test-profile-2');
      expect(manager.getDefault()?.id).toBe('test-profile-2');

      // 删除默认Profile，自动切换到第一个
      manager.remove('test-profile-2');
      expect(manager.getDefault()?.id).toBe('test-profile-1');

      // 删除最后一个Profile，清除默认
      manager.remove('test-profile-1');
      expect(manager.getDefault()).toBeUndefined();
    });
  });
});