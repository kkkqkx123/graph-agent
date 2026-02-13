/**
 * event-waiter.test.ts
 * EventWaiter的单元测试
 */

import {
  waitForThreadPaused,
  waitForThreadCancelled,
  waitForThreadCompleted,
  waitForThreadFailed,
  waitForThreadResumed,
  waitForAnyLifecycleEvent,
  waitForNodeCompleted,
  WAIT_FOREVER
} from '../event-waiter';
import { eventManager } from '../../../../services/event-manager';
import { EventType } from '@modular-agent/types/events';

describe('EventWaiter', () => {
  afterEach(() => {
    // 清理所有事件监听器
    eventManager.clear();
  });

  describe('waitForThreadPaused', () => {
    it('应该在THREAD_PAUSED事件触发时解析', async () => {
      const threadId = 'test-thread-id';

      // 创建等待Promise
      const waitPromise = waitForThreadPaused(eventManager, threadId, 5000);

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
      const waitPromise = waitForThreadPaused(eventManager, threadId, 100);

      // 不触发事件，等待超时
      await expect(waitPromise).rejects.toThrow();
    });
  });

  describe('waitForThreadCancelled', () => {
    it('应该在THREAD_CANCELLED事件触发时解析', async () => {
      const threadId = 'test-thread-id';

      const waitPromise = waitForThreadCancelled(eventManager, threadId, 5000);

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

      const waitPromise = waitForThreadCompleted(eventManager, threadId, 5000);

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

      const waitPromise = waitForThreadFailed(eventManager, threadId, 5000);

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

      const waitPromise = waitForThreadResumed(eventManager, threadId, 5000);

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

      const waitPromise = waitForAnyLifecycleEvent(eventManager, threadId, 5000);

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

      const waitPromise = waitForAnyLifecycleEvent(eventManager, threadId, 5000);

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

  describe('多线程场景测试', () => {
    it('应该只等待指定threadId的事件，忽略其他线程的事件', async () => {
      const threadId1 = 'thread-1';
      const threadId2 = 'thread-2';

      // 创建等待thread-1的Promise
      const waitPromise = waitForThreadPaused(eventManager, threadId1, 5000);

      // 先触发thread-2的事件（应该被忽略）
      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_PAUSED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId: threadId2
        });
      }, 100);

      // 再触发thread-1的事件（应该被捕获）
      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_PAUSED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId: threadId1
        });
      }, 200);

      // 等待Promise解析
      await expect(waitPromise).resolves.not.toThrow();
    });

    it('应该正确处理多个线程同时等待不同事件', async () => {
      const threadId1 = 'thread-1';
      const threadId2 = 'thread-2';

      // 创建两个等待Promise
      const waitPromise1 = waitForThreadPaused(eventManager, threadId1, 5000);
      const waitPromise2 = waitForThreadCancelled(eventManager, threadId2, 5000);

      // 触发thread-1的PAUSED事件
      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_PAUSED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId: threadId1
        });
      }, 100);

      // 触发thread-2的CANCELLED事件
      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_CANCELLED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId: threadId2,
          reason: 'test'
        });
      }, 150);

      // 两个Promise都应该解析
      await expect(Promise.all([waitPromise1, waitPromise2])).resolves.not.toThrow();
    });

    it('waitForAnyLifecycleEvent应该只监听指定threadId的事件', async () => {
      const threadId1 = 'thread-1';
      const threadId2 = 'thread-2';

      // 创建等待thread-1的Promise
      const waitPromise = waitForAnyLifecycleEvent(eventManager, threadId1, 5000);

      // 触发thread-2的事件（应该被忽略）
      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_PAUSED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId: threadId2
        });
      }, 100);

      // 触发thread-1的事件（应该被捕获）
      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_COMPLETED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId: threadId1,
          output: {},
          executionTime: 1000
        });
      }, 200);

      // 等待Promise解析
      await expect(waitPromise).resolves.not.toThrow();
    });
  });

  describe('始终等待功能', () => {
    it('应该支持使用 -1 表示始终等待', async () => {
      const threadId = 'test-thread-id';
      
      // 创建等待Promise（使用 -1）
      const waitPromise = waitForThreadPaused(eventManager, threadId, -1);
      
      // 延迟触发事件（超过默认超时时间）
      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_PAUSED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId
        });
      }, 6000);  // 6秒后触发（超过默认的5秒超时）
      
      // 应该成功解析（因为使用了 -1 表示始终等待）
      await expect(waitPromise).resolves.not.toThrow();
    });

    it('应该支持使用 WAIT_FOREVER 常量', async () => {
      const threadId = 'test-thread-id';
      
      // 创建等待Promise（使用 WAIT_FOREVER 常量）
      const waitPromise = waitForThreadPaused(eventManager, threadId, WAIT_FOREVER);
      
      // 延迟触发事件
      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_PAUSED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId
        });
      }, 6000);
      
      // 应该成功解析
      await expect(waitPromise).resolves.not.toThrow();
    });

    it('应该支持在多线程场景下使用 -1', async () => {
      const threadId1 = 'thread-1';
      const threadId2 = 'thread-2';

      // 创建两个等待Promise，都使用 -1
      const waitPromise1 = waitForThreadPaused(eventManager, threadId1, -1);
      const waitPromise2 = waitForThreadCancelled(eventManager, threadId2, WAIT_FOREVER);

      // 延迟触发事件
      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_PAUSED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId: threadId1
        });
      }, 6000);

      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_CANCELLED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId: threadId2,
          reason: 'test'
        });
      }, 7000);

      // 两个Promise都应该解析
      await expect(Promise.all([waitPromise1, waitPromise2])).resolves.not.toThrow();
    });

    it('应该支持 waitForAnyLifecycleEvent 使用 -1', async () => {
      const threadId = 'test-thread-id';

      // 创建等待Promise（使用 -1）
      const waitPromise = waitForAnyLifecycleEvent(eventManager, threadId, -1);

      // 延迟触发事件
      setTimeout(() => {
        eventManager.emit({
          type: EventType.THREAD_COMPLETED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId,
          output: {},
          executionTime: 1000
        });
      }, 6000);

      // 应该成功解析
      await expect(waitPromise).resolves.not.toThrow();
    });

    it('应该支持节点等待函数使用 -1', async () => {
      const threadId = 'test-thread-id';
      const nodeId = 'test-node-id';

      // 创建等待Promise（使用 -1）
      const waitPromise = waitForNodeCompleted(eventManager, threadId, nodeId, -1);

      // 延迟触发事件
      setTimeout(() => {
        eventManager.emit({
          type: EventType.NODE_COMPLETED,
          timestamp: Date.now(),
          workflowId: 'test-workflow-id',
          threadId,
          nodeId,
          output: {},
          executionTime: 1000
        });
      }, 6000);

      // 应该成功解析
      await expect(waitPromise).resolves.not.toThrow();
    });
  });
});