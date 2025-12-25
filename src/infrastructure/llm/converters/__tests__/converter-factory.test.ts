/**
 * 转换器工厂测试
 */

import { ConverterFactory } from '../converter-factory';
import { OpenAIProvider } from '../providers/openai-provider';
import { AnthropicProvider } from '../providers/anthropic-provider';
import { GeminiProvider } from '../providers/gemini-provider';
import { IProvider } from '../base';

describe('ConverterFactory', () => {
  let factory: ConverterFactory;

  beforeEach(() => {
    // 重置单例实例，确保每个测试都使用干净的工厂
    (ConverterFactory as any).instance = undefined;
    factory = ConverterFactory.getInstance();
    // 手动注册默认提供商用于测试
    factory.registerProvider('openai', OpenAIProvider);
    factory.registerProvider('anthropic', AnthropicProvider);
    factory.registerProvider('gemini', GeminiProvider);
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const factory1 = ConverterFactory.getInstance();
      const factory2 = ConverterFactory.getInstance();
      expect(factory1).toBe(factory2);
    });
  });

  describe('提供商注册', () => {
    it('应该注册所有默认提供商', () => {
      const providers = factory.getRegisteredProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('gemini');
    });

    it('应该能够注册新的提供商', () => {
      class TestProvider extends OpenAIProvider {
        constructor() {
          super();
        }
        override getName(): string {
          return 'test';
        }
      }

      factory.registerProvider('test', TestProvider);
      const providers = factory.getRegisteredProviders();
      expect(providers).toContain('test');
    });

    it('应该能够注销提供商', () => {
      factory.registerProvider('temp-provider', OpenAIProvider); // 先注册一个临时提供商
      factory.unregisterProvider('temp-provider');
      const providers = factory.getRegisteredProviders();
      expect(providers).not.toContain('temp-provider');
    });

    it('应该拒绝重复注册提供商', () => {
      expect(() => {
        factory.registerProvider('openai', OpenAIProvider);
      }).toThrow('提供商 openai 已经注册');
    });
  });

  describe('提供商创建', () => {
    it('应该创建OpenAI提供商', () => {
      const provider = factory.createProvider('openai');
      expect(provider).not.toBeNull();
      expect(provider!).toBeInstanceOf(OpenAIProvider);
      expect(provider!.getName()).toBe('openai');
    });

    it('应该创建Anthropic提供商', () => {
      const provider = factory.createProvider('anthropic');
      expect(provider).not.toBeNull();
      expect(provider!).toBeInstanceOf(AnthropicProvider);
      expect(provider!.getName()).toBe('anthropic');
    });

    it('应该创建Gemini提供商', () => {
      const provider = factory.createProvider('gemini');
      expect(provider).not.toBeNull();
      expect(provider!).toBeInstanceOf(GeminiProvider);
      expect(provider!.getName()).toBe('gemini');
    });

    it('应该创建自定义提供商', () => {
      class TestProvider extends OpenAIProvider {
        constructor() {
          super();
        }
        override getName(): string {
          return 'test';
        }
      }

      // 由于前面已经注册了test提供商，这里使用不同的名称
      factory.registerProvider('custom-test', TestProvider);
      const provider = factory.createProvider('custom-test');
      expect(provider).not.toBeNull();
      expect(provider!).toBeInstanceOf(TestProvider);
      expect(provider!.getName()).toBe('test');
    });

    it('应该拒绝创建未注册的提供商', () => {
      const provider = factory.createProvider('nonexistent');
      expect(provider).toBeNull();
    });
  });

  describe('提供商检查', () => {
    it('应该检查提供商是否已注册', () => {
      expect(factory.hasProvider('openai')).toBe(true);
      expect(factory.hasProvider('anthropic')).toBe(true);
      expect(factory.hasProvider('gemini')).toBe(true);
      expect(factory.hasProvider('nonexistent')).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的提供商类', () => {
      class InvalidProvider implements IProvider {
        getName(): string {
          return 'invalid';
        }
        convertRequest(messages: any, parameters: any): any {
          return {};
        }
        convertResponse(response: any): any {
          return {};
        }
        convertStreamResponse(events: any[]): any {
          return {};
        }
        validateRequest(messages: any, parameters: any): string[] {
          return [];
        }
        getDefaultModel(): string {
          return 'invalid';
        }
        getSupportedModels(): string[] {
          return [];
        }
      }

      factory.registerProvider('invalid', InvalidProvider);
      const provider = factory.createProvider('invalid');
      expect(provider).not.toBeNull();
      expect(provider!.getName()).toBe('invalid');
    });

    it('应该处理注销不存在的提供商', () => {
      // 应该不抛出错误，只是静默处理
      expect(() => {
        factory.unregisterProvider('nonexistent');
      }).not.toThrow();
    });
  });
});