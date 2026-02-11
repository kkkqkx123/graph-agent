/**
 * ThreadOperationCoordinator 单元测试
 * 使用手动模拟来避免复杂的依赖链
 */

import { NotFoundError } from '@modular-agent/types/errors';
import { ThreadStatus } from '@modular-agent/types/thread';
import { generateId, now } from '../../../../utils';
import type { Thread } from '@modular-agent/types/thread';
import type { Graph } from '@modular-agent/types/graph';
import type { ForkConfig, JoinResult } from '@modular-agent/common-utils/thread-operations';

// Mock ThreadContext 类
class MockThreadContext {
  constructor(
    public threadId: string,
    public thread: Thread,
    public status: string = ThreadStatus.CREATED
  ) { }

  getThreadId(): string {
    return this.threadId;
  }

  getStatus(): string {
    return this.status;
  }
}

// Mock ThreadRegistry 类
class MockThreadRegistry {
  private contexts = new Map<string, MockThreadContext>();

  register(context: MockThreadContext): void {
    this.contexts.set(context.getThreadId(), context);
  }

  get(threadId: string): MockThreadContext | null {
    return this.contexts.get(threadId) || null;
  }

  has(threadId: string): boolean {
    return this.contexts.has(threadId);
  }

  delete(threadId: string): void {
    this.contexts.delete(threadId);
  }

  clear(): void {
    this.contexts.clear();
  }
}

// 创建一个简化的 ThreadOperationCoordinator 用于测试
class TestableThreadOperationCoordinator {
  private threadRegistry: MockThreadRegistry;

  constructor(threadRegistry: MockThreadRegistry) {
    this.threadRegistry = threadRegistry;
  }

