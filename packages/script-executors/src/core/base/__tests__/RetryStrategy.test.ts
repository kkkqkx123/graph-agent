/**
 * RetryStrategy 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetryStrategy } from '../RetryStrategy.js';

describe('RetryStrategy', () => {
  let retryStrategy: RetryStrategy;

  beforeEach(() => {
    retryStrategy = new RetryStrategy();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建实例', () => {
      const strategy = new RetryStrategy();
      expect(strategy).toBeInstanceOf(RetryStrategy);
    });

    it('应该使用自定义配置创建实例', () => {
      const strategy = new RetryStrategy({
        maxRetries: 5,
        baseDelay: 2000,
        exponentialBackoff: false,
        maxDelay: 60000
      });
      expect(strategy).toBeInstanceOf(RetryStrategy);
    });
  });

  describe('shouldRetry', () => {
    it('应该在未达到最大重试次数时返回 true', () => {
      const error = new Error('Test error');
      expect(retryStrategy.shouldRetry(error, 0)).toBe(true);
      expect(retryStrategy.shouldRetry(error, 1)).toBe(true);
      expect(retryStrategy.shouldRetry(error, 2)).toBe(true);
    });

    it('应该在达到最大重试次数时返回 false', () => {
      const error = new Error('Test error');
      expect(retryStrategy.shouldRetry(error, 3)).toBe(false);
      expect(retryStrategy.shouldRetry(error, 4)).toBe(false);
    });

    it('应该对 ValidationError 不重试', () => {
      const error = new Error('ValidationError: Invalid input');
      expect(retryStrategy.shouldRetry(error, 0)).toBe(false);
    });

    it('应该对 ConfigurationError 不重试', () => {
      const error = new Error('ConfigurationError: Missing config');
      expect(retryStrategy.shouldRetry(error, 0)).toBe(false);
    });

    it('应该对 ScriptNotFoundError 不重试', () => {
      const error = new Error('ScriptNotFoundError: File not found');
      expect(retryStrategy.shouldRetry(error, 0)).toBe(false);
    });

    it('应该对错误名称包含不可重试类型的错误不重试', () => {
      const error = new Error('Test');
      error.name = 'ValidationError';
      expect(retryStrategy.shouldRetry(error, 0)).toBe(false);
    });

    it('应该对普通错误重试', () => {
      const error = new Error('Network timeout');
      expect(retryStrategy.shouldRetry(error, 0)).toBe(true);
    });
  });

  describe('getRetryDelay', () => {
    it('应该使用指数退避计算延迟', () => {
      const strategy = new RetryStrategy({
        baseDelay: 1000,
        exponentialBackoff: true,
        maxDelay: 30000
      });

      expect(strategy.getRetryDelay(0)).toBe(1000);
      expect(strategy.getRetryDelay(1)).toBe(2000);
      expect(strategy.getRetryDelay(2)).toBe(4000);
      expect(strategy.getRetryDelay(3)).toBe(8000);
    });

    it('应该使用固定延迟', () => {
      const strategy = new RetryStrategy({
        baseDelay: 2000,
        exponentialBackoff: false
      });

      expect(strategy.getRetryDelay(0)).toBe(2000);
      expect(strategy.getRetryDelay(1)).toBe(2000);
      expect(strategy.getRetryDelay(2)).toBe(2000);
    });

    it('应该限制最大延迟', () => {
      const strategy = new RetryStrategy({
        baseDelay: 1000,
        exponentialBackoff: true,
        maxDelay: 5000
      });

      expect(strategy.getRetryDelay(0)).toBe(1000);
      expect(strategy.getRetryDelay(1)).toBe(2000);
      expect(strategy.getRetryDelay(2)).toBe(4000);
      expect(strategy.getRetryDelay(3)).toBe(5000); // 限制为 maxDelay
      expect(strategy.getRetryDelay(4)).toBe(5000);
    });
  });

  describe('createDefault', () => {
    it('应该创建默认重试策略实例', () => {
      const defaultStrategy = RetryStrategy.createDefault();
      expect(defaultStrategy).toBeInstanceOf(RetryStrategy);
    });
  });
});