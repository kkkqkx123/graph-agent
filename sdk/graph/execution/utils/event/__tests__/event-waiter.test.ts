/**
 * EventWaiter 单元测试
 * 测试事件等待器的各种功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventManager } from '../../../../services/event-manager.js';
import {
  WAIT_FOREVER,
  waitForThreadPaused,
  waitForThreadCancelled,
  waitForThreadCompleted,
  waitForThreadFailed,
  waitForThreadResumed,
  waitForAnyLifecycleEvent,
  waitForMultipleThreadsCompleted,
  waitForAnyThreadCompleted,
  waitForAnyThreadCompletion,
  waitForNodeCompleted,
  waitForNodeFailed,
  waitForCondition,
  waitForAllConditions,
  waitForAnyCondition
} from '../event-waiter.js';

describe('EventWaiter', () => {
  let mockEventManager: EventManager;

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
  });

  describe('waitForThreadPaused', () => {
    it('应该使用默认超时时间等待线程暂停事件', async () => {
      const mockEvent = { type: 'THREAD_PAUSED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForThreadPaused(mockEventManager, 'thread-1');

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'THREAD_PAUSED',
        5000,
        expect.any(Function)
      );
    });

    it('应该使用自定义超时时间等待线程暂停事件', async () => {
      const mockEvent = { type: 'THREAD_PAUSED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForThreadPaused(mockEventManager, 'thread-1', 10000);

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'THREAD_PAUSED',
        10000,
        expect.any(Function)
      );
    });

    it('应该使用 WAIT_FOREVER 表示无限等待', async () => {
      const mockEvent = { type: 'THREAD_PAUSED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForThreadPaused(mockEventManager, 'thread-1', WAIT_FOREVER);

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'THREAD_PAUSED',
        undefined,
        expect.any(Function)
      );
    });

    it('应该正确过滤线程ID', async () => {
      const mockEvent = { type: 'THREAD_PAUSED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockImplementation(((eventType: any, timeout: any, filter?: (arg0: any) => any) => {
        if (filter && filter(mockEvent)) {
          return Promise.resolve(mockEvent);
        }
        return Promise.reject(new Error('Filter failed'));
      }) as any);

      await waitForThreadPaused(mockEventManager, 'thread-1');

      expect(mockEventManager.waitFor).toHaveBeenCalled();
      const filterArg = vi.mocked(mockEventManager.waitFor).mock.calls[0][2] as any;
      expect(filterArg(mockEvent)).toBe(true);
      expect(filterArg({ type: 'THREAD_PAUSED', threadId: 'thread-2', timestamp: Date.now(), workflowId: 'test-workflow' })).toBe(false);
    });
  });

  describe('waitForThreadCancelled', () => {
    it('应该等待线程取消事件', async () => {
      const mockEvent = { type: 'THREAD_CANCELLED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForThreadCancelled(mockEventManager, 'thread-1');

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'THREAD_CANCELLED',
        5000,
        expect.any(Function)
      );
    });

    it('应该使用自定义超时时间', async () => {
      const mockEvent = { type: 'THREAD_CANCELLED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForThreadCancelled(mockEventManager, 'thread-1', 15000);

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'THREAD_CANCELLED',
        15000,
        expect.any(Function)
      );
    });
  });

  describe('waitForThreadCompleted', () => {
    it('应该等待线程完成事件', async () => {
      const mockEvent = { type: 'THREAD_COMPLETED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForThreadCompleted(mockEventManager, 'thread-1');

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'THREAD_COMPLETED',
        30000,
        expect.any(Function)
      );
    });

    it('应该使用自定义超时时间', async () => {
      const mockEvent = { type: 'THREAD_COMPLETED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForThreadCompleted(mockEventManager, 'thread-1', 60000);

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'THREAD_COMPLETED',
        60000,
        expect.any(Function)
      );
    });
  });

  describe('waitForThreadFailed', () => {
    it('应该等待线程失败事件', async () => {
      const mockEvent = { type: 'THREAD_FAILED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForThreadFailed(mockEventManager, 'thread-1');

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'THREAD_FAILED',
        30000,
        expect.any(Function)
      );
    });
  });

  describe('waitForThreadResumed', () => {
    it('应该等待线程恢复事件', async () => {
      const mockEvent = { type: 'THREAD_RESUMED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForThreadResumed(mockEventManager, 'thread-1');

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'THREAD_RESUMED',
        5000,
        expect.any(Function)
      );
    });
  });

  describe('waitForAnyLifecycleEvent', () => {
    it('应该等待任意生命周期事件', async () => {
      const mockEvent = { type: 'THREAD_PAUSED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForAnyLifecycleEvent(mockEventManager, 'thread-1');

      // 应该调用5次 waitFor，对应5种生命周期事件
      expect(mockEventManager.waitFor).toHaveBeenCalledTimes(5);
    });

    it('应该使用自定义超时时间', async () => {
      const mockEvent = { type: 'THREAD_PAUSED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForAnyLifecycleEvent(mockEventManager, 'thread-1', 10000);

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'THREAD_PAUSED',
        10000,
        expect.any(Function)
      );
    });

    it('应该使用 WAIT_FOREVER 表示无限等待', async () => {
      const mockEvent = { type: 'THREAD_PAUSED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForAnyLifecycleEvent(mockEventManager, 'thread-1', WAIT_FOREVER);

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'THREAD_PAUSED',
        undefined,
        expect.any(Function)
      );
    });
  });

  describe('waitForMultipleThreadsCompleted', () => {
    it('应该等待多个线程完成', async () => {
      const mockEvent = { type: 'THREAD_COMPLETED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForMultipleThreadsCompleted(mockEventManager, ['thread-1', 'thread-2', 'thread-3']);

      expect(mockEventManager.waitFor).toHaveBeenCalledTimes(3);
    });

    it('应该使用自定义超时时间', async () => {
      const mockEvent = { type: 'THREAD_COMPLETED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForMultipleThreadsCompleted(mockEventManager, ['thread-1', 'thread-2'], 60000);

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'THREAD_COMPLETED',
        60000,
        expect.any(Function)
      );
    });
  });

  describe('waitForAnyThreadCompleted', () => {
    it('应该等待任意一个线程完成并返回线程ID', async () => {
      let callCount = 0;
      vi.mocked(mockEventManager.waitFor).mockImplementation((eventType: string, timeout: any, filter: any) => {
        callCount++;
        // 模拟不同的线程在不同时间完成
        if (callCount === 2) {
          // thread-2 先完成
          return Promise.resolve({ type: 'THREAD_COMPLETED', threadId: 'thread-2', timestamp: Date.now(), workflowId: 'test-workflow' } as any);
        }
        return new Promise(() => { }); // 其他线程永不解析
      });

      const result = await waitForAnyThreadCompleted(mockEventManager, ['thread-1', 'thread-2', 'thread-3']);

      expect(result).toBe('thread-2');
    });

    it('应该使用自定义超时时间', async () => {
      const mockEvent = { type: 'THREAD_COMPLETED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForAnyThreadCompleted(mockEventManager, ['thread-1', 'thread-2'], 60000);

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'THREAD_COMPLETED',
        60000,
        expect.any(Function)
      );
    });
  });

  describe('waitForAnyThreadCompletion', () => {
    it('应该等待任意一个线程完成并返回状态', async () => {
      let callCount = 0;
      vi.mocked(mockEventManager.waitFor).mockImplementation((eventType: string, timeout: any, filter: any) => {
        callCount++;
        // 模拟 thread-1 先完成
        if (eventType === 'THREAD_COMPLETED' && callCount === 1) {
          return Promise.resolve({ type: 'THREAD_COMPLETED', threadId: 'thread-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any);
        }
        return new Promise(() => { }); // 其他事件永不解析
      });

      const result = await waitForAnyThreadCompletion(mockEventManager, ['thread-1', 'thread-2']);

      expect(result).toEqual({ threadId: 'thread-1', status: 'COMPLETED' });
    });

    it('应该等待任意一个线程失败并返回状态', async () => {
      let callCount = 0;
      vi.mocked(mockEventManager.waitFor).mockImplementation((eventType: string, timeout: any, filter: any) => {
        callCount++;
        // waitForAnyThreadCompletion 会为每个线程调用两次：一次完成，一次失败
        // thread-1: callCount 1 (completed), 2 (failed)
        // thread-2: callCount 3 (completed), 4 (failed)
        // 让 thread-2 的失败事件先触发
        if (eventType === 'THREAD_FAILED' && callCount === 4) {
          return Promise.resolve({ type: 'THREAD_FAILED', threadId: 'thread-2', timestamp: Date.now(), workflowId: 'test-workflow' } as any);
        }
        return new Promise(() => { }); // 其他事件永不解析
      });

      const result = await waitForAnyThreadCompletion(mockEventManager, ['thread-1', 'thread-2']);

      expect(result).toEqual({ threadId: 'thread-2', status: 'FAILED' });
    });
  });

  describe('waitForNodeCompleted', () => {
    it('应该等待节点完成事件', async () => {
      const mockEvent = { type: 'NODE_COMPLETED', threadId: 'thread-1', nodeId: 'node-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForNodeCompleted(mockEventManager, 'thread-1', 'node-1');

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'NODE_COMPLETED',
        30000,
        expect.any(Function)
      );
    });

    it('应该正确过滤线程ID和节点ID', async () => {
      const mockEvent = { type: 'NODE_COMPLETED', threadId: 'thread-1', nodeId: 'node-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockImplementation(((eventType: any, timeout: any, filter?: (arg0: any) => any) => {
        if (filter && filter(mockEvent)) {
          return Promise.resolve(mockEvent);
        }
        return Promise.reject(new Error('Filter failed'));
      }) as any);

      await waitForNodeCompleted(mockEventManager, 'thread-1', 'node-1');

      const filterArg = vi.mocked(mockEventManager.waitFor).mock.calls[0][2] as any;
      expect(filterArg(mockEvent)).toBe(true);
      expect(filterArg({ type: 'NODE_COMPLETED', threadId: 'thread-2', nodeId: 'node-1', timestamp: Date.now(), workflowId: 'test-workflow' })).toBe(false);
      expect(filterArg({ type: 'NODE_COMPLETED', threadId: 'thread-1', nodeId: 'node-2', timestamp: Date.now(), workflowId: 'test-workflow' })).toBe(false);
    });
  });

  describe('waitForNodeFailed', () => {
    it('应该等待节点失败事件', async () => {
      const mockEvent = { type: 'NODE_FAILED', threadId: 'thread-1', nodeId: 'node-1', timestamp: Date.now(), workflowId: 'test-workflow' } as any;
      vi.mocked(mockEventManager.waitFor).mockResolvedValue(mockEvent);

      await waitForNodeFailed(mockEventManager, 'thread-1', 'node-1');

      expect(mockEventManager.waitFor).toHaveBeenCalledWith(
        'NODE_FAILED',
        30000,
        expect.any(Function)
      );
    });
  });

  describe('waitForCondition', () => {
    it('应该在条件满足时立即返回', async () => {
      const condition = () => true;

      await waitForCondition(condition);

      // 应该立即返回，不需要等待
    });

    it('应该在条件满足后返回', async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };

      await waitForCondition(condition, 10, 1000);

      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it('应该在超时时抛出错误', async () => {
      const condition = () => false;

      await expect(waitForCondition(condition, 10, 100)).rejects.toThrow('Condition not met within 100ms');
    });

    it('应该使用默认参数', async () => {
      const condition = () => true;

      await waitForCondition(condition);

      // 应该使用默认的 checkInterval 和 timeout
    });
  });

  describe('waitForAllConditions', () => {
    it('应该在所有条件满足时返回', async () => {
      const conditions = [() => true, () => true, () => true];

      await waitForAllConditions(conditions);

      // 应该立即返回
    });

    it('应该在所有条件满足后返回', async () => {
      let counter1 = 0;
      let counter2 = 0;
      const conditions = [
        () => {
          counter1++;
          return counter1 >= 2;
        },
        () => {
          counter2++;
          return counter2 >= 3;
        }
      ];

      await waitForAllConditions(conditions, 10, 1000);

      expect(counter1).toBeGreaterThanOrEqual(2);
      expect(counter2).toBeGreaterThanOrEqual(3);
    });

    it('应该在超时时抛出错误', async () => {
      const conditions = [() => true, () => false];

      await expect(waitForAllConditions(conditions, 10, 100)).rejects.toThrow('Not all conditions met within 100ms');
    });
  });

  describe('waitForAnyCondition', () => {
    it('应该在任意条件满足时返回索引', async () => {
      const conditions = [() => false, () => true, () => false];

      const result = await waitForAnyCondition(conditions);

      expect(result).toBe(1);
    });

    it('应该在第一个条件满足时返回索引0', async () => {
      const conditions = [() => true, () => false, () => false];

      const result = await waitForAnyCondition(conditions);

      expect(result).toBe(0);
    });

    it('应该在条件满足后返回', async () => {
      let counter = 0;
      const conditions = [
        () => {
          counter++;
          return counter >= 3;
        },
        () => false
      ];

      const result = await waitForAnyCondition(conditions, 10, 1000);

      expect(result).toBe(0);
      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it('应该在超时时抛出错误', async () => {
      const conditions = [() => false, () => false];

      await expect(waitForAnyCondition(conditions, 10, 100)).rejects.toThrow('No condition met within 100ms');
    });
  });
});
