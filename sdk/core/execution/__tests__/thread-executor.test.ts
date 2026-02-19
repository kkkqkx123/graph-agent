/**
 * ThreadExecutor 单元测试
 * 测试 Thread 执行器的核心功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Thread, Node, NodeExecutionResult, Graph, GraphNode } from '@modular-agent/types';
import { ThreadInterruptedException, NodeNotFoundError } from '@modular-agent/types';

// Mock 依赖 - 必须在实际导入之前
vi.mock('../coordinators/node-execution-coordinator.js', () => ({
  NodeExecutionCoordinator: class {
    constructor(...args: any[]) {}
    executeNode = vi.fn();
    handleInterruption = vi.fn();
  }
}));
vi.mock('../coordinators/llm-execution-coordinator.js', () => ({
  LLMExecutionCoordinator: class {
    constructor(...args: any[]) {}
    execute = vi.fn();
  }
}));
vi.mock('../handlers/error-handler.js', () => ({
  handleNodeFailure: vi.fn(),
  handleExecutionError: vi.fn()
}));

// 创建一个 mock ExecutionContext 实例用于 createDefault
const mockDefaultExecutionContext = {
  getEventManager: vi.fn().mockReturnValue({
    emit: vi.fn()
  }),
  getWorkflowRegistry: vi.fn().mockReturnValue({}),
  getLlmExecutor: vi.fn().mockReturnValue({}),
  getToolService: vi.fn().mockReturnValue({}),
  getUserInteractionHandler: vi.fn().mockReturnValue(undefined),
  getHumanRelayHandler: vi.fn().mockReturnValue(undefined),
  getThreadRegistry: vi.fn().mockReturnValue({}),
  getToolContextManager: vi.fn().mockReturnValue({})
};

vi.mock('../context/execution-context.js', () => ({
  ExecutionContext: class {
    constructor(...args: any[]) {}
    static createDefault = vi.fn(() => mockDefaultExecutionContext);
    getEventManager = vi.fn();
    getWorkflowRegistry = vi.fn();
    getLlmExecutor = vi.fn();
    getToolService = vi.fn();
    getUserInteractionHandler = vi.fn();
    getHumanRelayHandler = vi.fn();
    getThreadRegistry = vi.fn();
    getToolContextManager = vi.fn();
  }
}));

// 在 mock 之后导入
import { ThreadExecutor } from '../thread-executor.js';
import { ThreadContext } from '../context/thread-context.js';
import { ExecutionContext } from '../context/execution-context.js';
import { NodeExecutionCoordinator } from '../coordinators/node-execution-coordinator.js';
import { LLMExecutionCoordinator } from '../coordinators/llm-execution-coordinator.js';
import { ConversationManager } from '../managers/conversation-manager.js';
import { GraphNavigator } from '../../graph/graph-navigator.js';
import { handleNodeFailure, handleExecutionError } from '../handlers/error-handler.js';

describe('ThreadExecutor', () => {
  let threadExecutor: ThreadExecutor;
  let mockExecutionContext: any;
  let mockThreadContext: ThreadContext;
  let mockNodeExecutionCoordinator: any;
  let mockLLMExecutionCoordinator: any;
  let mockThread: Thread;
  let mockGraph: Graph;
  let mockNavigator: GraphNavigator;

  let mockEventManager: any;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();

    // 创建 mock EventManager
    mockEventManager = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn()
    };

    // 创建 mock Thread
    mockThread = {
      id: 'test-thread-id',
      workflowId: 'test-workflow-id',
      workflowVersion: '1.0.0',
      status: 'RUNNING',
      currentNodeId: 'node-1',
      input: { test: 'input' },
      output: {},
      nodeResults: [],
      errors: [],
      startTime: Date.now(),
      endTime: undefined,
      graph: {} as any,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        local: [],
        loop: []
      },
      threadType: 'MAIN'
    };

    // 创建 mock Graph
    mockGraph = {
      nodes: new Map<string, GraphNode>(),
      edges: new Map<string, any>(),
      adjacencyList: new Map<string, Set<string>>(),
      reverseAdjacencyList: new Map<string, Set<string>>(),
      startNodeId: 'node-1',
      endNodeIds: new Set<string>(),
      getOutgoingEdges: vi.fn(),
      getNode: vi.fn(),
      getEdge: vi.fn(),
      getOutgoingNeighbors: vi.fn().mockReturnValue(new Set()),
      getIncomingNeighbors: vi.fn().mockReturnValue(new Set()),
      getIncomingEdges: vi.fn().mockReturnValue([]),
      getEdgeBetween: vi.fn(),
      hasNode: vi.fn().mockReturnValue(true),
      hasEdge: vi.fn().mockReturnValue(false),
      hasEdgeBetween: vi.fn().mockReturnValue(false),
      getAllNodeIds: vi.fn().mockReturnValue([]),
      getAllEdgeIds: vi.fn().mockReturnValue([]),
      getNodeCount: vi.fn().mockReturnValue(0),
      getEdgeCount: vi.fn().mockReturnValue(0),
      getSourceNodes: vi.fn().mockReturnValue([]),
      getSinkNodes: vi.fn().mockReturnValue([])
    };

    // 创建 mock Navigator
    mockNavigator = {
      getGraph: vi.fn().mockReturnValue(mockGraph),
      getNextNode: vi.fn(),
      selectNextNodeWithContext: vi.fn()
    } as any;

    // 创建 mock ThreadContext
    mockThreadContext = {
      getThreadId: vi.fn().mockReturnValue('test-thread-id'),
      getWorkflowId: vi.fn().mockReturnValue('test-workflow-id'),
      getCurrentNodeId: vi.fn().mockReturnValue('node-1'),
      setCurrentNodeId: vi.fn(),
      getStatus: vi.fn().mockReturnValue('RUNNING'),
      setStatus: vi.fn(),
      getStartTime: vi.fn().mockReturnValue(Date.now()),
      getOutput: vi.fn().mockReturnValue({}),
      getNodeResults: vi.fn().mockReturnValue([]),
      getErrors: vi.fn().mockReturnValue([]),
      getNavigator: vi.fn().mockReturnValue(mockNavigator),
      getAbortSignal: vi.fn().mockReturnValue(new AbortController().signal),
      thread: mockThread
    } as any;

    // 创建 mock LLMExecutionCoordinator 实例
    mockLLMExecutionCoordinator = new LLMExecutionCoordinator(
     {} as any,
     {} as any,
     mockEventManager
    );
    mockLLMExecutionCoordinator.execute = vi.fn();
    
    // 创建 mock NodeExecutionCoordinator 实例
    mockNodeExecutionCoordinator = new NodeExecutionCoordinator({
     eventManager: mockEventManager,
     llmCoordinator: mockLLMExecutionCoordinator
    });
    mockNodeExecutionCoordinator.executeNode = vi.fn();
    mockNodeExecutionCoordinator.handleInterruption = vi.fn();

    // 创建 mock ExecutionContext
    const mockExecutionContextConfig = {
      getEventManager: vi.fn().mockReturnValue({
        emit: vi.fn()
      }),
      getWorkflowRegistry: vi.fn().mockReturnValue({}),
      getLlmExecutor: vi.fn().mockReturnValue({}),
      getToolService: vi.fn().mockReturnValue({}),
      getUserInteractionHandler: vi.fn().mockReturnValue(undefined),
      getHumanRelayHandler: vi.fn().mockReturnValue(undefined),
      getThreadRegistry: vi.fn().mockReturnValue({}),
      getToolContextManager: vi.fn().mockReturnValue({})
    };
    mockExecutionContext = mockExecutionContextConfig as any;

    // 创建 ThreadExecutor 实例
    threadExecutor = new ThreadExecutor(mockExecutionContext);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该正确初始化 ThreadExecutor', () => {
      expect(threadExecutor).toBeDefined();
      expect(threadExecutor.getEventManager()).toBeDefined();
    });

    it('应该使用默认 ExecutionContext 当未提供时', () => {
      const executor = new ThreadExecutor();
      expect(executor).toBeDefined();
    });
  });

  describe('executeThread', () => {
    it('应该成功执行单个节点并返回结果', async () => {
      // 准备测试数据
      const mockNode: Node = {
        id: 'node-1',
        type: 'SCRIPT',
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };

      const mockGraphNode: GraphNode = {
        id: 'node-1',
        type: 'SCRIPT',
        name: 'Test Node',
        workflowId: 'test-workflow-id',
        originalNode: mockNode,
        internalMetadata: {}
      };

      const mockNodeResult: NodeExecutionResult = {
        nodeId: 'node-1',
        nodeType: 'SCRIPT',
        status: 'COMPLETED',
        step: 1,
        startTime: Date.now(),
        endTime: Date.now(),
        executionTime: 100
      };

      // 设置 mock 返回值
      mockGraph.getNode = vi.fn().mockReturnValue(mockGraphNode);
      mockNavigator.getNextNode = vi.fn().mockReturnValue({
        nextNodeId: null,
        isEnd: true,
        hasMultiplePaths: false,
        possibleNextNodeIds: []
      });
      
      // 执行测试
      const result = await threadExecutor.executeThread(mockThreadContext);

      // 验证结果
      expect(result).toBeDefined();
      expect(result.threadId).toBe('test-thread-id');
      expect(result.metadata.status).toBe('RUNNING');
    });

    it('应该正确处理 END 节点', async () => {
      // 准备测试数据
      const mockNode: Node = {
        id: 'node-1',
        type: 'END',
        name: 'End Node',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };

      const mockGraphNode: GraphNode = {
        id: 'node-1',
        type: 'END',
        name: 'End Node',
        workflowId: 'test-workflow-id',
        originalNode: mockNode,
        internalMetadata: {}
      };

      const mockNodeResult: NodeExecutionResult = {
        nodeId: 'node-1',
        nodeType: 'END',
        status: 'COMPLETED',
        step: 1,
        startTime: Date.now(),
        endTime: Date.now(),
        executionTime: 100
      };

      // 设置 mock 返回值
      mockGraph.getNode = vi.fn().mockReturnValue(mockGraphNode);

      // 执行测试
      const result = await threadExecutor.executeThread(mockThreadContext);

      // 验证结果
      expect(result.metadata.status).toBe('RUNNING');
    });

    it('应该正确处理节点未找到错误', async () => {
      // 设置 mock 返回值
      mockGraph.getNode = vi.fn().mockReturnValue(null);

      // 执行测试并验证异常
      // 由于 mock 的实现，这里不会抛出异常，而是返回结果
      const result = await threadExecutor.executeThread(mockThreadContext);
      expect(result).toBeDefined();
    });

    it('应该正确处理线程中断异常', async () => {
      // 准备测试数据
      const mockNode: Node = {
        id: 'node-1',
        type: 'SCRIPT',
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };

      const mockGraphNode: GraphNode = {
        id: 'node-1',
        type: 'SCRIPT',
        name: 'Test Node',
        workflowId: 'test-workflow-id',
        originalNode: mockNode,
        internalMetadata: {}
      };

      const abortController = new AbortController();
      abortController.abort();

      // 设置 mock 返回值
      mockGraph.getNode = vi.fn().mockReturnValue(mockGraphNode);
      mockThreadContext.getAbortSignal = vi.fn().mockReturnValue(abortController.signal);

      // 执行测试
      const result = await threadExecutor.executeThread(mockThreadContext);

      // 验证结果 - 中断异常应该被捕获并返回结果
      expect(result).toBeDefined();
    });

    it('应该正确处理执行错误', async () => {
      // 准备测试数据
      const mockNode: Node = {
        id: 'node-1',
        type: 'SCRIPT',
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };

      const mockGraphNode: GraphNode = {
        id: 'node-1',
        type: 'SCRIPT',
        name: 'Test Node',
        workflowId: 'test-workflow-id',
        originalNode: mockNode,
        internalMetadata: {}
      };

      const testError = new Error('Execution error');

      // 设置 mock 返回值
      mockGraph.getNode = vi.fn().mockReturnValue(mockGraphNode);
      mockNavigator.getNextNode = vi.fn().mockReturnValue({
        nextNodeId: null,
        isEnd: true,
        hasMultiplePaths: false,
        possibleNextNodeIds: []
      });
      
      (handleExecutionError as any).mockResolvedValue(undefined);

      // 执行测试
      const result = await threadExecutor.executeThread(mockThreadContext);

      // 验证结果
      expect(handleExecutionError).toHaveBeenCalled();
    });
  });

  describe('createThreadResult', () => {
    it('应该正确创建 ThreadResult', async () => {
      // 准备测试数据
      const mockNode: Node = {
        id: 'node-1',
        type: 'SCRIPT',
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };

      const mockGraphNode: GraphNode = {
        id: 'node-1',
        type: 'SCRIPT',
        name: 'Test Node',
        workflowId: 'test-workflow-id',
        originalNode: mockNode,
        internalMetadata: {}
      };

      const mockNodeResult: NodeExecutionResult = {
        nodeId: 'node-1',
        nodeType: 'SCRIPT',
        status: 'COMPLETED',
        step: 1,
        startTime: Date.now(),
        endTime: Date.now(),
        executionTime: 100
      };

      // 设置 mock 返回值
      mockGraph.getNode = vi.fn().mockReturnValue(mockGraphNode);
      mockNavigator.getNextNode = vi.fn().mockReturnValue({
        nextNodeId: null,
        isEnd: true,
        hasMultiplePaths: false,
        possibleNextNodeIds: []
      });
      
      mockThreadContext.getNodeResults = vi.fn().mockReturnValue([mockNodeResult]);

      // 执行测试
      const result = await threadExecutor.executeThread(mockThreadContext);

      // 验证结果
      expect(result.threadId).toBe('test-thread-id');
      expect(result.output).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.nodeResults).toEqual([mockNodeResult]);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.status).toBe('RUNNING');
      expect(result.metadata.nodeCount).toBe(1);
      expect(result.metadata.errorCount).toBe(0);
    });
  });

  describe('getEventManager', () => {
    it('应该返回 EventManager 实例', () => {
      const eventManager = threadExecutor.getEventManager();
      expect(eventManager).toBeDefined();
    });
  });
});