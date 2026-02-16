/**
 * callback-utils 单元测试
 */

import {
  wrapCallback,
  createTimeoutPromise,
  withTimeout,
  mergeResults,
  validateCallback,
  createSafeCallback,
  executeCallbacks,
  createRetryCallback,
  createThrottledCallback,
  createDebouncedCallback,
  createOnceCallback,
  createCachedCallback,
  cleanupCache
} from '../callback-utils';
import type { ExecutedThreadResult } from '../../types/dynamic-thread.types';

describe('callback-utils', () => {
  describe('wrapCallback', () => {
    it('应该包装回调函数并捕获错误', () => {
      const callback = jest.fn((x: number) => x * 2);
      const wrapped = wrapCallback(callback);

      expect(wrapped(5)).toBe(10);
      expect(callback).toHaveBeenCalledWith(5);
    });

    it('应该捕获并重新抛出错误', () => {
      const callback = jest.fn(() => {
        throw new Error('Test error');
      });
      const wrapped = wrapCallback(callback);

      expect(() => wrapped()).toThrow('Test error');
    });
  });

  describe('createTimeoutPromise', () => {
    it('应该在超时后reject', async () => {
      const timeout = 100;
      const promise = createTimeoutPromise(timeout, 'Timeout error');

      await expect(promise).rejects.toThrow('Timeout error');
    });

    it('应该使用自定义错误消息', async () => {
      const promise = createTimeoutPromise(50, 'Custom timeout');

      await expect(promise).rejects.toThrow('Custom timeout');
    });
  });

  describe('withTimeout', () => {
    it('应该在超时前完成时返回结果', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 100);

      expect(result).toBe('success');
    });

    it('应该在超时时抛出错误', async () => {
      const promise = new Promise(resolve => setTimeout(() => resolve('late'), 200));
      
      await expect(withTimeout(promise, 100)).rejects.toThrow('Operation timed out');
    });

    it('应该使用自定义错误消息', async () => {
      const promise = new Promise(resolve => setTimeout(() => resolve('late'), 200));
      
      await expect(withTimeout(promise, 100, 'Custom timeout message')).rejects.toThrow('Custom timeout message');
    });
  });

  describe('mergeResults', () => {
    it('应该合并多个子线程结果', () => {
      const mockThreadContext1 = {
        getThreadId: jest.fn().mockReturnValue('thread-1'),
        getOutput: jest.fn().mockReturnValue({ result: 'success1' })
      };
      const mockThreadContext2 = {
        getThreadId: jest.fn().mockReturnValue('thread-2'),
        getOutput: jest.fn().mockReturnValue({ result: 'success2' })
      };

      const results: ExecutedThreadResult[] = [
        {
          threadContext: mockThreadContext1 as any,
          threadResult: { output: { result: 'success1' } } as any,
          executionTime: 100
        },
        {
          threadContext: mockThreadContext2 as any,
          threadResult: { output: { result: 'success2' } } as any,
          executionTime: 200
        }
      ];

      const merged = mergeResults(results);

      expect(merged.success).toBe(true);
      expect(merged.totalResults).toBe(2);
      expect(merged.results).toHaveLength(2);
      expect(merged.results[0].threadId).toBe('thread-1');
      expect(merged.results[1].threadId).toBe('thread-2');
    });

    it('应该处理空结果数组', () => {
      const merged = mergeResults([]);

      expect(merged.success).toBe(true);
      expect(merged.totalResults).toBe(0);
      expect(merged.results).toHaveLength(0);
    });
  });

  describe('validateCallback', () => {
    it('应该验证有效的回调函数', () => {
      const callback = jest.fn();
      expect(validateCallback(callback)).toBe(true);
    });

    it('应该拒绝无效的回调', () => {
      expect(validateCallback(null)).toBe(false);
      expect(validateCallback(undefined)).toBe(false);
      expect(validateCallback('not a function')).toBe(false);
      expect(validateCallback(123)).toBe(false);
    });
  });

  describe('createSafeCallback', () => {
    it('应该创建安全的回调函数', () => {
      const callback = jest.fn((x: number) => x * 2);
      const safe = createSafeCallback(callback, 0);

      expect(safe(5)).toBe(10);
      expect(callback).toHaveBeenCalledWith(5);
    });

    it('应该在回调抛出错误时返回默认值', () => {
      const callback = jest.fn(() => {
        throw new Error('Test error');
      });
      const safe = createSafeCallback(callback, 'DEFAULT');

      expect(safe()).toBe('DEFAULT');
    });

    it('应该在回调无效时返回默认值', () => {
      const safe = createSafeCallback(null as any, 'DEFAULT');

      expect(safe()).toBe('DEFAULT');
    });
  });

  describe('executeCallbacks', () => {
    it('应该执行所有回调函数', () => {
      const callback1 = jest.fn((x: number) => x * 2);
      const callback2 = jest.fn((x: number) => x * 3);
      const callbacks = [callback1, callback2];

      const results = executeCallbacks(callbacks, 5);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe(10);
      expect(results[1]).toBe(15);
      expect(callback1).toHaveBeenCalledWith(5);
      expect(callback2).toHaveBeenCalledWith(5);
    });

    it('应该捕获回调错误并返回Error对象', () => {
      const callback1 = jest.fn((x: number) => x * 2);
      const callback2 = jest.fn(() => {
        throw new Error('Test error');
      });
      const callbacks = [callback1, callback2];

      const results = executeCallbacks(callbacks, 5);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe(10);
      expect(results[1]).toBeInstanceOf(Error);
    });
  });

  describe('createRetryCallback', () => {
    it('应该在第一次成功时返回结果', async () => {
      const callback = jest.fn().mockResolvedValue('success');
      const retry = createRetryCallback(callback, 3, 10);

      const result = await retry();

      expect(result).toBe('success');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('应该在重试后成功', async () => {
      let attempts = 0;
      const callback = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary error');
        }
        return Promise.resolve('success');
      });
      const retry = createRetryCallback(callback, 3, 10);

      const result = await retry();

      expect(result).toBe('success');
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('应该在达到最大重试次数后失败', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Persistent error'));
      const retry = createRetryCallback(callback, 2, 10);

      await expect(retry()).rejects.toThrow('Persistent error');
      expect(callback).toHaveBeenCalledTimes(3); // 初始调用 + 2次重试
    });
  });

  describe('createThrottledCallback', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('应该节流回调函数', () => {
      const callback = jest.fn();
      const throttled = createThrottledCallback(callback, 100);

      throttled();
      throttled();
      throttled();

      expect(callback).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      throttled();

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('createDebouncedCallback', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('应该防抖回调函数', () => {
      const callback = jest.fn();
      const debounced = createDebouncedCallback(callback, 100);

      debounced();
      debounced();
      debounced();

      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('createOnceCallback', () => {
    it('应该只执行一次回调', () => {
      const callback = jest.fn((x: number) => x * 2);
      const once = createOnceCallback(callback);

      expect(once(5)).toBe(10);
      expect(once(10)).toBe(10);
      expect(once(20)).toBe(10);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(5);
    });
  });

  describe('createCachedCallback', () => {
    it('应该缓存回调结果', () => {
      const callback = jest.fn((x: number) => x * 2);
      const cached = createCachedCallback(callback);

      expect(cached(5)).toBe(10);
      expect(cached(5)).toBe(10);
      expect(cached(5)).toBe(10);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('应该为不同参数缓存不同结果', () => {
      const callback = jest.fn((x: number) => x * 2);
      const cached = createCachedCallback(callback);

      expect(cached(5)).toBe(10);
      expect(cached(10)).toBe(20);
      expect(cached(5)).toBe(10);
      expect(cached(10)).toBe(20);

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('应该在TTL过期后重新计算', () => {
      jest.useFakeTimers();
      const callback = jest.fn((x: number) => x * 2);
      const cached = createCachedCallback(callback, (...args) => JSON.stringify(args), 100);

      expect(cached(5)).toBe(10);
      expect(callback).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(150);

      expect(cached(5)).toBe(10);
      expect(callback).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('cleanupCache', () => {
    it('应该清理过期的缓存条目', () => {
      jest.useFakeTimers();
      const cache = new Map<string, { value: number; timestamp: number }>();
      cache.set('key1', { value: 1, timestamp: Date.now() - 2000 });
      cache.set('key2', { value: 2, timestamp: Date.now() - 500 });
      cache.set('key3', { value: 3, timestamp: Date.now() });

      expect(cache.size).toBe(3);

      cleanupCache(cache, 1000);

      expect(cache.size).toBe(2);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);

      jest.useRealTimers();
    });

    it('应该清理所有缓存当TTL为0时', () => {
      const cache = new Map<string, { value: number; timestamp: number }>();
      cache.set('key1', { value: 1, timestamp: Date.now() });
      cache.set('key2', { value: 2, timestamp: Date.now() });

      expect(cache.size).toBe(2);

      cleanupCache(cache, 0);

      expect(cache.size).toBe(0);
    });
  });
});