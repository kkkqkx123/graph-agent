/**
 * thread-cascade-manager.test.ts
 * ThreadCascadeManager的单元测试
 */

import { ThreadCascadeManager } from '../thread-cascade-manager';
import { ThreadLifecycleManager } from '../../thread-lifecycle-manager';
import { threadRegistry } from '../../../services/thread-registry';
import { eventManager } from '../../../services/event-manager';
import { ThreadStatus } from '../../../../types/thread';
import { generateId, now } from '../../../../utils';
import type { Thread } from '../../../../types/thread';
import type { Graph } from '../../../../types/graph';
import { ThreadContext } from '../../context/thread-context';
import { ConversationManager } from '../../conversation';

describe('ThreadCascadeManager', () => {
  let cascadeManager: ThreadCascadeManager;
  let lifecycleManager: ThreadLifecycleManager;
  let parentThread: Thread;
  let childThread1: Thread;
  let childThread2: Thread;

  beforeEach(() => {
    lifecycleManager = new ThreadLifecycleManager(eventManager);
    cascadeManager = new ThreadCascadeManager(threadRegistry, lifecycleManager);
    
    // 创建父线程
    parentThread = createMockThread('parent-thread');
    
    // 创建子线程
    childThread1 = createMockThread('child-thread-1');
    childThread2 = createMockThread('child-thread-2');
    
    // 设置父子关系
    parentThread.metadata = {
      childThreadIds: [childThread1.id, childThread2.id]
    };
    
    childThread1.metadata = {
      parentThreadId: parentThread.id
    };
    
    childThread2.metadata = {
      parentThreadId: parentThread.id
    };
    
    // 注册线程到registry
    const parentContext = createMockThreadContext(parentThread);
    const childContext1 = createMockThreadContext(childThread1);
    const childContext2 = createMockThreadContext(childThread2);
    
    threadRegistry.register(parentContext);
    threadRegistry.register(childContext1);
    threadRegistry.register(childContext2);
  });

  afterEach(() => {
    // 清理registry
    threadRegistry.clear();
    // 清理事件监听器
    eventManager.clear();
  });

  describe('cascadeCancel', () => {
    it('应该级联取消所有运行中的子线程', async () => {
      childThread1.status = ThreadStatus.RUNNING;
      childThread2.status = ThreadStatus.RUNNING;
      
      const cancelledCount = await cascadeManager.cascadeCancel(parentThread.id);
      
      expect(cancelledCount).toBe(2);
      expect(childThread1.status).toBe(ThreadStatus.CANCELLED);
      expect(childThread2.status).toBe(ThreadStatus.CANCELLED);
    });

    it('应该只取消运行中或暂停的子线程', async () => {
      childThread1.status = ThreadStatus.RUNNING;
      childThread2.status = ThreadStatus.COMPLETED;
      
      const cancelledCount = await cascadeManager.cascadeCancel(parentThread.id);
      
      expect(cancelledCount).toBe(1);
      expect(childThread1.status).toBe(ThreadStatus.CANCELLED);
      expect(childThread2.status).toBe(ThreadStatus.COMPLETED);
    });

    it('应该处理子线程取消失败的情况', async () => {
      childThread1.status = ThreadStatus.RUNNING;
      childThread2.status = ThreadStatus.RUNNING;
      
      // 模拟一个子线程取消失败
      jest.spyOn(lifecycleManager, 'cancelThread').mockImplementationOnce(
        async () => { throw new Error('Cancel failed'); }
      );
      
      const cancelledCount = await cascadeManager.cascadeCancel(parentThread.id);
      
      // 应该继续取消其他子线程
      expect(cancelledCount).toBe(1);
    });

    it('应该在没有子线程时返回0', async () => {
      parentThread.metadata = { childThreadIds: [] };
      
      const cancelledCount = await cascadeManager.cascadeCancel(parentThread.id);
      
      expect(cancelledCount).toBe(0);
    });
  });

  describe('getChildThreadsStatus', () => {
    it('应该返回所有子线程的状态', () => {
      childThread1.status = ThreadStatus.RUNNING;
      childThread2.status = ThreadStatus.PAUSED;
      
      const statusMap = cascadeManager.getChildThreadsStatus(parentThread.id);
      
      expect(statusMap.size).toBe(2);
      expect(statusMap.get(childThread1.id)).toBe(ThreadStatus.RUNNING);
      expect(statusMap.get(childThread2.id)).toBe(ThreadStatus.PAUSED);
    });

    it('应该在没有子线程时返回空Map', () => {
      parentThread.metadata = { childThreadIds: [] };
      
      const statusMap = cascadeManager.getChildThreadsStatus(parentThread.id);
      
      expect(statusMap.size).toBe(0);
    });
  });

  describe('hasActiveChildThreads', () => {
    it('应该在有运行中的子线程时返回true', () => {
      childThread1.status = ThreadStatus.RUNNING;
      childThread2.status = ThreadStatus.COMPLETED;
      
      expect(cascadeManager.hasActiveChildThreads(parentThread.id)).toBe(true);
    });

    it('应该在有暂停的子线程时返回true', () => {
      childThread1.status = ThreadStatus.PAUSED;
      childThread2.status = ThreadStatus.COMPLETED;
      
      expect(cascadeManager.hasActiveChildThreads(parentThread.id)).toBe(true);
    });

    it('应该在所有子线程都完成时返回false', () => {
      childThread1.status = ThreadStatus.COMPLETED;
      childThread2.status = ThreadStatus.FAILED;
      
      expect(cascadeManager.hasActiveChildThreads(parentThread.id)).toBe(false);
    });
  });

  describe('waitForAllChildrenCompleted', () => {
    it('应该在所有子线程完成时返回true', async () => {
      childThread1.status = ThreadStatus.RUNNING;
      childThread2.status = ThreadStatus.RUNNING;
      
      // 模拟子线程在100ms后完成
      setTimeout(() => {
        childThread1.status = ThreadStatus.COMPLETED;
        childThread2.status = ThreadStatus.COMPLETED;
      }, 100);
      
      const result = await cascadeManager.waitForAllChildrenCompleted(parentThread.id, 5000);
      
      expect(result).toBe(true);
    });

    it('应该在超时时返回false', async () => {
      childThread1.status = ThreadStatus.RUNNING;
      childThread2.status = ThreadStatus.RUNNING;
      
      const result = await cascadeManager.waitForAllChildrenCompleted(parentThread.id, 100);
      
      expect(result).toBe(false);
    });
  });

  describe('getThreadTreeDepth', () => {
    it('应该正确计算线程树深度', () => {
      const depth = cascadeManager.getThreadTreeDepth(childThread1.id);
      
      expect(depth).toBe(2); // 父线程(1) + 子线程(1)
    });

    it('应该在根线程时返回1', () => {
      const depth = cascadeManager.getThreadTreeDepth(parentThread.id);
      
      expect(depth).toBe(1);
    });
  });

  describe('getAllDescendantThreadIds', () => {
    it('应该返回所有后代线程ID', () => {
      const descendants = cascadeManager.getAllDescendantThreadIds(parentThread.id);
      
      expect(descendants).toContain(childThread1.id);
      expect(descendants).toContain(childThread2.id);
      expect(descendants.length).toBe(2);
    });

    it('应该在没有子线程时返回空数组', () => {
      parentThread.metadata = { childThreadIds: [] };
      
      const descendants = cascadeManager.getAllDescendantThreadIds(parentThread.id);
      
      expect(descendants.length).toBe(0);
    });
  });
});

// 辅助函数：创建模拟Thread
function createMockThread(id: string): Thread {
  return {
    id,
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
}

// 辅助函数：创建模拟ThreadContext
function createMockThreadContext(thread: Thread): ThreadContext {
  const conversationManager = new ConversationManager({
    tokenLimit: 4000,
    eventManager: eventManager,
    workflowId: thread.workflowId,
    threadId: thread.id
  });
  
  return new ThreadContext(
    thread,
    conversationManager,
    threadRegistry
  );
}