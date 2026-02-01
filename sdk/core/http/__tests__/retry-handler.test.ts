/**
 * 重试处理器单元测试
 */

import { RetryHandler } from '../retry-handler';
import { TimeoutError, NetworkError, RateLimitError, HttpError } from '../../../types/errors';

describe('RetryHandler', () => {
  describe('构造函数', () => {
    it('应该使用默认配置创建重试处理器', () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 1000,
      });
      expect(handler).toBeDefined();
    });

    it('应该使用自定义配置创建重试处理器', () => {
      const handler = new RetryHandler({
        maxRetries: 5,
        baseDelay: 500,
        maxDelay: 10000,
      });
      expect(handler).toBeDefined();
    });
  });

  describe('executeWithRetry', () => {
    it('应该成功执行函数（无需重试）', async () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 100,
      });
      
      const fn = jest.fn().mockResolvedValue('success');
      const result = await handler.executeWithRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该重试TimeoutError', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        baseDelay: 50,
      });
      
      const fn = jest.fn()
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockResolvedValue('success');
      
      const result = await handler.executeWithRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('应该重试NetworkError', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        baseDelay: 50,
      });
      
      const fn = jest.fn()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValue('success');
      
      const result = await handler.executeWithRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该重试RateLimitError', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        baseDelay: 50,
      });
      
      const fn = jest.fn()
        .mockRejectedValueOnce(new RateLimitError('Rate limit exceeded'))
        .mockResolvedValue('success');
      
      const result = await handler.executeWithRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该重试429状态码', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        baseDelay: 50,
      });
      
      const fn = jest.fn()
        .mockRejectedValueOnce(new HttpError('Too Many Requests', 429))
        .mockResolvedValue('success');
      
      const result = await handler.executeWithRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该重试5xx状态码', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        baseDelay: 50,
      });
      
      const fn = jest.fn()
        .mockRejectedValueOnce(new HttpError('Internal Server Error', 500))
        .mockResolvedValue('success');
      
      const result = await handler.executeWithRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('不应该重试4xx状态码（除了429）', async () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 50,
      });
      
      const fn = jest.fn().mockRejectedValue(new HttpError('Bad Request', 400));
      
      await expect(handler.executeWithRetry(fn)).rejects.toThrow('Bad Request');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('不应该重试普通Error', async () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 50,
      });
      
      const fn = jest.fn().mockRejectedValue(new Error('Generic error'));
      
      await expect(handler.executeWithRetry(fn)).rejects.toThrow('Generic error');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        baseDelay: 50,
      });
      
      const fn = jest.fn().mockRejectedValue(new TimeoutError('Timeout', 5000));
      
      await expect(handler.executeWithRetry(fn)).rejects.toThrow('Timeout');
      expect(fn).toHaveBeenCalledTimes(3); // 初始调用 + 2次重试
    });

    it('应该使用指数退避延迟', async () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 100,
      });
      
      const fn = jest.fn()
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      await handler.executeWithRetry(fn);
      const endTime = Date.now();
      
      // 第一次重试延迟约100ms，第二次约200ms
      // 总延迟应该至少300ms
      expect(endTime - startTime).toBeGreaterThanOrEqual(250);
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('应该限制最大延迟时间', async () => {
      const handler = new RetryHandler({
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 2000,
      });
      
      const fn = jest.fn()
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      await handler.executeWithRetry(fn);
      const endTime = Date.now();
      
      // 延迟应该是 1000 + 2000 + 2000 = 5000ms（受maxDelay限制）
      expect(endTime - startTime).toBeGreaterThanOrEqual(4500);
      expect(endTime - startTime).toBeLessThan(6000);
    });
  });

  describe('shouldRetry', () => {
    it('应该对TimeoutError返回true', () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 100,
      });
      
      const error = new TimeoutError('Timeout', 5000);
      expect(handler['shouldRetry'](error)).toBe(true);
    });

    it('应该对NetworkError返回true', () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 100,
      });
      
      const error = new NetworkError('Network error');
      expect(handler['shouldRetry'](error)).toBe(true);
    });

    it('应该对RateLimitError返回true', () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 100,
      });
      
      const error = new RateLimitError('Rate limit exceeded');
      expect(handler['shouldRetry'](error)).toBe(true);
    });

    it('应该对429状态码返回true', () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 100,
      });
      
      const error = new HttpError('Too Many Requests', 429);
      expect(handler['shouldRetry'](error)).toBe(true);
    });

    it('应该对5xx状态码返回true', () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 100,
      });
      
      const error = new HttpError('Internal Server Error', 500);
      expect(handler['shouldRetry'](error)).toBe(true);
    });

    it('应该对4xx状态码（除了429）返回false', () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 100,
      });
      
      const error400 = new HttpError('Bad Request', 400);
      const error401 = new HttpError('Unauthorized', 401);
      const error403 = new HttpError('Forbidden', 403);
      const error404 = new HttpError('Not Found', 404);
      
      expect(handler['shouldRetry'](error400)).toBe(false);
      expect(handler['shouldRetry'](error401)).toBe(false);
      expect(handler['shouldRetry'](error403)).toBe(false);
      expect(handler['shouldRetry'](error404)).toBe(false);
    });

    it('应该对普通Error返回false', () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 100,
      });
      
      const error = new Error('Generic error');
      expect(handler['shouldRetry'](error)).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    it('应该计算指数退避延迟', () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 100,
      });
      
      expect(handler['calculateDelay'](0)).toBe(100);
      expect(handler['calculateDelay'](1)).toBe(200);
      expect(handler['calculateDelay'](2)).toBe(400);
      expect(handler['calculateDelay'](3)).toBe(800);
    });

    it('应该限制最大延迟', () => {
      const handler = new RetryHandler({
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 2000,
      });
      
      expect(handler['calculateDelay'](0)).toBe(1000);
      expect(handler['calculateDelay'](1)).toBe(2000);
      expect(handler['calculateDelay'](2)).toBe(2000); // 受maxDelay限制
      expect(handler['calculateDelay'](3)).toBe(2000); // 受maxDelay限制
    });
  });
});