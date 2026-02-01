/**
 * 限流器单元测试
 */

import { RateLimiter } from '../rate-limiter';

describe('RateLimiter', () => {
  describe('构造函数', () => {
    it('应该使用指定配置创建限流器', () => {
      const limiter = new RateLimiter({
        capacity: 10,
        refillRate: 5,
      });
      expect(limiter.getAvailableTokens()).toBe(10);
    });
  });

  describe('waitForToken', () => {
    it('应该立即获取令牌（当有可用令牌时）', async () => {
      const limiter = new RateLimiter({
        capacity: 10,
        refillRate: 5,
      });
      
      const startTime = Date.now();
      await limiter.waitForToken();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100);
      expect(limiter.getAvailableTokens()).toBe(9);
    });

    it('应该等待令牌（当没有可用令牌时）', async () => {
      const limiter = new RateLimiter({
        capacity: 2,
        refillRate: 10, // 每秒10个令牌
      });
      
      // 消耗所有令牌
      await limiter.waitForToken();
      await limiter.waitForToken();
      expect(limiter.getAvailableTokens()).toBe(0);
      
      // 下一个请求应该等待
      const startTime = Date.now();
      await limiter.waitForToken();
      const endTime = Date.now();
      
      // 应该等待约100ms（1/10秒）
      expect(endTime - startTime).toBeGreaterThanOrEqual(80);
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('应该正确处理多个并发请求', async () => {
      const limiter = new RateLimiter({
        capacity: 3,
        refillRate: 10,
      });
      
      // 消耗所有令牌
      await limiter.waitForToken();
      await limiter.waitForToken();
      await limiter.waitForToken();
      
      // 并发请求应该都能成功
      const promises = [
        limiter.waitForToken(),
        limiter.waitForToken(),
        limiter.waitForToken(),
      ];
      
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });

  describe('getAvailableTokens', () => {
    it('应该返回初始容量', () => {
      const limiter = new RateLimiter({
        capacity: 10,
        refillRate: 5,
      });
      expect(limiter.getAvailableTokens()).toBe(10);
    });

    it('应该在消耗令牌后减少', async () => {
      const limiter = new RateLimiter({
        capacity: 10,
        refillRate: 5,
      });
      
      await limiter.waitForToken();
      expect(limiter.getAvailableTokens()).toBe(9);
      
      await limiter.waitForToken();
      expect(limiter.getAvailableTokens()).toBe(8);
    });

    it('应该随时间自动填充令牌', async () => {
      const limiter = new RateLimiter({
        capacity: 10,
        refillRate: 10, // 每秒10个令牌
      });
      
      // 消耗所有令牌
      for (let i = 0; i < 10; i++) {
        await limiter.waitForToken();
      }
      expect(limiter.getAvailableTokens()).toBe(0);
      
      // 等待200ms，应该有约2个令牌
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(limiter.getAvailableTokens()).toBeGreaterThanOrEqual(1);
      expect(limiter.getAvailableTokens()).toBeLessThanOrEqual(3);
    });

    it('不应该超过容量', async () => {
      const limiter = new RateLimiter({
        capacity: 5,
        refillRate: 10,
      });
      
      // 消耗一些令牌
      await limiter.waitForToken();
      await limiter.waitForToken();
      
      // 等待足够时间让令牌填满
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(limiter.getAvailableTokens()).toBeLessThanOrEqual(5);
    });
  });

  describe('reset', () => {
    it('应该重置令牌到初始容量', async () => {
      const limiter = new RateLimiter({
        capacity: 10,
        refillRate: 5,
      });
      
      // 消耗一些令牌
      await limiter.waitForToken();
      await limiter.waitForToken();
      await limiter.waitForToken();
      
      expect(limiter.getAvailableTokens()).toBe(7);
      
      limiter.reset();
      expect(limiter.getAvailableTokens()).toBe(10);
    });

    it('应该重置填充时间', async () => {
      const limiter = new RateLimiter({
        capacity: 10,
        refillRate: 5,
      });
      
      // 消耗一些令牌
      await limiter.waitForToken();
      await limiter.waitForToken();
      
      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 100));
      
      limiter.reset();
      
      // 重置后应该立即有完整容量
      expect(limiter.getAvailableTokens()).toBe(10);
    });
  });

  describe('边界情况', () => {
    it('应该处理容量为1的情况', async () => {
      const limiter = new RateLimiter({
        capacity: 1,
        refillRate: 5,
      });
      
      expect(limiter.getAvailableTokens()).toBe(1);
      
      await limiter.waitForToken();
      expect(limiter.getAvailableTokens()).toBe(0);
      
      // 应该等待令牌
      const startTime = Date.now();
      await limiter.waitForToken();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(150);
    });

    it('应该处理低填充速率', async () => {
      const limiter = new RateLimiter({
        capacity: 5,
        refillRate: 1, // 每秒1个令牌
      });
      
      // 消耗所有令牌
      for (let i = 0; i < 5; i++) {
        await limiter.waitForToken();
      }
      
      expect(limiter.getAvailableTokens()).toBe(0);
      
      // 等待500ms，应该有约0.5个令牌（浮点数）
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(limiter.getAvailableTokens()).toBeGreaterThan(0);
      expect(limiter.getAvailableTokens()).toBeLessThan(1);
      
      // 等待1000ms，应该有约1.5个令牌
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(limiter.getAvailableTokens()).toBeGreaterThanOrEqual(1);
    });
  });
});