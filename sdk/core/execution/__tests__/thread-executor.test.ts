/**
 * ThreadExecutor 单元测试
 */

import { ThreadExecutor } from '../thread-executor';
import { ThreadContext } from '../context/thread-context';
import { ExecutionContext } from '../context/execution-context';
import { NotFoundError } from '@modular-agent/types';
import { ThreadStatus } from '@modular-agent/types';
import type { NodeExecutionResult } from '@modular-agent/types';
import type { Node } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';

// Mock 依赖
class MockNodeExecutionCoordinator {
  executeNode = jest.fn();
}

class MockEventManager {
  emit = jest.fn();
}

class MockWorkflowRegistry {
  get = jest.fn();
  getProcessed = jest.fn();
}

class MockThreadBuilder {
  build = jest.fn();
}

class MockLLMExecutor {
  // Mock implementation
}

class MockToolService {
  // Mock implementation
}

class MockUserInteractionHandler {
  // Mock implementation
}

class MockHumanRelayHandler {
  // Mock implementation
}

class MockGraphNavigator {
  getGraph = jest.fn().mockReturnValue({
    getNode: jest.fn()
  });
  getNextNode = jest.fn();
  selectNextNodeWithContext = jest.fn();
}

describe('ThreadExecutor', () => {
  let executor: ThreadExecutor;
  let nodeExecutionCoordinator: MockNodeExecutionCoordinator;
  let eventManager: MockEventManager;
  let workflowRegistry: MockWorkflowRegistry;
  let threadBuilder: MockThreadBuilder;
  let executionContext: ExecutionContext;

  beforeEach(() => {
    nodeExecutionCoordinator = new MockNodeExecutionCoordinator();
    eventManager = new MockEventManager();
    workflowRegistry = new MockWorkflowRegistry();
    threadBuilder = new MockThreadBuilder();

    // 创建执行上下文
    executionContext = ExecutionContext.createDefault();
    
    // 注册 mock 服务到执行上下文
    executionContext.register('eventManager', eventManager);
    executionContext.register('workflowRegistry', workflowRegistry);
    executionContext.register('toolService', new MockToolService());
    executionContext.register('llmExecutor', new MockLLMExecutor());
    executionContext.register('userInteractionHandler', new MockUserInteractionHandler());
    executionContext.register('humanRelayHandler', new MockHumanRelayHandler());

    // Mock ThreadBuilder 构造函数
    jest.spyOn(require('../thread-builder'), 'ThreadBuilder').mockImplementation(() => threadBuilder);

    executor = new ThreadExecutor(executionContext);
    
    // 替换内部的 NodeExecutionCoordinator
    (executor as any).nodeExecutionCoordinator = nodeExecutionCoordinator;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeThread', () => {
    it('应该成功执行线程到完成', async () => {
      // 创建模拟的 ThreadContext
      const threadContext = createMockThreadContext();
      
      // 模拟节点执行结果
      const nodeResults: NodeExecutionResult[] = [
        { nodeId: 'start', nodeType: 'START', status: 'COMPLETED', step: 1 },
        { nodeId: 'end', nodeType: 'END', status: 'COMPLETED', step: 2 }
      ];

      // 模拟节点执行
      nodeExecutionCoordinator.executeNode
        .mockResolvedValueOnce(nodeResults[0]) // START 节点
        .mockResolvedValueOnce(nodeResults[1]); // END 节点

      // 执行测试
      const result = await executor.executeThread(threadContext);

      // 验证结果
      expect(result.metadata.status).toBe(ThreadStatus.COMPLETED);
      expect(result.threadId).toBe('test-thread');
      expect(result.metadata.errorCount).toBe(0);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      
      // 验证线程状态已更新为完成
      expect(threadContext.thread.status).toBe(ThreadStatus.COMPLETED);
      expect(threadContext.thread.endTime).toBeDefined();
    });

    it('应该在节点执行失败时停止执行', async () => {
      const threadContext = createMockThreadContext();
      
      // 模拟节点执行失败
      const failedResult: NodeExecutionResult = {
        nodeId: 'start',
        nodeType: 'START',
        status: 'FAILED',
        step: 1,
        error: new Error('Execution failed')
      };

      nodeExecutionCoordinator.executeNode.mockResolvedValue(failedResult);

      // 执行测试
      const result = await executor.executeThread(threadContext);

      // 验证结果 - 节点失败时，线程状态保持不变（由外部管理）
      // 错误已被记录到 errors 数组
      expect(result.metadata.errorCount).toBe(1);
    });

    it('应该在遇到END节点时完成执行', async () => {
      const threadContext = createMockThreadContext();
      
      // 模拟直接执行END节点
      threadContext.thread.currentNodeId = 'end';
      
      const endNodeResult: NodeExecutionResult = {
        nodeId: 'end',
        nodeType: 'END',
        status: 'COMPLETED',
        step: 1
      };

      nodeExecutionCoordinator.executeNode.mockResolvedValue(endNodeResult);

      // 执行测试
      const result = await executor.executeThread(threadContext);

      // 验证结果
      expect(result.metadata.status).toBe(ThreadStatus.COMPLETED);
      expect(threadContext.thread.status).toBe(ThreadStatus.COMPLETED);
    });

    it('应该在节点跳过时继续执行', async () => {
      const threadContext = createMockThreadContext();
      
      const skippedResult: NodeExecutionResult = {
        nodeId: 'start',
        nodeType: 'START',
        status: 'SKIPPED',
        step: 1
      };

      const completedResult: NodeExecutionResult = {
        nodeId: 'end',
        nodeType: 'END',
        status: 'COMPLETED',
        step: 2
      };

      nodeExecutionCoordinator.executeNode
        .mockResolvedValueOnce(skippedResult)
        .mockResolvedValueOnce(completedResult);

      // 执行测试
      const result = await executor.executeThread(threadContext);

      // 验证结果 - 跳过节点后完成应该是成功
      expect(result.metadata.status).toBe(ThreadStatus.COMPLETED);
    });

    it('应该在执行过程中遇到错误时处理错误', async () => {
      const threadContext = createMockThreadContext();
      
      // 模拟执行过程中抛出错误
      nodeExecutionCoordinator.executeNode.mockRejectedValue(new Error('Unexpected error'));

      // 执行测试
      const result = await executor.executeThread(threadContext);

      // 验证结果 - 捕获的异常应该被记录到 errors 数组
      expect(result.metadata.errorCount).toBeGreaterThan(0);
    });

    it('应该在需要暂停时停止执行', async () => {
      const threadContext = createMockThreadContext();
      threadContext.thread.shouldPause = true;

      // 执行测试
      const result = await executor.executeThread(threadContext);

      // 验证结果 - 应该在没有执行任何节点的情况下返回
      expect(result.metadata.status).toBe(ThreadStatus.CREATED);
      expect(result.nodeResults).toHaveLength(0);
    });

    it('应该在需要停止时停止执行', async () => {
      const threadContext = createMockThreadContext();
      threadContext.thread.shouldStop = true;

      // 执行测试
      const result = await executor.executeThread(threadContext);

      // 验证结果 - 应该在没有执行任何节点的情况下返回
      expect(result.metadata.status).toBe(ThreadStatus.CREATED);
      expect(result.nodeResults).toHaveLength(0);
    });
  });

  describe('getCurrentNode', () => {
    it('应该成功获取当前节点', () => {
      const threadContext = createMockThreadContext();
      const currentNode = (executor as any).getCurrentNode(threadContext);

      expect(currentNode).toBeDefined();
      expect(currentNode.id).toBe('start');
      expect(currentNode.type).toBe('START');
    });

    it('应该在节点不存在时抛出NotFoundError', () => {
      const threadContext = createMockThreadContext();
      threadContext.thread.currentNodeId = 'non-existent-node';

      // 模拟图导航器返回 null
      const mockNavigator = new MockGraphNavigator();
      mockNavigator.getGraph().getNode.mockReturnValue(null);
      threadContext.getNavigator = jest.fn().mockReturnValue(mockNavigator);

      expect(() => (executor as any).getCurrentNode(threadContext)).toThrow(NotFoundError);
    });

    it('应该在originalNode不存在时抛出NotFoundError', () => {
      const threadContext = createMockThreadContext();

      // 模拟图导航器返回没有originalNode的节点
      const mockNavigator = new MockGraphNavigator();
      mockNavigator.getGraph().getNode.mockReturnValue({ originalNode: null });
      threadContext.getNavigator = jest.fn().mockReturnValue(mockNavigator);

      expect(() => (executor as any).getCurrentNode(threadContext)).toThrow(NotFoundError);
    });
  });

  describe('isEndNode', () => {
    it('应该正确识别END节点', () => {
      const endNode: Node = {
        id: 'end',
        type: NodeType.END,
        name: 'End Node',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };
      expect((executor as any).isEndNode(endNode)).toBe(true);
    });

    it('应该正确识别非END节点', () => {
      const startNode: Node = {
        id: 'start',
        type: NodeType.START,
        name: 'Start Node',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };
      expect((executor as any).isEndNode(startNode)).toBe(false);
    });
  });

  describe('routeToNextNode', () => {
    it('应该在单一路径时正确路由到下一个节点', () => {
      const threadContext = createMockThreadContext();
      const currentNode: Node = {
        id: 'start',
        type: NodeType.START,
        name: 'Start Node',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };
      const nodeResult: NodeExecutionResult = {
        nodeId: 'start',
        nodeType: 'START',
        status: 'COMPLETED',
        step: 1
      };

      // 模拟单一路径导航
      const mockNavigator = new MockGraphNavigator();
      mockNavigator.getNextNode.mockReturnValue({
        hasMultiplePaths: false,
        nextNodeId: 'next-node'
      });
      threadContext.getNavigator = jest.fn().mockReturnValue(mockNavigator);
      threadContext.setCurrentNodeId = jest.fn();

      (executor as any).routeToNextNode(threadContext, currentNode, nodeResult);

      expect(threadContext.setCurrentNodeId).toHaveBeenCalledWith('next-node');
    });

    it('应该在多路径时使用上下文进行路由决策', () => {
      const threadContext = createMockThreadContext();
      const currentNode: Node = {
        id: 'decision',
        type: NodeType.ROUTE,
        name: 'Decision Node',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };
      const nodeResult: NodeExecutionResult = {
        nodeId: 'decision',
        nodeType: 'ROUTE',
        status: 'COMPLETED',
        step: 1
      };

      // 模拟多路径导航
      const mockNavigator = new MockGraphNavigator();
      mockNavigator.getNextNode.mockReturnValue({
        hasMultiplePaths: true
      });
      mockNavigator.selectNextNodeWithContext.mockReturnValue('selected-node');
      threadContext.getNavigator = jest.fn().mockReturnValue(mockNavigator);
      threadContext.getNodeResults = jest.fn().mockReturnValue([nodeResult]);
      threadContext.setCurrentNodeId = jest.fn();

      (executor as any).routeToNextNode(threadContext, currentNode, nodeResult);

      expect(mockNavigator.selectNextNodeWithContext).toHaveBeenCalledWith(
        'decision',
        threadContext.thread,
        'ROUTE',
        nodeResult
      );
      expect(threadContext.setCurrentNodeId).toHaveBeenCalledWith('selected-node');
    });

    it('应该在无下一个节点时不设置当前节点', () => {
      const threadContext = createMockThreadContext();
      const currentNode: Node = {
        id: 'start',
        type: NodeType.START,
        name: 'Start Node',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: []
      };
      const nodeResult: NodeExecutionResult = {
        nodeId: 'start',
        nodeType: 'START',
        status: 'COMPLETED',
        step: 1
      };

      // 模拟无下一个节点
      const mockNavigator = new MockGraphNavigator();
      mockNavigator.getNextNode.mockReturnValue({
        hasMultiplePaths: false,
        nextNodeId: null
      });
      threadContext.getNavigator = jest.fn().mockReturnValue(mockNavigator);
      threadContext.setCurrentNodeId = jest.fn();

      (executor as any).routeToNextNode(threadContext, currentNode, nodeResult);

      expect(threadContext.setCurrentNodeId).not.toHaveBeenCalled();
    });
  });

  describe('触发子工作流功能', () => {
    it('应该正确添加触发子工作流任务到队列', () => {
      const task = {
        subgraphId: 'subgraph-1',
        input: { test: 'value' },
        config: { waitForCompletion: false }
      };

      executor.executeTriggeredSubgraph(task as any);

      expect(executor.hasPendingTriggeredSubgraphs()).toBe(true);
      expect(executor.getPendingTriggeredSubgraphCount()).toBe(1);
    });

    it('应该正确检查是否有待处理的触发子工作流任务', () => {
      expect(executor.hasPendingTriggeredSubgraphs()).toBe(false);

      const task = {
        subgraphId: 'subgraph-1',
        input: { test: 'value' },
        config: { waitForCompletion: false }
      };

      executor.executeTriggeredSubgraph(task as any);

      expect(executor.hasPendingTriggeredSubgraphs()).toBe(true);
    });

    it('应该正确获取待处理触发子工作流任务数量', () => {
      expect(executor.getPendingTriggeredSubgraphCount()).toBe(0);

      const task1 = { subgraphId: 'subgraph-1', input: {}, config: {} };
      const task2 = { subgraphId: 'subgraph-2', input: {}, config: {} };

      executor.executeTriggeredSubgraph(task1 as any);
      executor.executeTriggeredSubgraph(task2 as any);

      expect(executor.getPendingTriggeredSubgraphCount()).toBe(2);
    });

    it('应该正确检查是否正在执行触发子工作流', () => {
      expect(executor.isExecutingTriggeredSubgraphNow()).toBe(false);

      // 模拟正在执行
      (executor as any).isExecutingTriggeredSubgraph = true;

      expect(executor.isExecutingTriggeredSubgraphNow()).toBe(true);
    });
  });

  describe('buildSubgraphContext', () => {
    it('应该正确构建子工作流上下文', async () => {
      const subgraphId = 'subgraph-1';
      const input = { testInput: 'value' };
      const metadata = { customField: 'value' };

      const mockSubgraphContext = {
        thread: {}
      };

      threadBuilder.build.mockResolvedValue(mockSubgraphContext);

      const result = await executor.buildSubgraphContext(subgraphId, input, metadata);

      expect(threadBuilder.build).toHaveBeenCalledWith(subgraphId, { input });
      expect(result).toBe(mockSubgraphContext);
    });
  });

  describe('getEventManager', () => {
    it('应该正确返回事件管理器', () => {
      const result = executor.getEventManager();
      expect(result).toBe(eventManager);
    });
  });
});

