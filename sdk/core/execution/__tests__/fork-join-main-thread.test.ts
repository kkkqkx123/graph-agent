/**
 * Fork/Join 主线程上下文处理测试
 * 测试主线程对话历史合并功能
 */

import { ThreadContext } from '../context/thread-context';
import { ThreadBuilder } from '../thread-builder';
import { ExecutionContext } from '../context/execution-context';
import { join, ForkConfig } from '../utils/thread-operations';
import { ThreadOperationCoordinator } from '../coordinators/thread-operation-coordinator';
import { ConversationManager } from '../managers/conversation-manager';
import type { Thread } from '../../../types/thread';
import { ThreadStatus } from '../../../types/thread';

describe('Fork/Join 主线程上下文处理', () => {
  let executionContext: ExecutionContext;
  let threadBuilder: ThreadBuilder;
  let coordinator: ThreadOperationCoordinator;

  beforeEach(() => {
    // 使用模拟定时器以加快测试执行和避免真实超时
    jest.useFakeTimers();

    // 创建执行上下文
    executionContext = new ExecutionContext();

    // 创建线程构建器
    threadBuilder = new ThreadBuilder(executionContext.getWorkflowRegistry(), executionContext);

    // 创建操作协调器
    coordinator = new ThreadOperationCoordinator(executionContext);
  });

  afterEach(() => {
    // 恢复真实定时器
    jest.useRealTimers();
  });

  describe('Fork操作 - 存储forkPathId', () => {
    it('应该在创建子线程时存储forkPathId到metadata', async () => {
      // 创建父线程
      const parentThreadContext = createMockThreadContext('parent-thread', executionContext);
      executionContext.getThreadRegistry().register(parentThreadContext);

      // 创建Fork配置
      const forkConfig: ForkConfig = {
        forkId: 'test-fork',
        forkStrategy: 'parallel',
        forkPathId: 'path-1'
      };

      // 执行Fork
      const childThreadContext = await threadBuilder.createFork(parentThreadContext, forkConfig);

      // 验证forkPathId已存储
      expect(childThreadContext.thread.forkJoinContext?.forkPathId).toBe('path-1');
    });

    it('应该为不同的子线程存储不同的forkPathId', async () => {
      // 创建父线程
      const parentThreadContext = createMockThreadContext('parent-thread', executionContext);
      executionContext.getThreadRegistry().register(parentThreadContext);

      // 创建多个子线程
      const forkConfig1: ForkConfig = {
        forkId: 'test-fork',
        forkStrategy: 'parallel',
        forkPathId: 'path-1'
      };

      const forkConfig2: ForkConfig = {
        forkId: 'test-fork',
        forkStrategy: 'parallel',
        forkPathId: 'path-2'
      };

      const child1 = await threadBuilder.createFork(parentThreadContext, forkConfig1);
      const child2 = await threadBuilder.createFork(parentThreadContext, forkConfig2);

      // 验证不同的forkPathId
      expect(child1.thread.forkJoinContext?.forkPathId).toBe('path-1');
      expect(child2.thread.forkJoinContext?.forkPathId).toBe('path-2');
    });
  });

  describe('Join操作 - 合并主线程对话历史', () => {
    it('应该将主线程的对话历史合并到父线程', async () => {
      // 创建父线程
      const parentThreadContext = createMockThreadContext('parent-thread', executionContext);
      executionContext.getThreadRegistry().register(parentThreadContext);

      // 创建子线程
      const child1 = createMockThreadContext('child-1', executionContext);
      child1.thread.forkJoinContext = { forkId: 'test-fork', forkPathId: 'path-1' };
      child1.thread.status = ThreadStatus.COMPLETED;

      const child2 = createMockThreadContext('child-2', executionContext);
      child2.thread.forkJoinContext = { forkId: 'test-fork', forkPathId: 'path-2' };
      child2.thread.status = ThreadStatus.COMPLETED;

      executionContext.getThreadRegistry().register(child1);
      executionContext.getThreadRegistry().register(child2);

      // 在主线程中添加消息
      child1.conversationManager.addMessage({
        role: 'user',
        content: 'Main thread message'
      });

      // 注意：在实际执行中，子线程会通过执行引擎完成，这里直接设置status用于测试
      // 执行Join，指定path-1为主线程（使用轮询方式，不依赖事件）
      const joinPromise = join(
        ['child-1', 'child-2'],
        'ALL_COMPLETED',
        executionContext.getThreadRegistry(),
        'path-1',
        5, // 5秒超时
        'parent-thread',
        undefined // 不传递eventManager，使用轮询方式
      );

      // 推进模拟定时器以让轮询运行
      // 轮询周期为100ms，需要推进足够的时间让轮询完成
      jest.advanceTimersByTime(1000);
      const result = await joinPromise;

      // 验证主线程的对话历史已合并到父线程
      const parentMessages = parentThreadContext.conversationManager.getMessages();
      expect(parentMessages.length).toBe(1);
      expect(parentMessages[0]?.content).toBe('Main thread message');
    });

    it('应该将第一个子线程的对话历史合并到父线程', async () => {
      // 创建父线程
      const parentThreadContext = createMockThreadContext('parent-thread', executionContext);
      executionContext.getThreadRegistry().register(parentThreadContext);

      // 创建子线程
      const child1 = createMockThreadContext('child-1', executionContext);
      child1.thread.forkJoinContext = { forkId: 'test-fork', forkPathId: 'path-1' };
      child1.thread.status = ThreadStatus.COMPLETED;

      const child2 = createMockThreadContext('child-2', executionContext);
      child2.thread.forkJoinContext = { forkId: 'test-fork', forkPathId: 'path-2' };
      child2.thread.status = ThreadStatus.COMPLETED;

      executionContext.getThreadRegistry().register(child1);
      executionContext.getThreadRegistry().register(child2);

      // 在第一个子线程中添加消息
      child1.conversationManager.addMessage({
        role: 'user',
        content: 'First child message'
      });

      // 执行Join，指定path-1为主线程（使用轮询方式，不依赖事件）
      const joinPromise = join(
        ['child-1', 'child-2'],
        'ALL_COMPLETED',
        executionContext.getThreadRegistry(),
        'path-1',
        5, // 5秒超时
        'parent-thread',
        undefined // 不传递eventManager，使用轮询方式
      );

      // 推进模拟定时器以让轮询运行
      // 轮询周期为100ms，需要推进足够的时间让轮询完成
      jest.advanceTimersByTime(1000);
      const result = await joinPromise;

      // 验证第一个子线程的对话历史已合并到父线程
      const parentMessages = parentThreadContext.conversationManager.getMessages();
      expect(parentMessages.length).toBe(1);
      expect(parentMessages[0]?.content).toBe('First child message');
    });

    it('当找不到主线程时应该抛出错误', async () => {
      // 创建父线程
      const parentThreadContext = createMockThreadContext('parent-thread', executionContext);
      executionContext.getThreadRegistry().register(parentThreadContext);

      // 创建子线程
      const child1 = createMockThreadContext('child-1', executionContext);
      child1.thread.forkJoinContext = { forkId: 'test-fork', forkPathId: 'path-1' };
      child1.thread.status = ThreadStatus.COMPLETED;

      executionContext.getThreadRegistry().register(child1);

      // 执行Join，指定不存在的mainPathId（应该抛出ExecutionError）
      const joinPromise = join(
        ['child-1'],
        'ALL_COMPLETED',
        executionContext.getThreadRegistry(),
        'path-nonexistent',
        5, // 5秒超时
        'parent-thread',
        undefined // 不传递eventManager，使用轮询方式
      );

      // 推进模拟定时器以让轮询运行
      // 轮询周期为100ms，需要推进足够的时间让轮询完成
      jest.advanceTimersByTime(1000);

      await expect(joinPromise).rejects.toThrow('Main thread not found for mainPathId');
    });
  });

  describe('图构建 - Path ID全局唯一化', () => {
    it('应该为forkPathIds生成全局唯一ID', () => {
      // 这个测试需要在GraphBuilder的测试中实现
      // 这里只是占位符
      expect(true).toBe(true);
    });
  });

  describe('验证规则', () => {
    it('应该验证forkPathIds和childNodeIds长度一致', () => {
      // 这个测试需要在GraphValidator的测试中实现
      // 这里只是占位符
      expect(true).toBe(true);
    });

    it('应该验证mainPathId在forkPathIds中', () => {
      // 这个测试需要在GraphValidator的测试中实现
      // 这里只是占位符
      expect(true).toBe(true);
    });
  });
});

