/**
 * thread-cascade-manager.test.ts
 * ThreadCascadeManager的单元测试
 */

import { ThreadCascadeManager } from '../thread-cascade-manager.js';
import { ThreadLifecycleManager } from '../thread-lifecycle-manager.js';
import { TaskRegistry } from '../../../services/task-registry.js';
import { ThreadRegistry } from '../../../services/thread-registry.js';
import { EventManager } from '../../../services/event-manager.js';
import { WorkflowRegistry } from '../../../services/workflow-registry.js';
import { ToolService } from '../../../services/tool-service.js';
import { SingletonRegistry } from '../../context/singleton-registry.js';
import { ThreadStatus, ThreadType } from '@modular-agent/types';
import { generateId, now } from '@modular-agent/common-utils';
import type { Thread, ThreadResult } from '@modular-agent/types';
import type { Graph } from '@modular-agent/types';
import { ThreadContext } from '../../context/thread-context.js';
import { ConversationManager } from '../conversation-manager.js';
import { LLMExecutor } from '../../executors/llm-executor.js';

describe('ThreadCascadeManager', () => {
  let cascadeManager: ThreadCascadeManager;
  let lifecycleManager: ThreadLifecycleManager;
  let parentThread: Thread;
  let childThread1: Thread;
  let childThread2: Thread;

  beforeEach(() => {
    SingletonRegistry.reset();
    SingletonRegistry.initialize();
    
    const eventManager = SingletonRegistry.getEventManager();
    lifecycleManager = new ThreadLifecycleManager(eventManager);
    const taskRegistry = SingletonRegistry.getTaskRegistry();
    const threadRegistry = SingletonRegistry.getThreadRegistry();
    cascadeManager = new ThreadCascadeManager(threadRegistry, lifecycleManager, eventManager, taskRegistry);

    // 创建父线程
    parentThread = createMockThread('parent-thread');

    // 创建子线程
    childThread1 = createMockThread('child-thread-1');
    childThread2 = createMockThread('child-thread-2');

    // 设置父子关系
    parentThread.threadType = 'TRIGGERED_SUBWORKFLOW';
    parentThread.triggeredSubworkflowContext = {
      parentThreadId: '', // 根线程无父线程
      childThreadIds: [childThread1.id, childThread2.id],
      triggeredSubworkflowId: generateId()
    };

    childThread1.threadType = 'TRIGGERED_SUBWORKFLOW';
    childThread1.triggeredSubworkflowContext = {
      parentThreadId: parentThread.id,
      childThreadIds: [],
      triggeredSubworkflowId: generateId()
    };

    childThread2.threadType = 'TRIGGERED_SUBWORKFLOW';
    childThread2.triggeredSubworkflowContext = {
      parentThreadId: parentThread.id,
      childThreadIds: [],
      triggeredSubworkflowId: generateId()
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
    // 清理SingletonRegistry
    SingletonRegistry.reset();
  });

  describe('cascadeCancel', () => {
    it('应该级联取消所有运行中的子线程', async () => {
      childThread1.status = 'RUNNING';
      childThread2.status = 'RUNNING';

      const cancelledCount = await cascadeManager.cascadeCancel(parentThread.id);

      expect(cancelledCount).toBe(2);
      expect(childThread1.status).toBe('CANCELLED');
      expect(childThread2.status).toBe('CANCELLED');
    });

    it('应该只取消运行中或暂停的子线程', async () => {
      childThread1.status = 'RUNNING';
      childThread2.status = 'COMPLETED';

      const cancelledCount = await cascadeManager.cascadeCancel(parentThread.id);

      expect(cancelledCount).toBe(1);
      expect(childThread1.status).toBe('CANCELLED');
      expect(childThread2.status).toBe('COMPLETED');
    });

    it('应该处理子线程取消失败的情况', async () => {
      childThread1.status = 'RUNNING';
      childThread2.status = 'RUNNING';

      // 模拟一个子线程取消失败
      jest.spyOn(lifecycleManager, 'cancelThread').mockImplementationOnce(
        async () => { throw new Error('Cancel failed'); }
      );

      const cancelledCount = await cascadeManager.cascadeCancel(parentThread.id);

      // 应该继续取消其他子线程
      expect(cancelledCount).toBe(1);
    });

    it('应该在没有子线程时返回0', async () => {
      if (parentThread.triggeredSubworkflowContext) {
        parentThread.triggeredSubworkflowContext.childThreadIds = [];
      }

      const cancelledCount = await cascadeManager.cascadeCancel(parentThread.id);

      expect(cancelledCount).toBe(0);
    });
  });

  describe('getChildThreadsStatus', () => {
    it('应该返回所有子线程的状态', () => {
      childThread1.status = 'RUNNING';
      childThread2.status = 'PAUSED';

      const statusMap = cascadeManager.getChildThreadsStatus(parentThread.id);

      expect(statusMap.size).toBe(2);
      expect(statusMap.get(childThread1.id)).toBe('RUNNING');
      expect(statusMap.get(childThread2.id)).toBe('PAUSED');
    });

    it('应该在没有子线程时返回空Map', () => {
      if (parentThread.triggeredSubworkflowContext) {
        parentThread.triggeredSubworkflowContext.childThreadIds = [];
      }

      const statusMap = cascadeManager.getChildThreadsStatus(parentThread.id);

      expect(statusMap.size).toBe(0);
    });
  });

  describe('hasActiveChildThreads', () => {
    it('应该在有运行中的子线程时返回true', () => {
      childThread1.status = 'RUNNING';
      childThread2.status = 'COMPLETED';

      expect(cascadeManager.hasActiveChildThreads(parentThread.id)).toBe(true);
    });

    it('应该在有暂停的子线程时返回true', () => {
      childThread1.status = 'PAUSED';
      childThread2.status = 'COMPLETED';

      expect(cascadeManager.hasActiveChildThreads(parentThread.id)).toBe(true);
    });

    it('应该在所有子线程都完成时返回false', () => {
      childThread1.status = 'COMPLETED';
      childThread2.status = 'FAILED';

      expect(cascadeManager.hasActiveChildThreads(parentThread.id)).toBe(false);
    });
  });

  describe('waitForAllChildrenCompleted', () => {
    it('应该在所有子线程完成时返回true', async () => {
      childThread1.status = 'RUNNING';
      childThread2.status = 'RUNNING';

      // 模拟子线程在100ms后完成并触发事件
      setTimeout(async () => {
        childThread1.status = 'COMPLETED';
        childThread2.status = 'COMPLETED';
        // 触发完成事件
        const result1: ThreadResult = {
          threadId: childThread1.id,
          output: {},
          executionTime: 100,
          nodeResults: [],
          metadata: {
            status: 'COMPLETED',
            startTime: childThread1.startTime,
            endTime: now(),
            executionTime: 100,
            nodeCount: 0,
            errorCount: 0
          }
        };
        const result2: ThreadResult = {
          threadId: childThread2.id,
          output: {},
          executionTime: 100,
          nodeResults: [],
          metadata: {
            status: 'COMPLETED',
            startTime: childThread2.startTime,
            endTime: now(),
            executionTime: 100,
            nodeCount: 0,
            errorCount: 0
          }
        };
        await lifecycleManager.completeThread(childThread1, result1);
        await lifecycleManager.completeThread(childThread2, result2);
      }, 100);

      const result = await cascadeManager.waitForAllChildrenCompleted(parentThread.id, 5000);

      expect(result).toBe(true);
    });

    it('应该在超时时返回false', async () => {
      childThread1.status = 'RUNNING';
      childThread2.status = 'RUNNING';

      const result = await cascadeManager.waitForAllChildrenCompleted(parentThread.id, 100);

      expect(result).toBe(false);
    });

    it('应该在子线程已经完成时立即返回true', async () => {
      childThread1.status = 'COMPLETED';
      childThread2.status = 'COMPLETED';

      const result = await cascadeManager.waitForAllChildrenCompleted(parentThread.id, 5000);

      expect(result).toBe(true);
    });

    it('应该在子线程失败时返回true', async () => {
      childThread1.status = 'RUNNING';
      childThread2.status = 'RUNNING';

      // 模拟子线程失败
      setTimeout(async () => {
        await lifecycleManager.failThread(childThread1, new Error('Test error'));
        await lifecycleManager.failThread(childThread2, new Error('Test error'));
      }, 100);

      const result = await cascadeManager.waitForAllChildrenCompleted(parentThread.id, 5000);

      expect(result).toBe(true);
    });

    it('应该在子线程取消时返回true', async () => {
      childThread1.status = 'RUNNING';
      childThread2.status = 'RUNNING';

      // 模拟子线程取消
      setTimeout(async () => {
        await lifecycleManager.cancelThread(childThread1, 'Test cancel');
        await lifecycleManager.cancelThread(childThread2, 'Test cancel');
      }, 100);

      const result = await cascadeManager.waitForAllChildrenCompleted(parentThread.id, 5000);

      expect(result).toBe(true);
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
      if (parentThread.triggeredSubworkflowContext) {
        parentThread.triggeredSubworkflowContext.childThreadIds = [];
      }

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
    status: 'CREATED',
    currentNodeId: 'node1',
    graph: {
      nodes: new Map(),
      edges: new Map(),
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
      endNodeIds: new Set(),
      getNode: () => undefined,
      getEdge: () => undefined,
      getOutgoingNeighbors: () => new Set(),
      getIncomingNeighbors: () => new Set(),
      getOutgoingEdges: () => [],
      getIncomingEdges: () => [],
      getEdgeBetween: () => undefined,
      hasNode: () => false,
      hasEdge: () => false,
      hasEdgeBetween: () => false,
      getAllNodeIds: () => [],
      getAllEdgeIds: () => [],
      getNodeCount: () => 0,
      getEdgeCount: () => 0,
      getSourceNodes: () => [],
      getSinkNodes: () => []
    } as any,
    variables: [],
    variableScopes: {
      global: {},
      thread: {},
      local: [],
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
  const eventManager = SingletonRegistry.getEventManager();
  const conversationManager = new ConversationManager({
    tokenLimit: 4000,
    eventManager: eventManager,
    workflowId: thread.workflowId,
    threadId: thread.id
  });

  // 获取LLMExecutor实例
  const llmExecutor = LLMExecutor.getInstance();
  
  const threadRegistry = SingletonRegistry.getThreadRegistry();
  const workflowRegistry = SingletonRegistry.getWorkflowRegistry();
  const toolService = SingletonRegistry.getToolService();

  return new ThreadContext(
    thread,
    conversationManager,
    threadRegistry,
    workflowRegistry,
    eventManager,
    toolService,
    llmExecutor
  );
}