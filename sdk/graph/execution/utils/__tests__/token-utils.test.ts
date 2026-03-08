/**
 * TokenUtils 单元测试
 * 测试 Token 工具函数
 */

import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  getTokenUsage,
  isTokenLimitExceeded
} from '../token-utils.js';
import type { LLMMessage, LLMUsage } from '@modular-agent/types';

describe('estimateTokens', () => {
  describe('基础消息计数', () => {
    it('应该正确估算简单消息的 token 数量', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const tokens = estimateTokens(messages);

      // "Hello" = 1 token, 元数据开销 4 tokens = 5 tokens
      expect(tokens).toBeGreaterThanOrEqual(5);
    });

    it('应该正确估算多条消息的 token 数量', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' }
      ];

      const tokens = estimateTokens(messages);

      // 每条消息至少有 4 个 token 的元数据开销
      expect(tokens).toBeGreaterThanOrEqual(10);
    });

    it('空消息数组返回 0', () => {
      const messages: LLMMessage[] = [];

      const tokens = estimateTokens(messages);

      expect(tokens).toBe(0);
    });
  });

  describe('content 类型处理', () => {
    it('应该正确处理字符串 content', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'This is a test message with some words' }
      ];

      const tokens = estimateTokens(messages);

      expect(tokens).toBeGreaterThan(4); // 至少 content + 元数据
    });

    it('应该正确处理数组 content', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'text', text: 'World' },
            { type: 'text', text: 'Test' }
          ]
        }
      ];

      const tokens = estimateTokens(messages);

      expect(tokens).toBeGreaterThan(4);
    });

    it('应该正确处理空 content', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: '' }
      ];

      const tokens = estimateTokens(messages);

      // 空字符串 0 tokens + 4 元数据 = 4
      expect(tokens).toBeGreaterThanOrEqual(4);
    });
  });

  describe('thinking 内容计数', () => {
    it('应该计数 thinking 内容', () => {
      const messages: LLMMessage[] = [
        {
          role: 'assistant',
          content: 'Answer',
          thinking: 'Let me think about this step by step...'
        }
      ];

      const tokens = estimateTokens(messages);

      // thinking 内容应该被计数
      expect(tokens).toBeGreaterThan(4);
    });

    it('应该正确处理没有 thinking 的消息', () => {
      const messages: LLMMessage[] = [
        { role: 'assistant', content: 'Answer' }
      ];

      const tokens = estimateTokens(messages);

      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('toolCalls 计数', () => {
    it('应该计数 toolCalls 结构', () => {
      const messages: LLMMessage[] = [
        {
          role: 'assistant',
          content: 'Let me call a tool',
          toolCalls: [
            {
              id: 'call-1',
              type: 'function',
              function: {
                name: 'testFunction',
                arguments: '{"arg": "value"}'
              }
            }
          ]
        }
      ];

      const tokens = estimateTokens(messages);

      // toolCalls 应该增加 token 数量
      expect(tokens).toBeGreaterThan(4);
    });

    it('应该正确处理多个 toolCalls', () => {
      const messages: LLMMessage[] = [
        {
          role: 'assistant',
          content: 'Let me call tools',
          toolCalls: [
            {
              id: 'call-1',
              type: 'function',
              function: { name: 'func1', arguments: '{}' }
            },
            {
              id: 'call-2',
              type: 'function',
              function: { name: 'func2', arguments: '{}' }
            }
          ]
        }
      ];

      const tokens = estimateTokens(messages);

      expect(tokens).toBeGreaterThan(4);
    });

    it('应该正确处理没有 toolCalls 的消息', () => {
      const messages: LLMMessage[] = [
        { role: 'assistant', content: 'No tool calls' }
      ];

      const tokens = estimateTokens(messages);

      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('元数据开销', () => {
    it('每条消息应该有约 4 个 token 的元数据开销', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: '' },
        { role: 'assistant', content: '' },
        { role: 'user', content: '' }
      ];

      const tokens = estimateTokens(messages);

      // 3 条消息，每条至少 4 个 token 元数据 = 12 tokens
      expect(tokens).toBeGreaterThanOrEqual(12);
    });
  });
});

describe('getTokenUsage', () => {
  it('当提供 usage 时，优先使用 API 统计', () => {
    const usage: LLMUsage = {
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15
    };
    const messages: LLMMessage[] = [
      { role: 'user', content: 'Test' }
    ];

    const tokens = getTokenUsage(usage, messages);

    expect(tokens).toBe(15);
  });

  it('当没有 usage 时，使用本地估算', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'Test message' }
    ];

    const tokens = getTokenUsage(null, messages);

    expect(tokens).toBeGreaterThan(0);
  });

  it('当 usage 为 undefined 时，使用本地估算', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'Test message' }
    ];

    const tokens = getTokenUsage(undefined as any, messages);

    expect(tokens).toBeGreaterThan(0);
  });

  it('本地估算应该与 estimateTokens 结果一致', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'Test message for comparison' }
    ];

    const usageTokens = getTokenUsage(null, messages);
    const estimatedTokens = estimateTokens(messages);

    expect(usageTokens).toBe(estimatedTokens);
  });
});

describe('isTokenLimitExceeded', () => {
  it('当 tokensUsed 超过 tokenLimit 时返回 true', () => {
    expect(isTokenLimitExceeded(100, 50)).toBe(true);
    expect(isTokenLimitExceeded(51, 50)).toBe(true);
  });

  it('当 tokensUsed 等于 tokenLimit 时返回 false', () => {
    expect(isTokenLimitExceeded(50, 50)).toBe(false);
  });

  it('当 tokensUsed 小于 tokenLimit 时返回 false', () => {
    expect(isTokenLimitExceeded(49, 50)).toBe(false);
    expect(isTokenLimitExceeded(0, 50)).toBe(false);
  });

  it('正确处理边界值', () => {
    expect(isTokenLimitExceeded(0, 0)).toBe(false);
    expect(isTokenLimitExceeded(1, 0)).toBe(true);
  });

  it('正确处理大数值', () => {
    expect(isTokenLimitExceeded(1000000, 500000)).toBe(true);
    expect(isTokenLimitExceeded(500000, 1000000)).toBe(false);
  });
});

describe('集成测试', () => {
  it('完整的 token 估算流程', () => {
    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'Hello, how are you?' },
      {
        role: 'assistant',
        content: 'I am doing well, thank you!',
        thinking: 'The user is greeting me'
      }
    ];

    const tokens = estimateTokens(messages);

    // 验证总 token 数量合理
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(1000); // 合理上限
  });

  it('Token 限制检查与估算结合', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'A very long message '.repeat(100) }
    ];

    const tokens = getTokenUsage(null, messages);
    const limit = 500;

    // 长消息可能超过限制
    const isExceeded = isTokenLimitExceeded(tokens, limit);

    // 验证逻辑一致性
    if (tokens > limit) {
      expect(isExceeded).toBe(true);
    } else {
      expect(isExceeded).toBe(false);
    }
  });
});