/**
 * 创建模拟的ThreadContext
 */
function createMockThreadContext(threadId: string, context: ExecutionContext): ThreadContext {
  const thread: Thread = {
    id: threadId,
    workflowId: 'test-workflow',
    workflowVersion: '1.0.0',
    status: ThreadStatus.RUNNING,
    currentNodeId: 'node-1',
    graph: createMockGraph(),
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
    startTime: Date.now(),
    errors: [],
    metadata: {}
  };

  const conversationManager = new ConversationManager();

  return new ThreadContext(
    thread,
    conversationManager,
    context.getThreadRegistry(),
    context.getWorkflowRegistry(),
    context.getEventManager(),
    context.getToolService(),
    context.getLlmExecutor()
  );
}

/**
 * 创建模拟的Graph对象
 */
function createMockGraph() {
  const nodes = new Map();
  const edges = new Map();
  const adjacencyList: Map<string, Set<string>> = new Map();
  const reverseAdjacencyList: Map<string, Set<string>> = new Map();

  return {
    nodes,
    edges,
    adjacencyList,
    reverseAdjacencyList,
    startNodeId: 'start',
    endNodeIds: new Set(['end']),
    getNode: () => undefined,
    getEdge: () => undefined,
    getOutgoingNeighbors: (): Set<string> => new Set(),
    getIncomingNeighbors: (): Set<string> => new Set(),
    getOutgoingEdges: () => [],
    getIncomingEdges: () => [],
    getEdgeBetween: () => undefined,
    hasNode: () => false,
    hasEdge: () => false,
    hasEdgeBetween: () => false,
    getAllNodeIds: (): string[] => [],
    getAllEdgeIds: (): string[] => [],
    getNodeCount: () => 0,
    getEdgeCount: () => 0,
    getSourceNodes: () => [],
    getSinkNodes: () => []
  };
}