/**
 * FormatterRegistry 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FormatterRegistry, formatterRegistry, getFormatter, registerFormatter } from '../registry.js';
import { BaseFormatter } from '../base.js';
import type { LLMRequest, LLMMessage, LLMToolCall, ToolSchema } from '@modular-agent/types';
import type { FormatterConfig, ParseStreamChunkResult } from '../types.js';

// 创建一个测试用的 Formatter
class TestFormatter extends BaseFormatter {
  getSupportedProvider(): string {
    return 'TEST_PROVIDER';
  }

  buildRequest(request: LLMRequest, config: FormatterConfig) {
    return {
      httpRequest: {
        url: '/test',
        method: 'POST' as const,
        headers: {},
        body: {}
      }
    };
  }

  parseResponse(data: any, config: FormatterConfig) {
    return {
      id: 'test-id',
      model: 'test-model',
      content: data.content || '',
      message: { role: 'assistant' as const, content: data.content || '' },
      finishReason: 'stop',
      duration: 0
    };
  }

  parseStreamChunk(data: any, config: FormatterConfig): ParseStreamChunkResult {
    return {
      chunk: {
        delta: data.delta || '',
        done: data.done || false
      },
      valid: true
    };
  }

  convertTools(tools: ToolSchema[]): any {
    return tools;
  }

  convertMessages(messages: LLMMessage[]): any {
    return messages;
  }

  parseToolCalls(data: any): LLMToolCall[] {
    return data || [];
  }
}

describe('FormatterRegistry', () => {
  let registry: FormatterRegistry;

  beforeEach(() => {
    // 创建一个新的注册表实例，避免影响全局单例
    registry = new FormatterRegistry();
  });

  describe('register', () => {
    it('应该注册格式转换器', () => {
      const formatter = new TestFormatter();
      registry.register(formatter);

      expect(registry.has('TEST_PROVIDER')).toBe(true);
      expect(registry.get('TEST_PROVIDER')).toBe(formatter);
    });

    it('应该覆盖已注册的格式转换器', () => {
      const formatter1 = new TestFormatter();
      const formatter2 = new TestFormatter();

      registry.register(formatter1);
      registry.register(formatter2);

      expect(registry.get('TEST_PROVIDER')).toBe(formatter2);
    });

    it('应该在覆盖时发出警告', () => {
      const formatter1 = new TestFormatter();
      const formatter2 = new TestFormatter();

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      registry.register(formatter1);
      registry.register(formatter2);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('TEST_PROVIDER')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('get', () => {
    it('应该获取已注册的格式转换器', () => {
      const formatter = new TestFormatter();
      registry.register(formatter);

      const retrieved = registry.get('TEST_PROVIDER');
      expect(retrieved).toBe(formatter);
    });

    it('应该在格式转换器不存在时返回 undefined', () => {
      const retrieved = registry.get('NON_EXISTENT');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('has', () => {
    it('应该在格式转换器已注册时返回 true', () => {
      const formatter = new TestFormatter();
      registry.register(formatter);

      expect(registry.has('TEST_PROVIDER')).toBe(true);
    });

    it('应该在格式转换器未注册时返回 false', () => {
      expect(registry.has('NON_EXISTENT')).toBe(false);
    });
  });

  describe('getRegisteredProviders', () => {
    it('应该返回所有已注册的提供商', () => {
      const formatter = new TestFormatter();
      registry.register(formatter);

      const providers = registry.getRegisteredProviders();
      expect(providers).toContain('TEST_PROVIDER');
    });
  });

  describe('unregister', () => {
    it('应该注销格式转换器', () => {
      const formatter = new TestFormatter();
      registry.register(formatter);

      const result = registry.unregister('TEST_PROVIDER');
      expect(result).toBe(true);
      expect(registry.has('TEST_PROVIDER')).toBe(false);
    });

    it('应该在格式转换器不存在时返回 false', () => {
      const result = registry.unregister('NON_EXISTENT');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('应该清空所有注册', () => {
      const formatter = new TestFormatter();
      registry.register(formatter);

      registry.clear();

      expect(registry.getRegisteredProviders()).toHaveLength(0);
    });
  });

  describe('reset', () => {
    it('应该重置为默认注册', () => {
      const formatter = new TestFormatter();
      registry.register(formatter);

      registry.reset();

      expect(registry.has('TEST_PROVIDER')).toBe(false);
      expect(registry.getRegisteredProviders().length).toBeGreaterThan(0);
    });
  });

  describe('getInstance', () => {
    it('应该返回单例实例', () => {
      const instance1 = FormatterRegistry.getInstance();
      const instance2 = FormatterRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});

describe('全局实例和便捷函数', () => {
  afterEach(() => {
    // 重置全局注册表
    formatterRegistry.reset();
  });

  describe('formatterRegistry', () => {
    it('应该提供全局注册表实例', () => {
      expect(formatterRegistry).toBeInstanceOf(FormatterRegistry);
    });

    it('应该预注册默认的格式转换器', () => {
      const providers = formatterRegistry.getRegisteredProviders();
      expect(providers).toContain('OPENAI_CHAT');
      expect(providers).toContain('OPENAI_RESPONSE');
      expect(providers).toContain('ANTHROPIC');
      expect(providers).toContain('GEMINI_NATIVE');
      expect(providers).toContain('GEMINI_OPENAI');
    });
  });

  describe('getFormatter', () => {
    it('应该获取已注册的格式转换器', () => {
      const formatter = getFormatter('OPENAI_CHAT');
      expect(formatter).toBeDefined();
      expect(formatter.getSupportedProvider()).toBe('OPENAI_CHAT');
    });

    it('应该在格式转换器不存在时抛出错误', () => {
      expect(() => getFormatter('NON_EXISTENT')).toThrow(
        'No formatter registered for provider: NON_EXISTENT'
      );
    });
  });

  describe('registerFormatter', () => {
    it('应该注册格式转换器到全局注册表', () => {
      const formatter = new TestFormatter();
      registerFormatter(formatter);

      expect(formatterRegistry.has('TEST_PROVIDER')).toBe(true);
      expect(formatterRegistry.get('TEST_PROVIDER')).toBe(formatter);
    });
  });
});
