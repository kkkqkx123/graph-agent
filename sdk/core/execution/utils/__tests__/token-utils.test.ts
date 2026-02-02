/**
 * Token 工具函数单元测试
 */

import {
  estimateTokens,
  getTokenUsage,
  isTokenLimitExceeded
} from '../token-utils';
import type { LLMMessage, LLMUsage } from '../../../../types/llm';

describe('token-utils', () => {
  describe('estimateTokens', () => {
    it('应该正确估算空消息数组的 token 数量', () => {
      const messages: LLMMessage[] = [];
      const tokens = estimateTokens(messages);
      expect(tokens).toBe(0);
    });

    it('应该正确估算单条字符串消息的 token 数量', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello, world!' }
      ];
      const tokens = estimateTokens(messages);
      // "Hello, world!" 大约 4 个 token + 4 个元数据 token = 8
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(20);
    });

    it('应该正确估算多条消息的 token 数量', () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      const tokens = estimateTokens(messages);
      expect(tokens).toBeGreaterThan(0);
      // 每条消息至少 4 个元数据 token
      expect(tokens).toBeGreaterThanOrEqual(12);
    });

    it('应该正确估算包含 thinking 的消息 token 数量', () => {
      const messages: LLMMessage[] = [
        {
          role: 'assistant',
          content: 'The answer is 42.',
          thinking: 'Let me think about this problem...'
        }
      ];
      const tokens = estimateTokens(messages);
      expect(tokens).toBeGreaterThan(0);
      // content + thinking + 元数据
      expect(tokens).toBeGreaterThan(10);
    });

    it('应该正确估算包含 toolCalls 的消息 token 数量', () => {
      const messages: LLMMessage[] = [
        {
          role: 'assistant',
          content: 'I will call a tool.',
          toolCalls: [
            {
              id: 'call-123',
              type: 'function',
              function: {
                name: 'getWeather',
                arguments: '{"location": "Beijing"}'
              }
            }
          ]
        }
      ];
      const tokens = estimateTokens(messages);
      expect(tokens).toBeGreaterThan(0);
      // content + toolCalls + 元数据
      expect(tokens).toBeGreaterThan(10);
    });

    it('应该正确估算数组类型内容的消息 token 数量', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: [
            'First part of message',
            'Second part of message',
            { type: 'text', text: 'Third part' }
          ]
        }
      ];
      const tokens = estimateTokens(messages);
      expect(tokens).toBeGreaterThan(0);
      // 数组内容 + 元数据
      expect(tokens).toBeGreaterThan(10);
    });

    it('应该正确估算混合类型内容的消息 token 数量', () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'System prompt' },
        {
          role: 'user',
          content: ['User message part 1', 'User message part 2']
        },
        {
          role: 'assistant',
          content: 'Assistant response',
          thinking: 'Thinking process',
          toolCalls: [
            {
              id: 'call-456',
              type: 'function',
              function: {
                name: 'calculate',
                arguments: '{"a": 1, "b": 2}'
              }
            }
          ]
        }
      ];
      const tokens = estimateTokens(messages);
      expect(tokens).toBeGreaterThan(0);
      // 所有内容 + 元数据
      expect(tokens).toBeGreaterThan(20);
    });

    it('应该正确处理空字符串内容', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: '' }
      ];
      const tokens = estimateTokens(messages);
      // 空字符串 + 4 个元数据 token
      expect(tokens).toBe(4);
    });

    it('应该正确处理空数组内容', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: [] }
      ];
      const tokens = estimateTokens(messages);
      // 空数组 + 4 个元数据 token
      expect(tokens).toBe(4);
    });

    it('应该正确处理包含 null 的数组内容', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: ['text', null, 'more text'] }
      ];
      const tokens = estimateTokens(messages);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('getTokenUsage', () => {
    it('应该优先使用 API 返回的 usage 统计', () => {
      const usage: LLMUsage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];
      const tokens = getTokenUsage(usage, messages);
      expect(tokens).toBe(150);
    });

    it('应该在 usage 为 null 时使用本地估算', () => {
      const usage = null;
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello, world!' }
      ];
      const tokens = getTokenUsage(usage, messages);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(20);
    });

    it('应该在 usage 为 null 时使用本地估算', () => {
      const usage = null;
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello, world!' }
      ];
      const tokens = getTokenUsage(usage, messages);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(20);
    });

    it('应该正确处理包含成本的 usage', () => {
      const usage: LLMUsage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        promptTokensCost: 0.001,
        completionTokensCost: 0.002,
        totalCost: 0.003
      };
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];
      const tokens = getTokenUsage(usage, messages);
      expect(tokens).toBe(150);
    });

    it('应该正确处理空消息数组和 null usage', () => {
      const usage = null;
      const messages: LLMMessage[] = [];
      const tokens = getTokenUsage(usage, messages);
      expect(tokens).toBe(0);
    });
  });

  describe('isTokenLimitExceeded', () => {
    it('应该在 token 使用量超过限制时返回 true', () => {
      const tokensUsed = 1500;
      const tokenLimit = 1000;
      const exceeded = isTokenLimitExceeded(tokensUsed, tokenLimit);
      expect(exceeded).toBe(true);
    });

    it('应该在 token 使用量等于限制时返回 false', () => {
      const tokensUsed = 1000;
      const tokenLimit = 1000;
      const exceeded = isTokenLimitExceeded(tokensUsed, tokenLimit);
      expect(exceeded).toBe(false);
    });

    it('应该在 token 使用量小于限制时返回 false', () => {
      const tokensUsed = 500;
      const tokenLimit = 1000;
      const exceeded = isTokenLimitExceeded(tokensUsed, tokenLimit);
      expect(exceeded).toBe(false);
    });

    it('应该正确处理零 token 使用量', () => {
      const tokensUsed = 0;
      const tokenLimit = 1000;
      const exceeded = isTokenLimitExceeded(tokensUsed, tokenLimit);
      expect(exceeded).toBe(false);
    });

    it('应该正确处理负数 token 使用量（边界情况）', () => {
      const tokensUsed = -100;
      const tokenLimit = 1000;
      const exceeded = isTokenLimitExceeded(tokensUsed, tokenLimit);
      expect(exceeded).toBe(false);
    });

    it('应该正确处理零 token 限制', () => {
      const tokensUsed = 100;
      const tokenLimit = 0;
      const exceeded = isTokenLimitExceeded(tokensUsed, tokenLimit);
      expect(exceeded).toBe(true);
    });

    it('应该正确处理负数 token 限制（边界情况）', () => {
      const tokensUsed = 100;
      const tokenLimit = -100;
      const exceeded = isTokenLimitExceeded(tokensUsed, tokenLimit);
      expect(exceeded).toBe(true);
    });
  });
});