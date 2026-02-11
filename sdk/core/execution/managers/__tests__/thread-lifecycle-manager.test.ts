/**
 * thread-lifecycle-manager.test.ts
 * ThreadLifecycleManager的单元测试
 */

import { ThreadLifecycleManager } from '../thread-lifecycle-manager';
import { eventManager } from '../../../services/event-manager';
import { ThreadStatus } from '@modular-agent/types/thread';
import { EventType } from '@modular-agent/types/events';
import { generateId, now } from '../../../../utils';
import type { Thread } from '@modular-agent/types/thread';
import type { Graph } from '@modular-agent/types/graph';

describe('ThreadLifecycleManager', () => {
  let lifecycleManager: ThreadLifecycleManager;
  let mockThread: Thread;

  beforeEach(() => {
    lifecycleManager = new ThreadLifecycleManager(eventManager);

    // 创建模拟Thread
    mockThread = {
      id: generateId(),
      workflowId: generateId(),
      workflowVersion: '1.0.0',
      status: ThreadStatus.CREATED,
      currentNodeId: 'node1',
      graph: {} as Graph,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      input: {},
      output: {},
      nodeResults: [],
      startTime: now(),
      errors: [],
      shouldPause: false,
      shouldStop: false
    };
  });

  describe('幂等性测试', () => {
    it('pauseThread应该具有幂等性', async () => {
      mockThread.status = ThreadStatus.RUNNING;

      // 第一次暂停
      await lifecycleManager.pauseThread(mockThread);
      expect(mockThread.status).toBe(ThreadStatus.PAUSED);

      // 第二次暂停（应该直接返回，不抛错）
      await expect(lifecycleManager.pauseThread(mockThread)).resolves.not.toThrow();
      expect(mockThread.status).toBe(ThreadStatus.PAUSED);
    });

    it('resumeThread应该具有幂等性', async () => {
      mockThread.status = ThreadStatus.PAUSED;

      // 第一次恢复
      await lifecycleManager.resumeThread(mockThread);
      expect(mockThread.status).toBe(ThreadStatus.RUNNING);

      // 第二次恢复（应该直接返回，不抛错）
      await expect(lifecycleManager.resumeThread(mockThread)).resolves.not.toThrow();
      expect(mockThread.status).toBe(ThreadStatus.RUNNING);
    });

    it('cancelThread应该具有幂等性', async () => {
      mockThread.status = ThreadStatus.RUNNING;

      // 第一次取消
      await lifecycleManager.cancelThread(mockThread, 'test');
      expect(mockThread.status).toBe(ThreadStatus.CANCELLED);
      expect(mockThread.endTime).toBeDefined();

      // 第二次取消（应该直接返回，不抛错）
      await expect(lifecycleManager.cancelThread(mockThread, 'test')).resolves.not.toThrow();
      expect(mockThread.status).toBe(ThreadStatus.CANCELLED);
    });
  });

  describe('状态转换测试', () => {
    it('startThread应该正确转换状态', async () => {
      mockThread.status = ThreadStatus.CREATED;

      await lifecycleManager.startThread(mockThread);

      expect(mockThread.status).toBe(ThreadStatus.RUNNING);
    });

    it('completeThread应该正确转换状态', async () => {
      mockThread.status = ThreadStatus.RUNNING;

      await lifecycleManager.completeThread(mockThread, {
        threadId: mockThread.id,
        output: {},
        executionTime: 1000,
        nodeResults: [],
        metadata: {
          status: ThreadStatus.COMPLETED,
          startTime: Date.now(),
          endTime: Date.now(),
          executionTime: 1000,
          nodeCount: 0,
          errorCount: 0
        }
      });

      expect(mockThread.status).toBe(ThreadStatus.COMPLETED);
      expect(mockThread.endTime).toBeDefined();
    });

    it('failThread应该正确转换状态', async () => {
      mockThread.status = ThreadStatus.RUNNING;
      const error = new Error('Test error');

      await lifecycleManager.failThread(mockThread, error);

      expect(mockThread.status).toBe(ThreadStatus.FAILED);
      expect(mockThread.endTime).toBeDefined();
      expect(mockThread.errors).toContain(error.message);
    });
  });

  describe('事件触发测试', () => {
    it('pauseThread应该触发正确的事件', async () => {
      mockThread.status = ThreadStatus.RUNNING;

      const pausedPromise = new Promise<void>((resolve) => {
        eventManager.once(EventType.THREAD_PAUSED, () => resolve());
      });

      const stateChangedPromise = new Promise<void>((resolve) => {
        eventManager.once(EventType.THREAD_STATE_CHANGED, () => resolve());
      });

      await lifecycleManager.pauseThread(mockThread);

      await Promise.all([pausedPromise, stateChangedPromise]);
    });

    it('resumeThread应该触发正确的事件', async () => {
      mockThread.status = ThreadStatus.PAUSED;

      const resumedPromise = new Promise<void>((resolve) => {
        eventManager.once(EventType.THREAD_RESUMED, () => resolve());
      });

      const stateChangedPromise = new Promise<void>((resolve) => {
        eventManager.once(EventType.THREAD_STATE_CHANGED, () => resolve());
      });

      await lifecycleManager.resumeThread(mockThread);

      await Promise.all([resumedPromise, stateChangedPromise]);
    });
  });

  describe('错误处理测试', () => {
    it('应该拒绝非法的状态转换', async () => {
      mockThread.status = ThreadStatus.COMPLETED;

      await expect(lifecycleManager.pauseThread(mockThread)).rejects.toThrow();
    });
  });
});