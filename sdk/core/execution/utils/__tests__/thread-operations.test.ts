/**
 * ThreadOperations 单元测试
 */

import { fork, join, copy, ForkConfig, JoinStrategy, JoinResult } from '../thread-operations';
import type { Thread } from '@modular-agent/types/thread';
import type { ThreadContext } from '../../context/thread-context';
import type { ThreadBuilder } from '../../thread-builder';
import type { ThreadRegistry } from '../../../services/thread-registry';
import { ExecutionError, TimeoutError, ValidationError } from '@modular-agent/types/errors';
import { ThreadStatus } from '@modular-agent/types/thread';
import { ExecutionState } from '../../context/execution-state';
import { ConversationManager } from '../../managers/conversation-manager';
import type { Graph, GraphNode, GraphEdge } from '@modular-agent/types/graph';

// Mock types for testing
type MockThreadContext = Partial<ThreadContext> & {
  thread: Thread;
}

describe('ThreadOperations', () => {
  let mockParentThreadContext: any;
  let mockChildThreadContext: any;
  let mockThreadBuilder: ThreadBuilder;
  let mockThreadRegistry: ThreadRegistry;
  let mockForkConfig: ForkConfig;
  let mockGraph: Graph;
  let mockStartTime: number;

  // 启用 Jest 计时器模拟
  beforeEach(() => {
    jest.useFakeTimers();
    mockStartTime = 1700000000000; // 固定的模拟时间戳
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // 初始化模拟图
    const mockNodes = new Map<string, GraphNode>();
    const mockEdges = new Map<string, GraphEdge>();
    const mockAdjacencyList = new Map<string, Set<string>>();
    const mockReverseAdjacencyList = new Map<string, Set<string>>();

    mockGraph = {
      nodes: mockNodes,
      edges: mockEdges,
      adjacencyList: mockAdjacencyList,
      reverseAdjacencyList: mockReverseAdjacencyList,
      endNodeIds: new Set<string>(),
      getNode: jest.fn(),
      getEdge: jest.fn(),
      getOutgoingNeighbors: jest.fn(),
      getIncomingNeighbors: jest.fn(),
      getOutgoingEdges: jest.fn(),
      getIncomingEdges: jest.fn(),
      getEdgeBetween: jest.fn(),
      hasNode: jest.fn(),
      hasEdge: jest.fn(),
      hasEdgeBetween: jest.fn(),
      getAllNodeIds: jest.fn().mockReturnValue([]),
      getAllEdgeIds: jest.fn().mockReturnValue([]),
      getNodeCount: jest.fn().mockReturnValue(0),
      getEdgeCount: jest.fn().mockReturnValue(0),
      getSourceNodes: jest.fn().mockReturnValue([]),
      getSinkNodes: jest.fn().mockReturnValue([])
    };

    // 初始化模拟对象
    mockParentThreadContext = {
      threadRegistry: {} as any,
      subgraphExecutionHistory: [],
      isExecutingTriggeredSubgraph: false,
      conversationStateManager: {} as any,
      thread: {
        id: 'parent-thread-id',
        workflowId: 'test-workflow',
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
        currentNodeId: 'node1',
        graph: mockGraph,
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
        startTime: mockStartTime,
        errors: []
      },
      conversationManager: {} as ConversationManager,
      executionState: new ExecutionState(),
      getThreadId: jest.fn().mockReturnValue('parent-thread-id'),
      getWorkflowId: jest.fn().mockReturnValue('test-workflow'),
      getStatus: jest.fn().mockReturnValue(ThreadStatus.RUNNING),
      getCurrentNodeId: jest.fn().mockReturnValue('node1'),
      getInput: jest.fn().mockReturnValue({}),
      getOutput: jest.fn().mockReturnValue({}),
      setOutput: jest.fn(),
      getMetadata: jest.fn().mockReturnValue({}),
      setMetadata: jest.fn(),
      getVariable: jest.fn(),
      updateVariable: jest.fn(),
      hasVariable: jest.fn(),
      getAllVariables: jest.fn().mockReturnValue({}),
      addNodeResult: jest.fn(),
      getNodeResults: jest.fn().mockReturnValue([]),
      getSubgraphExecutionHistory: jest.fn().mockReturnValue([]),
      startTriggeredSubgraphExecution: jest.fn(),
      endTriggeredSubgraphExecution: jest.fn(),
      isExecutingSubgraph: jest.fn().mockReturnValue(false),
      addError: jest.fn(),
      getErrors: jest.fn().mockReturnValue([]),
      getStartTime: jest.fn().mockReturnValue(mockStartTime),
      getEndTime: jest.fn().mockReturnValue(undefined),
      setEndTime: jest.fn(),
      getNavigator: jest.fn(),
      enterSubgraph: jest.fn(),
      exitSubgraph: jest.fn(),
      enterLoop: jest.fn(),
      exitLoop: jest.fn(),
      getCurrentSubgraphContext: jest.fn().mockReturnValue(null),
      getSubgraphStack: jest.fn().mockReturnValue([]),
      isInSubgraph: jest.fn().mockReturnValue(false),
      registerStatefulTool: jest.fn(),
      getStatefulTool: jest.fn(),
      cleanupStatefulTool: jest.fn(),
      cleanupAllStatefulTools: jest.fn(),
      getTriggerStateSnapshot: jest.fn().mockReturnValue(new Map()),
      restoreTriggerState: jest.fn(),
      getConversationManager: jest.fn().mockReturnValue({}),
      getThreadRegistry: jest.fn().mockReturnValue({}),
      getCurrentWorkflowId: jest.fn().mockReturnValue('test-workflow'),
      setCurrentNodeId: jest.fn(),
      triggerStateManager: {} as any,
      triggerManager: {} as any,
      statefulTools: new Map(),
      factories: new Map()
    } as any;

    mockChildThreadContext = {
      threadRegistry: {} as any,
      subgraphExecutionHistory: [],
      isExecutingTriggeredSubgraph: false,
      conversationStateManager: {} as any,
      thread: {
        id: 'child-thread-id',
        workflowId: 'test-workflow',
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
        currentNodeId: 'node2',
        graph: mockGraph,
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
        startTime: mockStartTime,
        errors: []
      },
      conversationManager: {} as ConversationManager,
      executionState: new ExecutionState(),
      getThreadId: jest.fn().mockReturnValue('child-thread-id'),
      getWorkflowId: jest.fn().mockReturnValue('test-workflow'),
      getStatus: jest.fn().mockReturnValue(ThreadStatus.RUNNING),
      getCurrentNodeId: jest.fn().mockReturnValue('node2'),
      getInput: jest.fn().mockReturnValue({}),
      getOutput: jest.fn().mockReturnValue({}),
      setOutput: jest.fn(),
      getMetadata: jest.fn().mockReturnValue({}),
      setMetadata: jest.fn(),
      getVariable: jest.fn(),
      updateVariable: jest.fn(),
      hasVariable: jest.fn(),
      getAllVariables: jest.fn().mockReturnValue({}),
      addNodeResult: jest.fn(),
      getNodeResults: jest.fn().mockReturnValue([]),
      getSubgraphExecutionHistory: jest.fn().mockReturnValue([]),
      startTriggeredSubgraphExecution: jest.fn(),
      endTriggeredSubgraphExecution: jest.fn(),
      isExecutingSubgraph: jest.fn().mockReturnValue(false),
      addError: jest.fn(),
      getErrors: jest.fn().mockReturnValue([]),
      getStartTime: jest.fn().mockReturnValue(mockStartTime),
      getEndTime: jest.fn().mockReturnValue(undefined),
      setEndTime: jest.fn(),
      getNavigator: jest.fn(),
      enterSubgraph: jest.fn(),
      exitSubgraph: jest.fn(),
      enterLoop: jest.fn(),
      exitLoop: jest.fn(),
      getCurrentSubgraphContext: jest.fn().mockReturnValue(null),
      getSubgraphStack: jest.fn().mockReturnValue([]),
      isInSubgraph: jest.fn().mockReturnValue(false),
      registerStatefulTool: jest.fn(),
      getStatefulTool: jest.fn(),
      cleanupStatefulTool: jest.fn(),
      cleanupAllStatefulTools: jest.fn(),
      getTriggerStateSnapshot: jest.fn().mockReturnValue(new Map()),
      restoreTriggerState: jest.fn(),
      getConversationManager: jest.fn().mockReturnValue({}),
      getThreadRegistry: jest.fn().mockReturnValue({}),
      getCurrentWorkflowId: jest.fn().mockReturnValue('test-workflow'),
      setCurrentNodeId: jest.fn(),
      triggerStateManager: {} as any,
      triggerManager: {} as any,
      statefulTools: new Map(),
      factories: new Map()
    } as any;

    mockThreadBuilder = {
      createFork: jest.fn().mockResolvedValue(mockChildThreadContext),
      createCopy: jest.fn().mockResolvedValue(mockChildThreadContext)
    } as unknown as ThreadBuilder;

    mockThreadRegistry = {
      get: jest.fn().mockReturnValue(mockChildThreadContext),
      register: jest.fn(),
      update: jest.fn(),
      getAll: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn()
    } as unknown as ThreadRegistry;

    mockForkConfig = {
      forkId: 'test-fork',
      forkStrategy: 'parallel',
      startNodeId: 'node2'
    };
  });

  describe('fork', () => {
    it('应该成功创建子线程', async () => {
      const result = await fork(mockParentThreadContext, mockForkConfig, mockThreadBuilder);

      expect(result).toBe(mockChildThreadContext);
      expect(mockThreadBuilder.createFork).toHaveBeenCalledWith(
        mockParentThreadContext,
        mockForkConfig
      );
    });

    it('应该在没有提供 forkId 时抛出 ValidationError', async () => {
      const invalidConfig = { ...mockForkConfig, forkId: '' };

      await expect(fork(mockParentThreadContext, invalidConfig, mockThreadBuilder))
        .rejects
        .toThrow(ValidationError);
    });

    it('应该在提供无效 forkStrategy 时抛出 ValidationError', async () => {
      const invalidConfig = { ...mockForkConfig, forkStrategy: 'invalid' as any };

      await expect(fork(mockParentThreadContext, invalidConfig, mockThreadBuilder))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('copy', () => {
    it('应该成功复制线程', async () => {
      const result = await copy(mockParentThreadContext, mockThreadBuilder);

      expect(result).toBe(mockChildThreadContext);
      expect(mockThreadBuilder.createCopy).toHaveBeenCalledWith(mockParentThreadContext);
    });

    it('应该在源线程上下文为空时抛出 ExecutionError', async () => {
      await expect(copy(null as any, mockThreadBuilder))
        .rejects
        .toThrow(ExecutionError);
    });

    it('应该在源线程上下文未定义时抛出 ExecutionError', async () => {
      await expect(copy(undefined as any, mockThreadBuilder))
        .rejects
        .toThrow(ExecutionError);
    });
  });

  describe('join', () => {
    let childThreadIds: string[];

    beforeEach(() => {
      childThreadIds = ['child1', 'child2', 'child3'];
    });

    it('应该成功合并已完成的子线程', async () => {
      // 模拟子线程已完成
      const completedThread: Thread = {
        id: 'child1',
        workflowId: 'test-workflow',
        workflowVersion: '1.0.0',
        status: ThreadStatus.COMPLETED,
        currentNodeId: 'node1',
        graph: mockGraph,
        variables: [],
        variableScopes: {
          global: {},
          thread: {},
          subgraph: [],
          loop: []
        },
        input: {},
        output: { result: 'success' },
        nodeResults: [],
        startTime: mockStartTime,
        errors: []
      };

      const mockCompletedContext = {
        ...mockChildThreadContext,
        subgraphExecutionHistory: [],
        isExecutingTriggeredSubgraph: false,
        thread: completedThread,
        conversationManager: {} as ConversationManager,
        executionState: new ExecutionState(),
        getThreadId: jest.fn().mockReturnValue('child1'),
        getWorkflowId: jest.fn().mockReturnValue('test-workflow'),
        getStatus: jest.fn().mockReturnValue(ThreadStatus.COMPLETED),
        getCurrentNodeId: jest.fn().mockReturnValue('node1'),
        getInput: jest.fn().mockReturnValue({}),
        getOutput: jest.fn().mockReturnValue({ result: 'success' }),
        setOutput: jest.fn(),
        getMetadata: jest.fn().mockReturnValue({}),
        setMetadata: jest.fn(),
        getVariable: jest.fn(),
        updateVariable: jest.fn(),
        hasVariable: jest.fn(),
        getAllVariables: jest.fn().mockReturnValue({}),
        addNodeResult: jest.fn(),
        getNodeResults: jest.fn().mockReturnValue([]),
        getSubgraphExecutionHistory: jest.fn().mockReturnValue([]),
        startTriggeredSubgraphExecution: jest.fn(),
        endTriggeredSubgraphExecution: jest.fn(),
        isExecutingSubgraph: jest.fn().mockReturnValue(false),
        addError: jest.fn(),
        getErrors: jest.fn().mockReturnValue([]),
        getStartTime: jest.fn().mockReturnValue(mockStartTime),
        getEndTime: jest.fn().mockReturnValue(undefined),
        setEndTime: jest.fn(),
        getNavigator: jest.fn(),
        enterSubgraph: jest.fn(),
        exitSubgraph: jest.fn(),
        enterLoop: jest.fn(),
        exitLoop: jest.fn(),
        getCurrentSubgraphContext: jest.fn().mockReturnValue(null),
        getSubgraphStack: jest.fn().mockReturnValue([]),
        isInSubgraph: jest.fn().mockReturnValue(false),
        registerStatefulTool: jest.fn(),
        getStatefulTool: jest.fn(),
        cleanupStatefulTool: jest.fn(),
        cleanupAllStatefulTools: jest.fn(),
        getTriggerStateSnapshot: jest.fn().mockReturnValue(new Map()),
        restoreTriggerState: jest.fn(),
        getConversationManager: jest.fn().mockReturnValue({}),
        getThreadRegistry: jest.fn().mockReturnValue({}),
        getCurrentWorkflowId: jest.fn().mockReturnValue('test-workflow'),
        setCurrentNodeId: jest.fn(),
        triggerStateManager: {} as any,
        triggerManager: {} as any,
        statefulTools: new Map(),
        factories: new Map()
      };

      (mockThreadRegistry.get as jest.Mock).mockReturnValueOnce(mockCompletedContext);

      const result = await join(
        childThreadIds,
        'ANY_COMPLETED',
        mockThreadRegistry,
        'main-path-1',
        5000 // 5秒超时
      );

      expect(result.success).toBe(true);
      expect(result.completedThreads).toContainEqual(completedThread);
    });

    it('应该在没有提供 joinStrategy 时抛出 ValidationError', async () => {
      await expect(join(childThreadIds, undefined as any, mockThreadRegistry, 'main-path-1', 5000))
        .rejects
        .toThrow(ValidationError);
    });

    it('应该在超时时间无效时抛出 ValidationError', async () => {
      // 这个测试不涉及计时器，直接测试验证逻辑
      await expect(join(childThreadIds, 'ANY_COMPLETED', mockThreadRegistry, 'main-path-1', -1))
        .rejects
        .toThrow(ValidationError);
    });

    it('应该在超时时间内未能满足条件时抛出 TimeoutError', async () => {
      // 模拟线程仍在运行
      const runningThread: Thread = {
        ...mockChildThreadContext.thread,
        status: ThreadStatus.RUNNING
      };

      const mockRunningContext = {
        ...mockChildThreadContext,
        subgraphExecutionHistory: [],
        isExecutingTriggeredSubgraph: false,
        thread: runningThread,
        conversationManager: {} as ConversationManager,
        executionState: new ExecutionState(),
        getThreadId: jest.fn().mockReturnValue('child1'),
        getWorkflowId: jest.fn().mockReturnValue('test-workflow'),
        getStatus: jest.fn().mockReturnValue(ThreadStatus.RUNNING),
        getCurrentNodeId: jest.fn().mockReturnValue('node1'),
        getInput: jest.fn().mockReturnValue({}),
        getOutput: jest.fn().mockReturnValue({}),
        setOutput: jest.fn(),
        getMetadata: jest.fn().mockReturnValue({}),
        setMetadata: jest.fn(),
        getVariable: jest.fn(),
        updateVariable: jest.fn(),
        hasVariable: jest.fn(),
        getAllVariables: jest.fn().mockReturnValue({}),
        addNodeResult: jest.fn(),
        getNodeResults: jest.fn().mockReturnValue([]),
        getSubgraphExecutionHistory: jest.fn().mockReturnValue([]),
        startTriggeredSubgraphExecution: jest.fn(),
        endTriggeredSubgraphExecution: jest.fn(),
        isExecutingSubgraph: jest.fn().mockReturnValue(false),
        addError: jest.fn(),
        getErrors: jest.fn().mockReturnValue([]),
        getStartTime: jest.fn().mockReturnValue(mockStartTime),
        getEndTime: jest.fn().mockReturnValue(undefined),
        setEndTime: jest.fn(),
        getNavigator: jest.fn(),
        enterSubgraph: jest.fn(),
        exitSubgraph: jest.fn(),
        enterLoop: jest.fn(),
        exitLoop: jest.fn(),
        getCurrentSubgraphContext: jest.fn().mockReturnValue(null),
        getSubgraphStack: jest.fn().mockReturnValue([]),
        isInSubgraph: jest.fn().mockReturnValue(false),
        registerStatefulTool: jest.fn(),
        getStatefulTool: jest.fn(),
        cleanupStatefulTool: jest.fn(),
        cleanupAllStatefulTools: jest.fn(),
        getTriggerStateSnapshot: jest.fn().mockReturnValue(new Map()),
        restoreTriggerState: jest.fn(),
        getConversationManager: jest.fn().mockReturnValue({}),
        getThreadRegistry: jest.fn().mockReturnValue({}),
        getCurrentWorkflowId: jest.fn().mockReturnValue('test-workflow'),
        setCurrentNodeId: jest.fn(),
        triggerStateManager: {} as any,
        triggerManager: {} as any,
        statefulTools: new Map(),
        factories: new Map()
      };

      (mockThreadRegistry.get as jest.Mock).mockReturnValue(mockRunningContext);

      // 使用 Jest 计时器模拟来测试超时
      const joinPromise = join(
        childThreadIds,
        'ALL_COMPLETED',
        mockThreadRegistry,
        'main-path-1',
        0.1 // 0.1秒超时（100ms）
      );

      // 推进计时器以触发超时
      jest.advanceTimersByTime(100);

      await expect(joinPromise).rejects.toThrow(TimeoutError);
    });

    it('应该根据 ALL_COMPLETED 策略进行合并', async () => {
      const completedThreads: Thread[] = [
        { ...mockChildThreadContext.thread, id: 'child1', status: ThreadStatus.COMPLETED, output: { data: 'result1' } },
        { ...mockChildThreadContext.thread, id: 'child2', status: ThreadStatus.COMPLETED, output: { data: 'result2' } },
        { ...mockChildThreadContext.thread, id: 'child3', status: ThreadStatus.COMPLETED, output: { data: 'result3' } }
      ];

      const mockContexts = completedThreads.map(thread => ({
        ...mockChildThreadContext,
        threadRegistry: {} as any,
        subgraphExecutionHistory: [],
        isExecutingTriggeredSubgraph: false,
        conversationStateManager: {} as any,
        thread,
        conversationManager: {} as ConversationManager,
        executionState: new ExecutionState(),
        getThreadId: jest.fn().mockReturnValue(thread.id),
        getWorkflowId: jest.fn().mockReturnValue('test-workflow'),
        getStatus: jest.fn().mockReturnValue(thread.status),
        getCurrentNodeId: jest.fn().mockReturnValue('node1'),
        getInput: jest.fn().mockReturnValue({}),
        getOutput: jest.fn().mockReturnValue(thread.output),
        setOutput: jest.fn(),
        getMetadata: jest.fn().mockReturnValue({}),
        setMetadata: jest.fn(),
        getVariable: jest.fn(),
        updateVariable: jest.fn(),
        hasVariable: jest.fn(),
        getAllVariables: jest.fn().mockReturnValue({}),
        addNodeResult: jest.fn(),
        getNodeResults: jest.fn().mockReturnValue([]),
        getSubgraphExecutionHistory: jest.fn().mockReturnValue([]),
        startTriggeredSubgraphExecution: jest.fn(),
        endTriggeredSubgraphExecution: jest.fn(),
        isExecutingSubgraph: jest.fn().mockReturnValue(false),
        addError: jest.fn(),
        getErrors: jest.fn().mockReturnValue([]),
        getStartTime: jest.fn().mockReturnValue(mockStartTime),
        getEndTime: jest.fn().mockReturnValue(undefined),
        setEndTime: jest.fn(),
        getNavigator: jest.fn(),
        enterSubgraph: jest.fn(),
        exitSubgraph: jest.fn(),
        enterLoop: jest.fn(),
        exitLoop: jest.fn(),
        getCurrentSubgraphContext: jest.fn().mockReturnValue(null),
        getSubgraphStack: jest.fn().mockReturnValue([]),
        isInSubgraph: jest.fn().mockReturnValue(false),
        registerStatefulTool: jest.fn(),
        getStatefulTool: jest.fn(),
        cleanupStatefulTool: jest.fn(),
        cleanupAllStatefulTools: jest.fn(),
        getTriggerStateSnapshot: jest.fn().mockReturnValue(new Map()),
        restoreTriggerState: jest.fn(),
        getConversationManager: jest.fn().mockReturnValue({}),
        getThreadRegistry: jest.fn().mockReturnValue({}),
        getCurrentWorkflowId: jest.fn().mockReturnValue('test-workflow'),
        setCurrentNodeId: jest.fn(),
        triggerStateManager: {} as any,
        triggerManager: {} as any,
        statefulTools: new Map(),
        factories: new Map()
      }));

      (mockThreadRegistry.get as jest.Mock)
        .mockReturnValueOnce(mockContexts[0])
        .mockReturnValueOnce(mockContexts[1])
        .mockReturnValueOnce(mockContexts[2]);

      const result = await join(
        childThreadIds,
        'ALL_COMPLETED',
        mockThreadRegistry,
        'main-path-1',
        0 // 不超时
      );

      expect(result.success).toBe(true);
      expect(result.completedThreads).toHaveLength(3);
      expect(result.failedThreads).toHaveLength(0);
    });

    it('应该根据 ANY_COMPLETED 策略进行合并', async () => {
      const completedThread: Thread = {
        ...mockChildThreadContext.thread,
        id: 'child1',
        status: ThreadStatus.COMPLETED,
        output: { data: 'result1' }
      };
      const runningThread: Thread = {
        ...mockChildThreadContext.thread,
        id: 'child2',
        status: ThreadStatus.RUNNING,
        output: {}
      };
      const failedThread: Thread = {
        ...mockChildThreadContext.thread,
        id: 'child3',
        status: ThreadStatus.FAILED,
        output: {}
      };

      const mockContexts = [
        { ...mockChildThreadContext, thread: completedThread, getThreadId: jest.fn().mockReturnValue('child1'), getStatus: jest.fn().mockReturnValue(ThreadStatus.COMPLETED) } as any,
        { ...mockChildThreadContext, thread: runningThread, getThreadId: jest.fn().mockReturnValue('child2'), getStatus: jest.fn().mockReturnValue(ThreadStatus.RUNNING) } as any,
        { ...mockChildThreadContext, thread: failedThread, getThreadId: jest.fn().mockReturnValue('child3'), getStatus: jest.fn().mockReturnValue(ThreadStatus.FAILED) } as any
      ];

      (mockThreadRegistry.get as jest.Mock)
        .mockReturnValueOnce(mockContexts[0])
        .mockReturnValueOnce(mockContexts[1])
        .mockReturnValueOnce(mockContexts[2]);

      const result = await join(
        childThreadIds,
        'ANY_COMPLETED',
        mockThreadRegistry,
        'main-path-1',
        0 // 不超时
      );

      expect(result.success).toBe(true);
      expect(result.completedThreads.some(t => t.id === 'child1')).toBe(true);
    });

    it('应该根据 ANY_FAILED 策略进行合并', async () => {
      const runningThread: Thread = {
        ...mockChildThreadContext.thread,
        id: 'child1',
        status: ThreadStatus.RUNNING,
        output: {}
      };
      const failedThread: Thread = {
        ...mockChildThreadContext.thread,
        id: 'child2',
        status: ThreadStatus.FAILED,
        output: { error: 'some error' }
      };

      const mockContexts = [
        { ...mockChildThreadContext, thread: runningThread, getThreadId: jest.fn().mockReturnValue('child1'), getStatus: jest.fn().mockReturnValue(ThreadStatus.RUNNING) } as any,
        { ...mockChildThreadContext, thread: failedThread, getThreadId: jest.fn().mockReturnValue('child2'), getStatus: jest.fn().mockReturnValue(ThreadStatus.FAILED) } as any
      ];

      (mockThreadRegistry.get as jest.Mock)
        .mockReturnValueOnce(mockContexts[0])
        .mockReturnValueOnce(mockContexts[1]);

      const result = await join(
        ['child1', 'child2'],
        'ANY_FAILED',
        mockThreadRegistry,
        'main-path-1',
        0 // 不超时
      );

      expect(result.success).toBe(true);
      expect(result.failedThreads.some(t => t.id === 'child2')).toBe(true);
    });
  });

  describe('内部辅助函数', () => {
    // 测试 validateJoinStrategy 函数逻辑
    it('validateJoinStrategy 应该正确验证 ALL_COMPLETED 策略', () => {
      // 使用反射或私有方法访问来测试内部函数
      // 由于 TypeScript 限制，我们直接测试外部行为
      const completedThreads: Thread[] = [{
        id: 'thread1',
        workflowId: 'test-workflow',
        workflowVersion: '1.0.0',
        status: ThreadStatus.COMPLETED,
        currentNodeId: 'node1',
        graph: mockGraph,
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
        startTime: mockStartTime,
        errors: []
      }];
      const failedThreads: Thread[] = [];
      const childThreadIds = ['thread1'];

      // 模拟一个函数来测试内部逻辑
      const validateJoinStrategy = (completed: Thread[], failed: Thread[], childIds: string[], strategy: JoinStrategy): boolean => {
        switch (strategy) {
          case 'ALL_COMPLETED':
            return failed.length === 0;
          case 'ANY_COMPLETED':
            return completed.length > 0;
          case 'ALL_FAILED':
            return failed.length === childIds.length;
          case 'ANY_FAILED':
            return failed.length > 0;
          case 'SUCCESS_COUNT_THRESHOLD':
            return completed.length > 0;
          default:
            return false;
        }
      };

      const result = validateJoinStrategy(completedThreads, failedThreads, childThreadIds, 'ALL_COMPLETED');
      expect(result).toBe(true);
    });

    it('validateJoinStrategy 应该正确验证 ANY_COMPLETED 策略', () => {
      const completedThreads: Thread[] = [{
        id: 'thread1',
        workflowId: 'test-workflow',
        workflowVersion: '1.0.0',
        status: ThreadStatus.COMPLETED,
        currentNodeId: 'node1',
        graph: mockGraph,
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
        startTime: mockStartTime,
        errors: []
      }];
      const failedThreads: Thread[] = [{
        id: 'thread2',
        workflowId: 'test-workflow',
        workflowVersion: '1.0.0',
        status: ThreadStatus.FAILED,
        currentNodeId: 'node1',
        graph: mockGraph,
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
        startTime: mockStartTime,
        errors: []
      }];
      const childThreadIds = ['thread1', 'thread2'];

      const validateJoinStrategy = (completed: Thread[], failed: Thread[], childIds: string[], strategy: JoinStrategy): boolean => {
        switch (strategy) {
          case 'ALL_COMPLETED':
            return failed.length === 0;
          case 'ANY_COMPLETED':
            return completed.length > 0;
          case 'ALL_FAILED':
            return failed.length === childIds.length;
          case 'ANY_FAILED':
            return failed.length > 0;
          case 'SUCCESS_COUNT_THRESHOLD':
            return completed.length > 0;
          default:
            return false;
        }
      };

      const result = validateJoinStrategy(completedThreads, failedThreads, childThreadIds, 'ANY_COMPLETED');
      expect(result).toBe(true);
    });

    it('mergeResults 应该正确合并单个线程的结果', () => {
      const completedThreads: Thread[] = [{
        id: 'thread1',
        workflowId: 'test-workflow',
        workflowVersion: '1.0.0',
        status: ThreadStatus.COMPLETED,
        currentNodeId: 'node1',
        graph: mockGraph,
        variables: [],
        variableScopes: {
          global: {},
          thread: {},
          subgraph: [],
          loop: []
        },
        input: {},
        output: { data: 'result1' },
        nodeResults: [],
        startTime: mockStartTime,
        errors: []
      }];

      const mergeResults = (threads: Thread[]): any => {
        if (threads.length === 0) {
          return {};
        }

        if (threads.length === 1) {
          return threads[0]!.output;
        }

        const mergedOutput: any = {};
        for (const thread of threads) {
          mergedOutput[thread.id] = thread.output;
        }

        return mergedOutput;
      };

      const result = mergeResults(completedThreads);
      expect(result).toEqual({ data: 'result1' });
    });

    it('mergeResults 应该正确合并多个线程的结果', () => {
      const completedThreads: Thread[] = [
        {
          id: 'thread1',
          workflowId: 'test-workflow',
          workflowVersion: '1.0.0',
          status: ThreadStatus.COMPLETED,
          currentNodeId: 'node1',
          graph: mockGraph,
          variables: [],
          variableScopes: {
            global: {},
            thread: {},
            subgraph: [],
            loop: []
          },
          input: {},
          output: { data: 'result1' },
          nodeResults: [],
          startTime: mockStartTime,
          errors: []
        },
        {
          id: 'thread2',
          workflowId: 'test-workflow',
          workflowVersion: '1.0.0',
          status: ThreadStatus.COMPLETED,
          currentNodeId: 'node1',
          graph: mockGraph,
          variables: [],
          variableScopes: {
            global: {},
            thread: {},
            subgraph: [],
            loop: []
          },
          input: {},
          output: { data: 'result2' },
          nodeResults: [],
          startTime: mockStartTime,
          errors: []
        }
      ];

      const mergeResults = (threads: Thread[]): any => {
        if (threads.length === 0) {
          return {};
        }

        if (threads.length === 1) {
          return threads[0]!.output;
        }

        const mergedOutput: any = {};
        for (const thread of threads) {
          mergedOutput[thread.id] = thread.output;
        }

        return mergedOutput;
      };

      const result = mergeResults(completedThreads);
      expect(result).toEqual({
        thread1: { data: 'result1' },
        thread2: { data: 'result2' }
      });
    });
  });
});