// 辅助函数：创建模拟的 ThreadContext
export function createMockThreadContext(): ThreadContext {
  const mockThread = {
    id: 'test-thread',
    workflowId: 'test-workflow',
    workflowVersion: '1.0.0',
    status: ThreadStatus.CREATED,
    currentNodeId: 'start',
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
    shouldPause: false,
    shouldStop: false
  };

  const mockConversationManager = {
    clone: jest.fn().mockReturnThis()
  };

  const mockNavigator = new MockGraphNavigator();
  mockNavigator.getGraph().getNode.mockImplementation((nodeId: string) => ({
    originalNode: {
      id: nodeId,
      type: nodeId === 'end' ? NodeType.END : NodeType.START,
      name: `${nodeId} Node`,
      config: {},
      outgoingEdgeIds: [],
      incomingEdgeIds: []
    }
  }));

  mockNavigator.getNextNode.mockReturnValue({
    hasMultiplePaths: false,
    nextNodeId: 'end'
  });

  return {
    thread: mockThread,
    conversationManager: mockConversationManager as any,
    getNavigator: jest.fn().mockReturnValue(mockNavigator),
    getThreadId: () => mockThread.id,
    getWorkflowId: () => mockThread.workflowId,
    getStatus: () => mockThread.status,
    setStatus: jest.fn((status: any) => { mockThread.status = status; }),
    getCurrentNodeId: () => mockThread.currentNodeId,
    setCurrentNodeId: jest.fn((nodeId: string) => { mockThread.currentNodeId = nodeId; }),
    getStartTime: () => mockThread.startTime,
    getOutput: () => mockThread.output,
    getNodeResults: () => mockThread.nodeResults,
    getErrors: () => mockThread.errors,
    addError: jest.fn((error: any) => { (mockThread.errors as any[]).push(error); }),
    initializeVariables: jest.fn(),
    getShouldPause: () => mockThread.shouldPause,
    getShouldStop: () => mockThread.shouldStop
  } as any;
}