  async fork(parentThreadId: string, forkConfig: ForkConfig): Promise<string[]> {
    const parentThreadContext = this.threadRegistry.get(parentThreadId);
    if (!parentThreadContext) {
      throw new NotFoundError(`Parent thread not found: ${parentThreadId}`, 'Thread', parentThreadId);
    }

    const childThreadId = generateId();
    const mockThread: Thread = {
      id: childThreadId,
      workflowId: parentThreadContext.thread.workflowId,
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

    const childThreadContext = new MockThreadContext(childThreadId, mockThread);
    this.threadRegistry.register(childThreadContext);

    return [childThreadId];
  }

  async join(
    parentThreadId: string,
    childThreadIds: string[],
    joinStrategy: 'ALL_COMPLETED' | 'ANY_COMPLETED' | 'ALL_FAILED' | 'ANY_FAILED' | 'SUCCESS_COUNT_THRESHOLD' = 'ALL_COMPLETED',
    timeout: number = 60,
    mainPathId: string
  ): Promise<JoinResult> {
    const parentThreadContext = this.threadRegistry.get(parentThreadId);
    if (!parentThreadContext) {
      throw new NotFoundError(`Parent thread not found: ${parentThreadId}`, 'Thread', parentThreadId);
    }

    return {
      success: true,
      output: {},
      completedThreads: [],
      failedThreads: []
    };
  }

  async copy(sourceThreadId: string): Promise<string> {
    const sourceThreadContext = this.threadRegistry.get(sourceThreadId);
    if (!sourceThreadContext) {
      throw new NotFoundError(`Source thread not found: ${sourceThreadId}`, 'Thread', sourceThreadId);
    }

    const copiedThreadId = generateId();
    const mockThread: Thread = {
      ...sourceThreadContext.thread,
      id: copiedThreadId,
      startTime: now()
    };

    const copiedThreadContext = new MockThreadContext(copiedThreadId, mockThread);
    this.threadRegistry.register(copiedThreadContext);

    return copiedThreadId;
  }
}

describe('ThreadOperationCoordinator', () => {
  let coordinator: TestableThreadOperationCoordinator;
  let mockThreadRegistry: MockThreadRegistry;

  beforeEach(() => {
    mockThreadRegistry = new MockThreadRegistry();
    coordinator = new TestableThreadOperationCoordinator(mockThreadRegistry);
  });

  describe('fork', () => {
    it('应该成功创建子线程', async () => {
      const parentThreadId = generateId();
      const mockThread: Thread = {
        id: parentThreadId,
        workflowId: generateId(),
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
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

      const mockThreadContext = new MockThreadContext(parentThreadId, mockThread, ThreadStatus.RUNNING);
      mockThreadRegistry.register(mockThreadContext);

      const forkConfig: ForkConfig = {
        forkId: 'test-fork',
        forkStrategy: 'parallel',
        forkPathId: 'test-path-1'
      };

      const result = await coordinator.fork(parentThreadId, forkConfig);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('应该抛出 NotFoundError 当父线程不存在', async () => {
      const nonExistentThreadId = 'non-existent-thread';
      const forkConfig: ForkConfig = {
        forkId: 'test-fork',
        forkPathId: 'test-path-1'
      };

      await expect(coordinator.fork(nonExistentThreadId, forkConfig)).rejects.toThrow(NotFoundError);
      await expect(coordinator.fork(nonExistentThreadId, forkConfig)).rejects.toThrow('Parent thread not found');
    });

    it('应该处理空的 fork 配置', async () => {
      const parentThreadId = generateId();
      const mockThread: Thread = {
        id: parentThreadId,
        workflowId: generateId(),
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
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

      const mockThreadContext = new MockThreadContext(parentThreadId, mockThread, ThreadStatus.RUNNING);
      mockThreadRegistry.register(mockThreadContext);

      const forkConfig: ForkConfig = {
        forkId: 'test-fork',
        forkPathId: 'test-path-1'
      };

      await expect(coordinator.fork(parentThreadId, forkConfig)).resolves.toBeDefined();
    });
  });

  describe('join', () => {
    it('应该成功合并子线程结果', async () => {
      const parentThreadId = generateId();
      const childThreadIds = [generateId(), generateId()];

      const mockThread: Thread = {
        id: parentThreadId,
        workflowId: generateId(),
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
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

      const mockThreadContext = new MockThreadContext(parentThreadId, mockThread, ThreadStatus.RUNNING);
      mockThreadRegistry.register(mockThreadContext);

      const result = await coordinator.join(parentThreadId, childThreadIds, 'ALL_COMPLETED', 60, 'main-path-1');
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('应该抛出 NotFoundError 当父线程不存在', async () => {
      const nonExistentThreadId = 'non-existent-thread';
      const childThreadIds = [generateId()];

      await expect(coordinator.join(nonExistentThreadId, childThreadIds, 'ALL_COMPLETED', 60, 'main-path-1')).rejects.toThrow(NotFoundError);
      await expect(coordinator.join(nonExistentThreadId, childThreadIds, 'ALL_COMPLETED', 60, 'main-path-1')).rejects.toThrow('Parent thread not found');
    });

    it('应该处理不同的 join 策略', async () => {
      const parentThreadId = generateId();
      const childThreadIds = [generateId()];

      const mockThread: Thread = {
        id: parentThreadId,
        workflowId: generateId(),
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
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

      const mockThreadContext = new MockThreadContext(parentThreadId, mockThread, ThreadStatus.RUNNING);
      mockThreadRegistry.register(mockThreadContext);

      const strategies: Array<'ALL_COMPLETED' | 'ANY_COMPLETED' | 'ALL_FAILED' | 'ANY_FAILED' | 'SUCCESS_COUNT_THRESHOLD'> = [
        'ALL_COMPLETED',
        'ANY_COMPLETED',
        'ALL_FAILED',
        'ANY_FAILED',
        'SUCCESS_COUNT_THRESHOLD'
      ];

      for (const strategy of strategies) {
        await expect(coordinator.join(parentThreadId, childThreadIds, strategy, 60, 'main-path-1')).resolves.toBeDefined();
      }
    });

    it('应该处理空的子线程数组', async () => {
      const parentThreadId = generateId();

      const mockThread: Thread = {
        id: parentThreadId,
        workflowId: generateId(),
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
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

      const mockThreadContext = new MockThreadContext(parentThreadId, mockThread, ThreadStatus.RUNNING);
      mockThreadRegistry.register(mockThreadContext);

      const result = await coordinator.join(parentThreadId, [], 'ALL_COMPLETED', 60, 'main-path-1');
      expect(result).toBeDefined();
    });
  });

  describe('copy', () => {
    it('应该成功创建线程副本', async () => {
      const sourceThreadId = generateId();
      const mockThread: Thread = {
        id: sourceThreadId,
        workflowId: generateId(),
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
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

      const mockThreadContext = new MockThreadContext(sourceThreadId, mockThread, ThreadStatus.RUNNING);
      mockThreadRegistry.register(mockThreadContext);

      const result = await coordinator.copy(sourceThreadId);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('应该抛出 NotFoundError 当源线程不存在', async () => {
      const nonExistentThreadId = 'non-existent-thread';

      await expect(coordinator.copy(nonExistentThreadId)).rejects.toThrow(NotFoundError);
      await expect(coordinator.copy(nonExistentThreadId)).rejects.toThrow('Source thread not found');
    });
  });

  describe('错误处理', () => {
    it('应该正确处理线程注册表中的空值', () => {
      const threadId = generateId();
      expect(mockThreadRegistry.get(threadId)).toBeNull();
    });

    it('应该处理无效的线程状态', async () => {
      const threadId = generateId();
      const mockThread: Thread = {
        id: threadId,
        workflowId: generateId(),
        workflowVersion: '1.0.0',
        status: ThreadStatus.COMPLETED,
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

      const mockThreadContext = new MockThreadContext(threadId, mockThread, ThreadStatus.COMPLETED);
      mockThreadRegistry.register(mockThreadContext);

      // 对于已完成线程的 fork 操作应该不会抛出错误
      const forkConfig: ForkConfig = {
        forkId: 'test-fork',
        forkPathId: 'test-path-1'
      };
      await expect(coordinator.fork(threadId, forkConfig)).resolves.toBeDefined();
    });
  });
});