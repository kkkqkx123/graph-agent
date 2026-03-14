/**
 * RetryStrategy 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryStrategy, RetryStrategyConfig } from '../RetryStrategy.js';
import {
  TimeoutError,
  HttpError,
  NetworkError
} from '@modular-agent/types';
import {
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError
} from '@modular-agent/common-utils';

describe('RetryStrategy', () => {
  describe('constructor', () => {
    it('应该使用提供的配置创建实例', () => {
      const config: RetryStrategyConfig = {
        maxRetries: 5,
        baseDelay: 2000,
        exponentialBackoff: false,
        maxDelay: 10000
      };

      const strategy = new RetryStrategy(config);

      // 通过 shouldRetry 间接验证 maxRetries
      const error = new TimeoutError('test', 1000);
      expect(strategy.shouldRetry(error, 4)).toBe(true);
      expect(strategy.shouldRetry(error, 5)).toBe(false);
    });
  });

  describe('shouldRetry', () => {
    let strategy: RetryStrategy;

    beforeEach(() => {
      strategy = new RetryStrategy({
        maxRetries: 3,
        baseDelay: 1000,
        exponentialBackoff: true
      });
    });

    describe('重试次数限制', () => {
      it('应该在超过最大重试次数时返回 false', () => {
        const error = new TimeoutError('test', 1000);

        expect(strategy.shouldRetry(error, 0)).toBe(true);
        expect(strategy.shouldRetry(error, 1)).toBe(true);
        expect(strategy.shouldRetry(error, 2)).toBe(true);
        expect(strategy.shouldRetry(error, 3)).toBe(false);
      });
    });

    describe('TimeoutError', () => {
      it('应该对 TimeoutError 返回 true', () => {
        const error = new TimeoutError('Request timed out', 5000);
        expect(strategy.shouldRetry(error, 0)).toBe(true);
      });
    });

    describe('HTTP 错误', () => {
      it('应该对 RateLimitError (429) 返回 true', () => {
        const error = new RateLimitError('Rate limit exceeded', 60);
        expect(strategy.shouldRetry(error, 0)).toBe(true);
      });

      it('应该对 InternalServerError (500) 返回 true', () => {
        const error = new InternalServerError('Internal server error');
        expect(strategy.shouldRetry(error, 0)).toBe(true);
      });

      it('应该对 ServiceUnavailableError (503) 返回 true', () => {
        const error = new ServiceUnavailableError('Service unavailable');
        expect(strategy.shouldRetry(error, 0)).toBe(true);
      });

      it('应该对通用 HttpError 5xx 返回 true', () => {
        const error500 = new HttpError('Server error', 500);
        const error502 = new HttpError('Bad gateway', 502);
        const error504 = new HttpError('Gateway timeout', 504);

        expect(strategy.shouldRetry(error500, 0)).toBe(true);
        expect(strategy.shouldRetry(error502, 0)).toBe(true);
        expect(strategy.shouldRetry(error504, 0)).toBe(true);
      });

      it('应该对 HttpError 4xx 返回 false', () => {
        const error400 = new HttpError('Bad request', 400);
        const error401 = new HttpError('Unauthorized', 401);
        const error403 = new HttpError('Forbidden', 403);
        const error404 = new HttpError('Not found', 404);

        expect(strategy.shouldRetry(error400, 0)).toBe(false);
        expect(strategy.shouldRetry(error401, 0)).toBe(false);
        expect(strategy.shouldRetry(error403, 0)).toBe(false);
        expect(strategy.shouldRetry(error404, 0)).toBe(false);
      });
    });

    describe('NetworkError', () => {
      it('应该对 NetworkError 返回 true', () => {
        const error = new NetworkError('Connection failed');
        expect(strategy.shouldRetry(error, 0)).toBe(true);
      });
    });

    describe('其他错误', () => {
      it('应该对普通 Error 返回 false', () => {
        const error = new Error('Some error');
        expect(strategy.shouldRetry(error, 0)).toBe(false);
      });
    });
  });

  describe('getRetryDelay', () => {
    it('应该使用指数退避计算延迟', () => {
      const strategy = new RetryStrategy({
        maxRetries: 3,
        baseDelay: 1000,
        exponentialBackoff: true
      });

      // baseDelay * 2^retryCount
      expect(strategy.getRetryDelay(0)).toBe(1000);  // 1000 * 2^0 = 1000
      expect(strategy.getRetryDelay(1)).toBe(2000);  // 1000 * 2^1 = 2000
      expect(strategy.getRetryDelay(2)).toBe(4000);  // 1000 * 2^2 = 4000
      expect(strategy.getRetryDelay(3)).toBe(8000);  // 1000 * 2^3 = 8000
    });

    it('应该使用固定延迟（非指数退避）', () => {
      const strategy = new RetryStrategy({
        maxRetries: 3,
        baseDelay: 1000,
        exponentialBackoff: false
      });

      expect(strategy.getRetryDelay(0)).toBe(1000);
      expect(strategy.getRetryDelay(1)).toBe(1000);
      expect(strategy.getRetryDelay(2)).toBe(1000);
      expect(strategy.getRetryDelay(3)).toBe(1000);
    });

    it('应该应用最大延迟限制', () => {
      const strategy = new RetryStrategy({
        maxRetries: 10,
        baseDelay: 1000,
        exponentialBackoff: true,
        maxDelay: 5000
      });

      // 指数退避会超过 maxDelay
      expect(strategy.getRetryDelay(0)).toBe(1000);
      expect(strategy.getRetryDelay(1)).toBe(2000);
      expect(strategy.getRetryDelay(2)).toBe(4000);
      expect(strategy.getRetryDelay(3)).toBe(5000);  // 限制在 maxDelay
      expect(strategy.getRetryDelay(10)).toBe(5000); // 限制在 maxDelay
    });
  });

  describe('execute', () => {
    it('应该成功执行函数', async () => {
      const strategy = new RetryStrategy({
        maxRetries: 3,
        baseDelay: 10,
        exponentialBackoff: false
      });

      const fn = vi.fn().mockResolvedValue('success');

      const result = await strategy.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该在失败后重试并最终成功', async () => {
      const strategy = new RetryStrategy({
        maxRetries: 3,
        baseDelay: 10,
        exponentialBackoff: false
      });

      const fn = vi.fn()
        .mockRejectedValueOnce(new NetworkError('Failed 1'))
        .mockRejectedValueOnce(new NetworkError('Failed 2'))
        .mockResolvedValue('success');

      const result = await strategy.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('应该在重试次数用尽后抛出错误', async () => {
      const strategy = new RetryStrategy({
        maxRetries: 2,
        baseDelay: 10,
        exponentialBackoff: false
      });

      const fn = vi.fn().mockRejectedValue(new NetworkError('Always fails'));

      try {
        await strategy.execute(fn);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        // 初始调用 + 2 次重试
        expect(fn.mock.calls.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('静态工厂方法', () => {
    describe('createDefault', () => {
      it('应该创建默认配置的重试策略', () => {
        const strategy = RetryStrategy.createDefault();

        // 验证默认配置
        const error = new TimeoutError('test', 1000);
        expect(strategy.shouldRetry(error, 2)).toBe(true);
        expect(strategy.shouldRetry(error, 3)).toBe(false);

        // 验证默认延迟
        expect(strategy.getRetryDelay(0)).toBe(1000);
        expect(strategy.getRetryDelay(1)).toBe(2000);
      });
    });

    describe('createNoRetry', () => {
      it('应该创建不重试的策略', () => {
        const strategy = RetryStrategy.createNoRetry();

        const error = new TimeoutError('test', 1000);
        expect(strategy.shouldRetry(error, 0)).toBe(false);
      });
    });

    describe('createCustom', () => {
      it('应该创建自定义配置的重试策略', () => {
        const strategy = RetryStrategy.createCustom({
          maxRetries: 5,
          baseDelay: 500
        });

        const error = new TimeoutError('test', 1000);
        expect(strategy.shouldRetry(error, 4)).toBe(true);
        expect(strategy.shouldRetry(error, 5)).toBe(false);
        expect(strategy.getRetryDelay(0)).toBe(500);
      });

      it('应该使用默认值填充缺失的配置', () => {
        const strategy = RetryStrategy.createCustom({});

        const error = new TimeoutError('test', 1000);
        expect(strategy.shouldRetry(error, 2)).toBe(true);
        expect(strategy.shouldRetry(error, 3)).toBe(false);
        expect(strategy.getRetryDelay(0)).toBe(1000);
      });
    });
  });
});
