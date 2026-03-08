/**
 * EventEmitter 单元测试
 * 测试事件触发工具函数的各种功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventManager } from '../../../../services/event-manager.js';
import type { Event, EventType, ID } from '@modular-agent/types';
import { ExecutionError } from '@modular-agent/types';
import {
  safeEmit,
  emit,
  emitBatch,
  emitBatchParallel,
  emitIf,
  emitDelayed,
  emitWithRetry,
  emitAndWaitForCallback
} from '../event-emitter.js';

describe('EventEmitter', () => {
  let mockEventManager: EventManager;
  let mockEvent: Event;

  beforeEach(() => {
    // 创建 EventManager 的 mock
    mockEventManager = {
      waitFor: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      once: vi.fn(),
      clear: vi.fn(),
      stopPropagation: vi.fn(),
      isPropagationStopped: vi.fn()
    } as unknown as EventManager;

    // 创建测试用的事件对象
    mockEvent = {
      type: 'THREAD_STARTED' as EventType,
      timestamp: Date.now(),
      workflowId: 'workflow-1' as ID,
      threadId: 'thread-1' as ID,
      input: { key: 'value' }
    } as Event;
  });

  describe('safeEmit', () => {
    it('应该在事件管理器存在时成功触发事件', async () => {
      vi.mocked(mockEventManager.emit).mockResolvedValue(undefined);

      await safeEmit(mockEventManager, mockEvent);

      expect(mockEventManager.emit).toHaveBeenCalledWith(mockEvent);
    });

    it('应该在事件管理器不存在时静默返回', async () => {
      await expect(safeEmit(undefined, mockEvent)).resolves.not.toThrow();
    });

    it('应该在触发失败时抛出 ExecutionError', async () => {
      const error = new Error('Emit failed');
      vi.mocked(mockEventManager.emit).mockRejectedValue(error);

      await expect(safeEmit(mockEventManager, mockEvent)).rejects.toThrow(ExecutionError);
    });

    it('应该在抛出的 ExecutionError 中包含事件类型', async () => {
      const error = new Error('Emit failed');
      vi.mocked(mockEventManager.emit).mockRejectedValue(error);

      try {
        await safeEmit(mockEventManager, mockEvent);
        expect.fail('Should have thrown ExecutionError');
      } catch (e) {
        expect(e).toBeInstanceOf(ExecutionError);
        expect((e as ExecutionError).context?.eventType).toBe('THREAD_STARTED');
        expect((e as ExecutionError).context?.operation).toBe('event_emit');
        expect((e as ExecutionError).context?.severity).toBe('info');
      }
    });
  });

  describe('emit', () => {
    it('应该在事件管理器存在时成功触发事件', async () => {
      vi.mocked(mockEventManager.emit).mockResolvedValue(undefined);

      await emit(mockEventManager, mockEvent);

      expect(mockEventManager.emit).toHaveBeenCalledWith(mockEvent);
    });

    it('应该在事件管理器不存在时抛出错误', async () => {
      await expect(emit(undefined, mockEvent)).rejects.toThrow('EventManager is not available');
    });

    it('应该在触发失败时抛出原始错误', async () => {
      const error = new Error('Emit failed');
      vi.mocked(mockEventManager.emit).mockRejectedValue(error);

      await expect(emit(mockEventManager, mockEvent)).rejects.toThrow('Emit failed');
    });
  });

  describe('emitBatch', () => {
    it('应该按顺序批量触发事件', async () => {
      const events = [
        { ...mockEvent, type: 'THREAD_STARTED' as EventType },
        { ...mockEvent, type: 'THREAD_COMPLETED' as EventType },
        { ...mockEvent, type: 'THREAD_FAILED' as EventType }
      ];
      vi.mocked(mockEventManager.emit).mockResolvedValue(undefined);

      await emitBatch(mockEventManager, events);

      expect(mockEventManager.emit).toHaveBeenCalledTimes(3);
      expect(mockEventManager.emit).toHaveBeenNthCalledWith(1, events[0]);
      expect(mockEventManager.emit).toHaveBeenNthCalledWith(2, events[1]);
      expect(mockEventManager.emit).toHaveBeenNthCalledWith(3, events[2]);
    });

    it('应该在事件管理器不存在时静默返回', async () => {
      const events = [mockEvent];

      await expect(emitBatch(undefined, events)).resolves.not.toThrow();
    });

    it('应该在某个事件触发失败时抛出异常并停止', async () => {
      const events = [
        { ...mockEvent, type: 'THREAD_STARTED' as EventType, input: { key: 'value' } } as Event,
        { ...mockEvent, type: 'THREAD_COMPLETED' as EventType, output: { result: 'success' }, executionTime: 1000 } as Event,
        { ...mockEvent, type: 'THREAD_FAILED' as EventType, error: 'Test error' } as Event
      ];
      vi.mocked(mockEventManager.emit)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Second event failed'))
        .mockResolvedValueOnce(undefined);

      await expect(emitBatch(mockEventManager, events)).rejects.toThrow(ExecutionError);

      // 应该只触发前两个事件（第一个成功，第二个失败后停止）
      expect(mockEventManager.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('emitBatchParallel', () => {
    it('应该并行批量触发事件', async () => {
      const events = [
        { ...mockEvent, type: 'THREAD_STARTED' as EventType },
        { ...mockEvent, type: 'THREAD_COMPLETED' as EventType },
        { ...mockEvent, type: 'THREAD_FAILED' as EventType }
      ];
      vi.mocked(mockEventManager.emit).mockResolvedValue(undefined);

      await emitBatchParallel(mockEventManager, events);

      expect(mockEventManager.emit).toHaveBeenCalledTimes(3);
    });

    it('应该在事件管理器不存在时静默返回', async () => {
      const events = [mockEvent];

      await expect(emitBatchParallel(undefined, events)).resolves.not.toThrow();
    });

    it('应该在某个事件触发失败时抛出异常', async () => {
      const events = [
        { ...mockEvent, type: 'THREAD_STARTED' as EventType, input: { key: 'value' } } as Event,
        { ...mockEvent, type: 'THREAD_COMPLETED' as EventType, output: { result: 'success' }, executionTime: 1000 } as Event,
        { ...mockEvent, type: 'THREAD_FAILED' as EventType, error: 'Test error' } as Event
      ];
      vi.mocked(mockEventManager.emit)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Second event failed'))
        .mockResolvedValueOnce(undefined);

      await expect(emitBatchParallel(mockEventManager, events)).rejects.toThrow(ExecutionError);

      // Promise.all 会在第一个失败时拒绝，但所有事件都会被尝试触发
      expect(mockEventManager.emit).toHaveBeenCalledTimes(3);
    });
  });

  describe('emitIf', () => {
    it('应该在条件为 true 时触发事件', async () => {
      const condition = vi.fn(() => true);
      vi.mocked(mockEventManager.emit).mockResolvedValue(undefined);

      await emitIf(mockEventManager, mockEvent, condition);

      expect(condition).toHaveBeenCalled();
      expect(mockEventManager.emit).toHaveBeenCalledWith(mockEvent);
    });

    it('应该在条件为 false 时不触发事件', async () => {
      const condition = vi.fn(() => false);

      await emitIf(mockEventManager, mockEvent, condition);

      expect(condition).toHaveBeenCalled();
      expect(mockEventManager.emit).not.toHaveBeenCalled();
    });

    it('应该在事件管理器不存在时静默返回', async () => {
      const condition = vi.fn(() => true);

      await expect(emitIf(undefined, mockEvent, condition)).resolves.not.toThrow();
      expect(mockEventManager.emit).not.toHaveBeenCalled();
    });
  });

  describe('emitDelayed', () => {
    it('应该在指定延迟后触发事件', async () => {
      vi.mocked(mockEventManager.emit).mockResolvedValue(undefined);
      vi.useFakeTimers();

      const promise = emitDelayed(mockEventManager, mockEvent, 100);

      // 延迟前不应该触发
      expect(mockEventManager.emit).not.toHaveBeenCalled();

      // 快进时间
      vi.advanceTimersByTime(100);

      await promise;

      expect(mockEventManager.emit).toHaveBeenCalledWith(mockEvent);

      vi.useRealTimers();
    });

    it('应该在事件管理器不存在时静默返回', async () => {
      vi.useFakeTimers();

      const promise = emitDelayed(undefined, mockEvent, 100);

      vi.advanceTimersByTime(100);

      await expect(promise).resolves.not.toThrow();

      vi.useRealTimers();
    });
  });

  describe('emitWithRetry', () => {
    it('应该在第一次尝试成功时立即返回', async () => {
      vi.mocked(mockEventManager.emit).mockResolvedValue(undefined);

      await emitWithRetry(mockEventManager, mockEvent);

      expect(mockEventManager.emit).toHaveBeenCalledTimes(1);
    });

    it('应该在失败后重试并最终成功', async () => {
      vi.mocked(mockEventManager.emit)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce(undefined);

      vi.useFakeTimers();

      const promise = emitWithRetry(mockEventManager, mockEvent, 3, 100);

      // 第一次尝试
      await vi.runAllTimersAsync();

      // 第二次尝试（延迟后）
      await vi.runAllTimersAsync();

      // 第三次尝试（延迟后）
      await vi.runAllTimersAsync();

      await promise;

      expect(mockEventManager.emit).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('应该在所有重试失败后抛出错误', async () => {
      vi.mocked(mockEventManager.emit).mockRejectedValue(new Error('Always failed'));

      vi.useFakeTimers();

      const promise = emitWithRetry(mockEventManager, mockEvent, 2, 100);

      // 先设置错误捕获
      const errorPromise = expect(promise).rejects.toThrow(ExecutionError);

      // 运行所有定时器
      await vi.runAllTimersAsync();

      // 等待错误被捕获
      await errorPromise;

      // 应该尝试 3 次（初始 + 2 次重试）
      expect(mockEventManager.emit).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('应该在事件管理器不存在时静默返回', async () => {
      await expect(emitWithRetry(undefined, mockEvent)).resolves.not.toThrow();
    });

    it('应该使用默认的重试参数', async () => {
      vi.mocked(mockEventManager.emit).mockResolvedValue(undefined);

      await emitWithRetry(mockEventManager, mockEvent);

      expect(mockEventManager.emit).toHaveBeenCalledTimes(1);
    });

    it('应该在抛出的 ExecutionError 中包含重试信息', async () => {
      vi.mocked(mockEventManager.emit).mockRejectedValue(new Error('Always failed'));

      vi.useFakeTimers();

      const promise = emitWithRetry(mockEventManager, mockEvent, 2, 100);

      // 先设置错误捕获
      const errorPromise = promise.catch(e => e);

      // 运行所有定时器
      await vi.runAllTimersAsync();

      // 等待错误被捕获
      const error = await errorPromise;

      expect(error).toBeInstanceOf(ExecutionError);
      expect((error as ExecutionError).context?.eventType).toBe('THREAD_STARTED');
      expect((error as ExecutionError).context?.operation).toBe('event_emit_retry');
      expect((error as ExecutionError).context?.maxRetries).toBe(2);

      vi.useRealTimers();
    });
  });

  describe('emitAndWaitForCallback', () => {
    it('应该触发事件并等待回调事件', async () => {
      const callbackEvent = {
        type: 'THREAD_COMPLETED' as EventType,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        output: { result: 'success' },
        executionTime: 1000
      };

      vi.mocked(mockEventManager.emit).mockResolvedValue(undefined);
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(callbackEvent);

      await emitAndWaitForCallback(mockEventManager, mockEvent, 'THREAD_COMPLETED');

      expect(mockEventManager.emit).toHaveBeenCalledWith(mockEvent);
      expect(mockEventManager.waitFor).toHaveBeenCalledWith('THREAD_COMPLETED', 30000);
    });

    it('应该使用自定义超时时间', async () => {
      const callbackEvent = {
        type: 'THREAD_COMPLETED' as EventType,
        timestamp: Date.now(),
        workflowId: 'workflow-1',
        threadId: 'thread-1',
        output: { result: 'success' },
        executionTime: 1000
      };

      vi.mocked(mockEventManager.emit).mockResolvedValue(undefined);
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(callbackEvent);

      await emitAndWaitForCallback(mockEventManager, mockEvent, 'THREAD_COMPLETED', 60000);

      expect(mockEventManager.waitFor).toHaveBeenCalledWith('THREAD_COMPLETED', 60000);
    });

    it('应该在事件管理器不存在时抛出错误', async () => {
      await expect(
        emitAndWaitForCallback(undefined, mockEvent, 'THREAD_COMPLETED')
      ).rejects.toThrow('EventManager is not available');
    });

    it('应该在等待超时时抛出错误', async () => {
      vi.mocked(mockEventManager.emit).mockResolvedValue(undefined);
      vi.mocked(mockEventManager.waitFor).mockRejectedValue(new Error('Timeout'));

      await expect(
        emitAndWaitForCallback(mockEventManager, mockEvent, 'THREAD_COMPLETED')
      ).rejects.toThrow('Timeout');
    });
  });
});
