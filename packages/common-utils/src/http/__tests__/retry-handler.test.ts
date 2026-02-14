/**
 * 重试处理器单元测试
 */

import { executeWithRetry } from '../retry-handler';
import { TimeoutError, NetworkError, HttpError } from '@modular-agent/types';
import { RateLimitError } from '../errors';

describe('executeWithRetry', () => {
  describe('正常执行', () => {
    it('应该成功执行函数（无需重试）', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await executeWithRetry(fn, {
        maxRetries: 3,
        baseDelay: 100,
      });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('TimeoutError重试', () => {
    it('应该重试TimeoutError', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockResolvedValue('success');
      
      const result = await executeWithRetry(fn, {
        maxRetries: 2,
        baseDelay: 50,
      });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('NetworkError重试', () => {
    it('应该重试NetworkError', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValue('success');
      
      const result = await executeWithRetry(fn, {
        maxRetries: 2,
        baseDelay: 50,
      });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('RateLimitError重试', () => {
    it('应该重试RateLimitError', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new RateLimitError('Rate limit exceeded'))
        .mockResolvedValue('success');
      
      const result = await executeWithRetry(fn, {
        maxRetries: 2,
        baseDelay: 50,
      });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('HTTP状态码重试', () => {
    it('应该重试429状态码', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new HttpError('Too Many Requests', 429))
        .mockResolvedValue('success');
      
      const result = await executeWithRetry(fn, {
        maxRetries: 2,
        baseDelay: 50,
      });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该重试5xx状态码', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new HttpError('Internal Server Error', 500))
        .mockResolvedValue('success');
      
      const result = await executeWithRetry(fn, {
        maxRetries: 2,
        baseDelay: 50,
      });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('不应该重试4xx状态码（除了429）', async () => {
      const fn = jest.fn().mockRejectedValue(new HttpError('Bad Request', 400));
      
      await expect(executeWithRetry(fn, {
        maxRetries: 3,
        baseDelay: 50,
      })).rejects.toThrow('Bad Request');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('不可重试的错误', () => {
    it('不应该重试普通Error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Generic error'));
      
      await expect(executeWithRetry(fn, {
        maxRetries: 3,
        baseDelay: 50,
      })).rejects.toThrow('Generic error');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('最大重试次数', () => {
    it('应该在达到最大重试次数后抛出错误', async () => {
      const fn = jest.fn().mockRejectedValue(new TimeoutError('Timeout', 5000));
      
      await expect(executeWithRetry(fn, {
        maxRetries: 2,
        baseDelay: 50,
      })).rejects.toThrow('Timeout');
      expect(fn).toHaveBeenCalledTimes(3); // 初始调用 + 2次重试
    });
  });

  describe('指数退避延迟', () => {
    it('应该使用指数退避延迟', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      await executeWithRetry(fn, {
        maxRetries: 3,
        baseDelay: 100,
      });
      const endTime = Date.now();
      
      // 第一次重试延迟约100ms，第二次约200ms
      // 总延迟应该至少300ms
      expect(endTime - startTime).toBeGreaterThanOrEqual(250);
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('应该限制最大延迟时间', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockRejectedValueOnce(new TimeoutError('Timeout', 5000))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      await executeWithRetry(fn, {
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 2000,
      });
      const endTime = Date.now();
      
      // 延迟应该是 1000 + 2000 + 2000 = 5000ms（受maxDelay限制）
      expect(endTime - startTime).toBeGreaterThanOrEqual(4500);
      expect(endTime - startTime).toBeLessThan(6000);
    });
  });
});
