/**
 * TimeoutController 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimeoutController } from '../TimeoutController.js';

describe('TimeoutController', () => {
  let timeoutController: TimeoutController;

  beforeEach(() => {
    timeoutController = new TimeoutController();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建实例', () => {
      const controller = new TimeoutController();
      expect(controller).toBeInstanceOf(TimeoutController);
    });

    it('应该使用自定义配置创建实例', () => {
      const controller = new TimeoutController({
        defaultTimeout: 60000
      });
      expect(controller).toBeInstanceOf(TimeoutController);
    });
  });

  describe('executeWithTimeout', () => {
    it('应该成功执行快速完成的函数', async () => {
      const fn = async () => {
        return 'success';
      };

      const result = await timeoutController.executeWithTimeout(fn, 5000);
      expect(result).toBe('success');
    });

    it('应该在超时时抛出错误', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'success';
      };

      await expect(
        timeoutController.executeWithTimeout(fn, 100)
      ).rejects.toThrow('Execution timeout after 100ms');
    });

    it('应该使用默认超时时间', async () => {
      const controller = new TimeoutController({ defaultTimeout: 100 });
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'success';
      };

      await expect(
        controller.executeWithTimeout(fn)
      ).rejects.toThrow('Execution timeout after 100ms');
    });

    it('应该在超时之前处理 AbortSignal', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return 'success';
      };

      const abortController = new AbortController();
      // 100ms 后中止
      setTimeout(() => abortController.abort(), 100);

      await expect(
        timeoutController.executeWithTimeout(fn, 5000, abortController.signal)
      ).rejects.toThrow(/aborted/);
    }, 10000);

    it('应该在函数执行成功时忽略超时', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'success';
      };

      const result = await timeoutController.executeWithTimeout(fn, 5000);
      expect(result).toBe('success');
    });

    it('应该处理函数抛出的错误', async () => {
      const fn = async () => {
        throw new Error('Function error');
      };

      await expect(
        timeoutController.executeWithTimeout(fn, 5000)
      ).rejects.toThrow('Function error');
    });

    it('应该在超时之前处理 AbortSignal', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return 'success';
      };

      const abortController = new AbortController();
      // 100ms 后中止
      setTimeout(() => abortController.abort(), 100);

      await expect(
        timeoutController.executeWithTimeout(fn, 5000, abortController.signal)
      ).rejects.toThrow('Execution aborted by signal');
    });

    it('应该支持返回 Promise 对象', async () => {
      const fn = () => {
        return Promise.resolve('promise result');
      };

      const result = await timeoutController.executeWithTimeout(fn, 5000);
      expect(result).toBe('promise result');
    });

    it('应该支持返回非 Promise 对象', async () => {
      const fn = async () => {
        return 'direct result';
      };

      const result = await timeoutController.executeWithTimeout(fn, 5000);
      expect(result).toBe('direct result');
    });
  });

  describe('createDefault', () => {
    it('应该创建默认超时控制器实例', () => {
      const defaultController = TimeoutController.createDefault();
      expect(defaultController).toBeInstanceOf(TimeoutController);
    });
  });
});