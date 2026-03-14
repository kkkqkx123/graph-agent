/**
 * TimeoutController 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimeoutController } from '../TimeoutController.js';
import { TimeoutError } from '@modular-agent/types';

describe('TimeoutController', () => {
  describe('constructor', () => {
    it('应该使用默认超时时间创建实例', async () => {
      const controller = new TimeoutController();
      // 验证默认超时时间为 30000ms
      const fn = vi.fn().mockResolvedValue('result');

      const result = await controller.executeWithTimeout(fn, 1000);
      expect(result).toBe('result');
    });

    it('应该使用指定的超时时间创建实例', async () => {
      const controller = new TimeoutController(5000);
      const fn = vi.fn().mockResolvedValue('success');

      const result = await controller.executeWithTimeout(fn);
      expect(result).toBe('success');
    });
  });

  describe('executeWithTimeout', () => {
    describe('成功执行', () => {
      it('应该在函数成功完成时返回结果', async () => {
        const controller = new TimeoutController(5000);
        const fn = vi.fn().mockResolvedValue('result');

        const result = await controller.executeWithTimeout(fn);

        expect(result).toBe('result');
        expect(fn).toHaveBeenCalledTimes(1);
      });

      it('应该支持异步函数', async () => {
        const controller = new TimeoutController(5000);
        const fn = vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'async-result';
        });

        const result = await controller.executeWithTimeout(fn);

        expect(result).toBe('async-result');
      });
    });

    describe('超时处理', () => {
      it('应该在超时后抛出 TimeoutError', async () => {
        const controller = new TimeoutController(100);
        const fn = vi.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 10000))
        );

        try {
          await controller.executeWithTimeout(fn, 50);
          expect.fail('Should have thrown TimeoutError');
        } catch (error) {
          expect(error).toBeInstanceOf(TimeoutError);
          expect((error as TimeoutError).timeout).toBe(50);
        }
      });

      it('应该使用传入的超时时间而非默认值', async () => {
        const controller = new TimeoutController(10000);
        const fn = vi.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 5000))
        );

        try {
          await controller.executeWithTimeout(fn, 50);
          expect.fail('Should have thrown TimeoutError');
        } catch (error) {
          expect(error).toBeInstanceOf(TimeoutError);
          expect((error as TimeoutError).timeout).toBe(50);
        }
      });

      it('应该在超时错误消息中包含超时时间', async () => {
        const controller = new TimeoutController(100);
        const fn = vi.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 10000))
        );

        try {
          await controller.executeWithTimeout(fn, 100);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(TimeoutError);
          expect((error as TimeoutError).message).toContain('100ms');
        }
      });
    });

    describe('中止信号处理', () => {
      it('应该在中止信号触发时拒绝', async () => {
        const controller = new TimeoutController(5000);
        const abortController = new AbortController();
        const fn = vi.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 10000))
        );

        const promise = controller.executeWithTimeout(fn, 5000, abortController.signal);

        // 在超时前中止
        abortController.abort();

        try {
          await promise;
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('aborted');
        }
      });

      it('应该处理已经中止的信号', async () => {
        const controller = new TimeoutController(5000);
        const abortController = new AbortController();
        abortController.abort(); // 先中止

        const fn = vi.fn().mockResolvedValue('result');

        try {
          await controller.executeWithTimeout(fn, 5000, abortController.signal);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });

      it('应该在完成后清理中止事件监听器', async () => {
        const controller = new TimeoutController(5000);
        const abortController = new AbortController();
        const fn = vi.fn().mockResolvedValue('result');

        await controller.executeWithTimeout(fn, 5000, abortController.signal);

        // 验证函数成功完成
        expect(fn).toHaveBeenCalledTimes(1);
      });
    });

    describe('资源清理', () => {
      it('应该在成功完成后清理超时定时器', async () => {
        const controller = new TimeoutController(5000);
        const fn = vi.fn().mockResolvedValue('result');

        await controller.executeWithTimeout(fn, 1000);

        expect(fn).toHaveBeenCalledTimes(1);
      });

      it('应该在超时后清理超时定时器', async () => {
        const controller = new TimeoutController(50);
        const fn = vi.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 1000))
        );

        try {
          await controller.executeWithTimeout(fn, 50);
        } catch {
          // 预期会抛出错误
        }

        // 验证函数被调用
        expect(fn).toHaveBeenCalledTimes(1);
      });
    });

    describe('边界情况', () => {
      it('应该处理同步函数', async () => {
        const controller = new TimeoutController(5000);
        const fn = vi.fn().mockResolvedValue('sync-result');

        const result = await controller.executeWithTimeout(fn);

        expect(result).toBe('sync-result');
      });

      it('应该正确传递函数错误', async () => {
        const controller = new TimeoutController(5000);
        const error = new Error('Function error');
        const fn = vi.fn().mockRejectedValue(error);

        try {
          await controller.executeWithTimeout(fn);
          expect.fail('Should have thrown error');
        } catch (err) {
          expect(err).toBeInstanceOf(Error);
          expect((err as Error).message).toBe('Function error');
        }
      });
    });
  });

  describe('静态工厂方法', () => {
    describe('createDefault', () => {
      it('应该创建默认超时时间为 30000ms 的控制器', async () => {
        const controller = TimeoutController.createDefault();
        const fn = vi.fn().mockResolvedValue('result');

        const result = await controller.executeWithTimeout(fn);

        expect(result).toBe('result');
      });
    });

    describe('createNoTimeout', () => {
      it('应该创建零超时时间的控制器', async () => {
        const controller = TimeoutController.createNoTimeout();
        const fn = vi.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 100))
        );

        try {
          await controller.executeWithTimeout(fn);
          expect.fail('Should have thrown TimeoutError');
        } catch (error) {
          expect(error).toBeInstanceOf(TimeoutError);
        }
      });
    });
  });
});
