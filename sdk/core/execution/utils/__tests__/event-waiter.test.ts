/**
 * event-waiter.test.ts
 * EventWaiter的单元测试
 */

import { EventWaiter } from '../event-waiter';
import { eventManager } from '../../../services/event-manager';
import { EventType } from '../../../../types/events';

describe('EventWaiter', () => {
  let eventWaiter: EventWaiter;

  beforeEach(() => {
    eventWaiter = new EventWaiter(eventManager);
  });

  afterEach(() => {
    // 清理所有事件监听器
    eventManager.clear();
  });

  describe('waitForThreadPaused', () => {
    it('应该在THREAD_PAUSED事件触发时解析', async () => {
      const threadId = 'test-thread-id';

      // 创建等待Promise
      const waitPromise = eventWaiter.waitForThreadPaused(threadId, 5000);

      // 触发事件
      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_PAUSED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId
        });
      }, 100);

      // 等待Promise解析
      await expect(waitPromise).resolves.not.toThrow();
    });

    it('应该在超时时拒绝', async () => {
      const threadId = 'test-thread-id';

      // 创建等待Promise，设置短超时
      const waitPromise = eventWaiter.waitForThreadPaused(threadId, 100);

      // 不触发事件，等待超时
      await expect(waitPromise).rejects.toThrow();
    });
  });

  describe('waitForThreadCancelled', () => {
    it('应该在THREAD_CANCELLED事件触发时解析', async () => {
      const threadId = 'test-thread-id';

      const waitPromise = eventWaiter.waitForThreadCancelled(threadId, 5000);

      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_CANCELLED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId,
          reason: 'test'
        });
      }, 100);

      await expect(waitPromise).resolves.not.toThrow();
    });
  });

  describe('waitForThreadCompleted', () => {
    it('应该在THREAD_COMPLETED事件触发时解析', async () => {
      const threadId = 'test-thread-id';

      const waitPromise = eventWaiter.waitForThreadCompleted(threadId, 5000);

      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_COMPLETED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId,
          output: {},
          executionTime: 1000
        });
      }, 100);

      await expect(waitPromise).resolves.not.toThrow();
    });
  });

  describe('waitForThreadFailed', () => {
    it('应该在THREAD_FAILED事件触发时解析', async () => {
      const threadId = 'test-thread-id';

      const waitPromise = eventWaiter.waitForThreadFailed(threadId, 5000);

      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_FAILED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId,
          error: 'Test error'
        });
      }, 100);

      await expect(waitPromise).resolves.not.toThrow();
    });
  });

  describe('waitForThreadResumed', () => {
    it('应该在THREAD_RESUMED事件触发时解析', async () => {
      const threadId = 'test-thread-id';

      const waitPromise = eventWaiter.waitForThreadResumed(threadId, 5000);

      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_RESUMED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId
        });
      }, 100);

      await expect(waitPromise).resolves.not.toThrow();
    });
  });

  describe('waitForAnyLifecycleEvent', () => {
    it('应该在任意生命周期事件触发时解析', async () => {
      const threadId = 'test-thread-id';

      const waitPromise = eventWaiter.waitForAnyLifecycleEvent(threadId, 5000);

      // 触发THREAD_PAUSED事件
      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_PAUSED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId
        });
      }, 100);

      await expect(waitPromise).resolves.not.toThrow();
    });

    it('应该在THREAD_CANCELLED事件触发时解析', async () => {
      const threadId = 'test-thread-id';

      const waitPromise = eventWaiter.waitForAnyLifecycleEvent(threadId, 5000);

      // 触发THREAD_CANCELLED事件
      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_CANCELLED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId,
          reason: 'test'
        });
      }, 100);

      await expect(waitPromise).resolves.not.toThrow();
    });
  });
});