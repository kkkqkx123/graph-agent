/**
 * TokenUsageTracker 单元测试
 */

import { TokenUsageTracker } from '../token-usage-tracker';
import type { LLMMessage } from '../../../types/llm';

describe('TokenUsageTracker', () => {
  let tracker: TokenUsageTracker;

  beforeEach(() => {
    tracker = new TokenUsageTracker({ tokenLimit: 4000 });
  });

  describe('updateApiUsage', () => {
    it('应该正确更新单次 API 调用的 usage', () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };

      tracker.updateApiUsage(usage);
      tracker.finalizeCurrentRequest();

      const cumulative = tracker.getCumulativeUsage();
      expect(cumulative?.promptTokens).toBe(100);
      expect(cumulative?.completionTokens).toBe(50);
      expect(cumulative?.totalTokens).toBe(150);
    });

    it('应该正确累计多次 API 调用的 usage', () => {
      const usage1 = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };

      const usage2 = {
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300
      };

      tracker.updateApiUsage(usage1);
      tracker.finalizeCurrentRequest();

      tracker.updateApiUsage(usage2);
      tracker.finalizeCurrentRequest();

      const cumulative = tracker.getCumulativeUsage();
      expect(cumulative?.promptTokens).toBe(300);
      expect(cumulative?.completionTokens).toBe(150);
      expect(cumulative?.totalTokens).toBe(450);
    });
  });

  describe('accumulateStreamUsage', () => {
    it('应该正确处理流式响应的 usage 累积', () => {
      // 模拟 message_start 事件
      const startUsage = {
        promptTokens: 100,
        completionTokens: 0,
        totalTokens: 100
      };

      // 模拟 message_delta 事件
      const deltaUsage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };

      tracker.accumulateStreamUsage(startUsage);
      tracker.accumulateStreamUsage(deltaUsage);

      const current = tracker.getCurrentRequestUsage();
      expect(current?.promptTokens).toBe(100);
      expect(current?.completionTokens).toBe(50);
      expect(current?.totalTokens).toBe(150);
    });

    it('应该正确处理多次流式更新', () => {
      const usage1 = {
        promptTokens: 100,
        completionTokens: 10,
        totalTokens: 110
      };

      const usage2 = {
        promptTokens: 100,
        completionTokens: 30,
        totalTokens: 130
      };

      const usage3 = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };

      tracker.accumulateStreamUsage(usage1);
      tracker.accumulateStreamUsage(usage2);
      tracker.accumulateStreamUsage(usage3);

      const current = tracker.getCurrentRequestUsage();
      expect(current?.completionTokens).toBe(50);
      expect(current?.totalTokens).toBe(150);
    });
  });

  describe('finalizeCurrentRequest', () => {
    it('应该将当前请求的 usage 累加到总使用量', () => {
      const usage1 = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };

      const usage2 = {
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300
      };

      tracker.updateApiUsage(usage1);
      tracker.finalizeCurrentRequest();

      tracker.updateApiUsage(usage2);
      tracker.finalizeCurrentRequest();

      const cumulative = tracker.getCumulativeUsage();
      expect(cumulative?.promptTokens).toBe(300);
      expect(cumulative?.completionTokens).toBe(150);
      expect(cumulative?.totalTokens).toBe(450);
    });

    it('应该在多次调用时正确累加', () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };

      // 调用三次
      tracker.updateApiUsage(usage);
      tracker.finalizeCurrentRequest();

      tracker.updateApiUsage(usage);
      tracker.finalizeCurrentRequest();

      tracker.updateApiUsage(usage);
      tracker.finalizeCurrentRequest();

      const cumulative = tracker.getCumulativeUsage();
      expect(cumulative?.promptTokens).toBe(300);
      expect(cumulative?.completionTokens).toBe(150);
      expect(cumulative?.totalTokens).toBe(450);
    });
  });

  describe('estimateTokens', () => {
    it('应该正确估算字符串消息的 token 数量', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello, world!' }
      ];

      const estimated = tracker.estimateTokens(messages);
      expect(estimated).toBeGreaterThan(0);
      expect(estimated).toBeLessThan(100); // 简单消息应该小于 100 tokens
    });

    it('应该正确估算数组消息的 token 数量', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'text', text: 'World' }
          ]
        }
      ];

      const estimated = tracker.estimateTokens(messages);
      expect(estimated).toBeGreaterThan(0);
    });

    it('应该正确估算对象消息的 token 数量', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: 'https://example.com/image.png' } }
          ]
        }
      ];

      const estimated = tracker.estimateTokens(messages);
      expect(estimated).toBeGreaterThan(0);
    });
  });

  describe('getTokenUsage', () => {
    it('应该优先使用 API 统计', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello, world!' }
      ];

      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };

      tracker.updateApiUsage(usage);
      tracker.finalizeCurrentRequest();

      const tokenUsage = tracker.getTokenUsage(messages);
      expect(tokenUsage).toBe(150);
    });

    it('应该在没有 API 统计时使用本地估算', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello, world!' }
      ];

      const tokenUsage = tracker.getTokenUsage(messages);
      expect(tokenUsage).toBeGreaterThan(0);
    });
  });

  describe('isTokenLimitExceeded', () => {
    it('应该正确检测 token 限制是否被超过', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello, world!' }
      ];

      const usage = {
        promptTokens: 3000,
        completionTokens: 2000,
        totalTokens: 5000
      };

      tracker.updateApiUsage(usage);
      tracker.finalizeCurrentRequest();

      expect(tracker.isTokenLimitExceeded(messages)).toBe(true);
    });

    it('应该正确检测 token 限制未被超过', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello, world!' }
      ];

      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500
      };

      tracker.updateApiUsage(usage);
      tracker.finalizeCurrentRequest();

      expect(tracker.isTokenLimitExceeded(messages)).toBe(false);
    });
  });

  describe('reset', () => {
    it('应该正确重置 token 使用统计', () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };

      tracker.updateApiUsage(usage);
      tracker.reset();

      expect(tracker.getCumulativeUsage()).toBeNull();
      expect(tracker.getCurrentRequestUsage()).toBeNull();
    });
  });

  describe('clone', () => {
    it('应该正确克隆 TokenUsageTracker 实例', () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };

      tracker.updateApiUsage(usage);
      tracker.finalizeCurrentRequest();

      const cloned = tracker.clone();

      expect(cloned.getCumulativeUsage()).toEqual(tracker.getCumulativeUsage());

      // 修改原始实例不应该影响克隆的实例
      tracker.updateApiUsage({
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300
      });
      tracker.finalizeCurrentRequest();

      expect(cloned.getCumulativeUsage()?.totalTokens).toBe(150);
      expect(tracker.getCumulativeUsage()?.totalTokens).toBe(450);
    });
  });
});