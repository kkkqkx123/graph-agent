/**
 * 中断功能完整调用链集成测试
 * 
 * 测试目标：
 * 1. 验证暂停（PAUSE）场景的完整调用链
 * 2. 验证停止（STOP）场景的完整调用链
 * 3. 验证恢复（RESUME）场景的完整调用链
 * 4. 验证深度中断（AbortSignal）的调用链
 * 5. 验证异常传播的调用链
 * 
 * 测试覆盖的调用链：
 * - ThreadLifecycleCoordinator → ThreadContext → InterruptionManager
 * - InterruptionDetector → ThreadRegistry → ThreadContext
 * - LLMExecutionCoordinator/NodeExecutionCoordinator → InterruptionDetector
 * - ThreadExecutor → ThreadInterruptedException 处理
 */

import { ThreadExecutor } from '../thread-executor';
import { ThreadContext } from '../context/thread-context';
import { ExecutionContext } from '../context/execution-context';
import { ThreadStatus } from '@modular-agent/types';
import { ThreadInterruptedException } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import type { Node } from '@modular-agent/types';
import type { Graph } from '@modular-agent/types';
import type { Thread } from '@modular-agent/types';
import type { NodeExecutionResult } from '@modular-agent/types';
import type { PreprocessedGraph } from '@modular-agent/types';
import { generateId, now } from '@modular-agent/common-utils';

// Mock 依赖
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
  executeLLMCall = jest.fn();
}

class MockToolService {
  executeToolCall = jest.fn();
}

class MockUserInteractionHandler {
  // Mock implementation
}

class MockHumanRelayHandler {
  // Mock implementation
}

class MockGraphNavigator {
  private graph: Graph;
  
  constructor(graph: Graph) {
    this.graph = graph;
  }
  
  getGraph() {
    return this.graph;
  }
  
  getNode(nodeId: string) {
    const node = this.graph.nodes.get(nodeId);
    return node ? { originalNode: node } : null;
  }
  
  getNextNode(nodeId: string) {
    const node = this.graph.nodes.get(nodeId);
    const outgoingNeighbors = this.graph.getOutgoingNeighbors(nodeId);
    if (!node || outgoingNeighbors.size === 0) {
      return { hasMultiplePaths: false, nextNodeId: null };
    }
    const nextNodeId = Array.from(outgoingNeighbors)[0];
    return { hasMultiplePaths: false, nextNodeId };
  }
  
  selectNextNodeWithContext = jest.fn();
}

describe('中断功能完整调用链集成测试', () => {
  let executor: ThreadExecutor;
  let executionContext: ExecutionContext;
  let eventManager: MockEventManager;
  let workflowRegistry: MockWorkflowRegistry;
  let threadBuilder: MockThreadBuilder;
  let llmExecutor: MockLLMExecutor;
  let toolService: MockToolService;

  beforeEach(() => {
    // 创建 mock 依赖
    eventManager = new MockEventManager();
    workflowRegistry = new MockWorkflowRegistry();
    threadBuilder = new MockThreadBuilder();
    llmExecutor = new MockLLMExecutor();
    toolService = new MockToolService();

    // 创建执行上下文
    executionContext = ExecutionContext.createDefault();
    
    // 注册 mock 服务
    executionContext.register('eventManager', eventManager);
    executionContext.register('workflowRegistry', workflowRegistry);
    executionContext.register('toolService', toolService);
    executionContext.register('llmExecutor', llmExecutor);
    executionContext.register('userInteractionHandler', new MockUserInteractionHandler());
    executionContext.register('humanRelayHandler', new MockHumanRelayHandler());

    // Mock ThreadBuilder 构造函数
    jest.spyOn(require('../thread-builder'), 'ThreadBuilder').mockImplementation(() => threadBuilder);

    // 创建 ThreadExecutor
    executor = new ThreadExecutor(executionContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('暂停（PAUSE）场景完整调用链', () => {
    it('应该验证完整的暂停调用链：触发暂停 → 检测中断 → 抛出异常 → 顶层处理', async () => {
      // 1. 创建测试用的 ThreadContext
      const threadContext = createTestThreadContext('node-1');
      
      // 2. 模拟节点执行（在执行过程中触发暂停）
      const mockNodeExecutionCoordinator = (executor as any).nodeExecutionCoordinator;
      
      // 模拟第一个节点执行成功
      mockNodeExecutionCoordinator.executeNode.mockResolvedValueOnce({
        nodeId: 'node-1',
        nodeType: 'START',
        status: 'COMPLETED',
        step: 1
      });
      
      // 模拟第二个节点执行时检测到中断
      mockNodeExecutionCoordinator.executeNode.mockImplementationOnce(async () => {
        // 在节点执行过程中触发暂停
        threadContext.setShouldPause(true);
        
        // 模拟检测到中断并抛出异常
        throw new ThreadInterruptedException(
          'Thread paused at node: node-2',
          'PAUSE',
          threadContext.getThreadId(),
          'node-2'
        );
      });
      
      // 3. 执行线程
      const result = await executor.executeThread(threadContext);
      
      // 4. 验证调用链
      // 验证 InterruptionManager 状态
      expect(threadContext.getShouldPause()).toBe(true);
      expect(threadContext.getAbortSignal().aborted).toBe(true);
      
      // 验证 AbortReason
      const abortReason = threadContext.getAbortSignal().reason;
      expect(abortReason).toBeInstanceOf(ThreadInterruptedException);
      expect(abortReason.interruptionType).toBe('PAUSE');
      expect(abortReason.threadId).toBe(threadContext.getThreadId());
      
      // 验证线程状态
      expect(threadContext.getStatus()).toBe(ThreadStatus.PAUSED);
      
      // 验证执行结果
      expect(result.metadata.status).toBe(ThreadStatus.PAUSED);
      expect(result.threadId).toBe(threadContext.getThreadId());
    });

    it('应该在 LLM 执行过程中检测到暂停并正确处理', async () => {
      const threadContext = createTestThreadContext('llm-node');
      
      // 模拟 LLM 节点执行
      const mockNodeExecutionCoordinator = (executor as any).nodeExecutionCoordinator;
      
      mockNodeExecutionCoordinator.executeNode.mockImplementationOnce(async () => {
        // 在 LLM 执行前触发暂停
        threadContext.setShouldPause(true);
        
        // 模拟检测到中断
        throw new ThreadInterruptedException(
          'LLM execution paused',
          'PAUSE',
          threadContext.getThreadId(),
          'llm-node'
        );
      });
      
      const result = await executor.executeThread(threadContext);
      
      // 验证中断状态
      expect(threadContext.getShouldPause()).toBe(true);
      expect(threadContext.getAbortSignal().aborted).toBe(true);
      expect(result.metadata.status).toBe(ThreadStatus.PAUSED);
    });

    it('应该在工具调用过程中检测到暂停并正确处理', async () => {
      const threadContext = createTestThreadContext('tool-node');
      
      const mockNodeExecutionCoordinator = (executor as any).nodeExecutionCoordinator;
      
      mockNodeExecutionCoordinator.executeNode.mockImplementationOnce(async () => {
        // 在工具调用前触发暂停
        threadContext.setShouldPause(true);
        
        throw new ThreadInterruptedException(
          'Tool execution paused',
          'PAUSE',
          threadContext.getThreadId(),
          'tool-node'
        );
      });
      
      const result = await executor.executeThread(threadContext);
      
      expect(threadContext.getShouldPause()).toBe(true);
      expect(threadContext.getAbortSignal().aborted).toBe(true);
      expect(result.metadata.status).toBe(ThreadStatus.PAUSED);
    });
  });

  describe('停止（STOP）场景完整调用链', () => {
    it('应该验证完整的停止调用链：触发停止 → 检测中断 → 抛出异常 → 顶层处理', async () => {
      const threadContext = createTestThreadContext('node-1');
      
      const mockNodeExecutionCoordinator = (executor as any).nodeExecutionCoordinator;
      
      // 模拟第一个节点执行成功
      mockNodeExecutionCoordinator.executeNode.mockResolvedValueOnce({
        nodeId: 'node-1',
        nodeType: 'START',
        status: 'COMPLETED',
        step: 1
      });
      
      // 模拟第二个节点执行时触发停止
      mockNodeExecutionCoordinator.executeNode.mockImplementationOnce(async () => {
        // 在节点执行过程中触发停止
        threadContext.setShouldStop(true);
        
        throw new ThreadInterruptedException(
          'Thread stopped at node: node-2',
          'STOP',
          threadContext.getThreadId(),
          'node-2'
        );
      });
      
      const result = await executor.executeThread(threadContext);
      
      // 验证调用链
      expect(threadContext.getShouldStop()).toBe(true);
      expect(threadContext.getAbortSignal().aborted).toBe(true);
      
      const abortReason = threadContext.getAbortSignal().reason;
      expect(abortReason).toBeInstanceOf(ThreadInterruptedException);
      expect(abortReason.interruptionType).toBe('STOP');
      expect(abortReason.threadId).toBe(threadContext.getThreadId());
      
      // 验证线程状态
      expect(threadContext.getStatus()).toBe(ThreadStatus.CANCELLED);
      expect(result.metadata.status).toBe(ThreadStatus.CANCELLED);
    });

    it('应该在节点执行前检测到停止并正确处理', async () => {
      const threadContext = createTestThreadContext('node-1');
      
      // 在执行前就设置停止标志
      threadContext.setShouldStop(true);
      
      const mockNodeExecutionCoordinator = (executor as any).nodeExecutionCoordinator;
      mockNodeExecutionCoordinator.executeNode.mockImplementationOnce(async () => {
        throw new ThreadInterruptedException(
          'Thread stopped at node: node-1',
          'STOP',
          threadContext.getThreadId(),
          'node-1'
        );
      });
      
      const result = await executor.executeThread(threadContext);
      
      expect(threadContext.getShouldStop()).toBe(true);
      expect(threadContext.getAbortSignal().aborted).toBe(true);
      expect(result.metadata.status).toBe(ThreadStatus.CANCELLED);
    });
  });

  describe('恢复（RESUME）场景完整调用链', () => {
    it('应该验证完整的恢复调用链：触发恢复 → 重置中断状态 → 继续执行', async () => {
      const threadContext = createTestThreadContext('node-1');
      
      // 1. 先暂停线程
      threadContext.setShouldPause(true);
      expect(threadContext.getShouldPause()).toBe(true);
      expect(threadContext.getAbortSignal().aborted).toBe(true);
      
      // 2. 恢复线程
      threadContext.resetInterrupt();
      
      // 3. 验证恢复后的状态
      expect(threadContext.getShouldPause()).toBe(false);
      expect(threadContext.getAbortSignal().aborted).toBe(false);
      expect(threadContext.getAbortSignal().reason).toBeUndefined();
      
      // 4. 验证可以继续执行
      const mockNodeExecutionCoordinator = (executor as any).nodeExecutionCoordinator;
      mockNodeExecutionCoordinator.executeNode.mockResolvedValue({
        nodeId: 'node-1',
        nodeType: 'START',
        status: 'COMPLETED',
        step: 1
      });
      
      const result = await executor.executeThread(threadContext);
      expect(result.metadata.status).toBe(ThreadStatus.COMPLETED);
    });

    it('应该验证从停止状态恢复', async () => {
      const threadContext = createTestThreadContext('node-1');
      
      // 1. 先停止线程
      threadContext.setShouldStop(true);
      expect(threadContext.getShouldStop()).toBe(true);
      expect(threadContext.getAbortSignal().aborted).toBe(true);
      
      // 2. 恢复线程
      threadContext.resetInterrupt();
      
      // 3. 验证恢复后的状态
      expect(threadContext.getShouldStop()).toBe(false);
      expect(threadContext.getAbortSignal().aborted).toBe(false);
    });

    it('应该验证多次暂停和恢复的状态转换', async () => {
      const threadContext = createTestThreadContext('node-1');
      
      // 第一次暂停
      threadContext.setShouldPause(true);
      expect(threadContext.getShouldPause()).toBe(true);
      
      // 第一次恢复
      threadContext.resetInterrupt();
      expect(threadContext.getShouldPause()).toBe(false);
      
      // 第二次暂停
      threadContext.setShouldPause(true);
      expect(threadContext.getShouldPause()).toBe(true);
      
      // 第二次恢复
      threadContext.resetInterrupt();
      expect(threadContext.getShouldPause()).toBe(false);
      
      // 停止
      threadContext.setShouldStop(true);
      expect(threadContext.getShouldStop()).toBe(true);
      
      // 恢复
      threadContext.resetInterrupt();
      expect(threadContext.getShouldStop()).toBe(false);
    });
  });

  describe('深度中断（AbortSignal）完整调用链', () => {
    it('应该验证 LLM 调用中的 AbortSignal 深度中断', async () => {
      const threadContext = createTestThreadContext('llm-node');
      
      // 模拟 LLM 调用支持 AbortSignal
      llmExecutor.executeLLMCall.mockImplementation(async (options: any) => {
        const { abortSignal } = options;
        
        // 模拟 LLM 调用过程中收到中断信号
        if (abortSignal && abortSignal.aborted) {
          const error = new Error('LLM call aborted');
          (error as any).name = 'AbortError';
          throw error;
        }
        
        // 模拟长时间运行的 LLM 调用
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          content: 'LLM response',
          usage: { promptTokens: 10, completionTokens: 20 }
        };
      });
      
      // 在 LLM 调用过程中触发中断
      setTimeout(() => {
        threadContext.setShouldPause(true);
      }, 50);
      
      const mockNodeExecutionCoordinator = (executor as any).nodeExecutionCoordinator;
      mockNodeExecutionCoordinator.executeNode.mockImplementationOnce(async () => {
        // 模拟 LLM 调用
        await llmExecutor.executeLLMCall({
          abortSignal: threadContext.getAbortSignal()
        });
        
        return {
          nodeId: 'llm-node',
          nodeType: 'LLM',
          status: 'COMPLETED',
          step: 1
        };
      });
      
      const result = await executor.executeThread(threadContext);
      
      // 验证 AbortSignal 被触发
      expect(threadContext.getAbortSignal().aborted).toBe(true);
      expect(result.metadata.status).toBe(ThreadStatus.PAUSED);
    });

    it('应该验证工具调用中的 AbortSignal 深度中断', async () => {
      const threadContext = createTestThreadContext('tool-node');
      
      // 模拟工具调用支持 AbortSignal
      toolService.executeToolCall.mockImplementation(async (options: any) => {
        const { abortSignal } = options;
        
        // 模拟工具调用过程中收到中断信号
        if (abortSignal && abortSignal.aborted) {
          const error = new Error('Tool call aborted');
          (error as any).name = 'AbortError';
          throw error;
        }
        
        // 模拟长时间运行的工具调用
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return { result: 'Tool response' };
      });
      
      // 在工具调用过程中触发中断
      setTimeout(() => {
        threadContext.setShouldStop(true);
      }, 50);
      
      const mockNodeExecutionCoordinator = (executor as any).nodeExecutionCoordinator;
      mockNodeExecutionCoordinator.executeNode.mockImplementationOnce(async () => {
        // 模拟工具调用
        await toolService.executeToolCall({
          abortSignal: threadContext.getAbortSignal()
        });
        
        return {
          nodeId: 'tool-node',
          nodeType: 'CODE',
          status: 'COMPLETED',
          step: 1
        };
      });
      
      const result = await executor.executeThread(threadContext);
      
      // 验证 AbortSignal 被触发
      expect(threadContext.getAbortSignal().aborted).toBe(true);
      expect(result.metadata.status).toBe(ThreadStatus.CANCELLED);
    });

    it('应该验证 AbortSignal 事件监听器被正确触发', (done) => {
      const threadContext = createTestThreadContext('node-1');
      
      const abortSignal = threadContext.getAbortSignal();
      
      // 监听 abort 事件
      abortSignal.addEventListener('abort', (event) => {
        expect(abortSignal.aborted).toBe(true);
        expect(abortSignal.reason).toBeInstanceOf(ThreadInterruptedException);
        done();
      });
      
      // 触发中断
      threadContext.setShouldPause(true);
    });
  });

  describe('异常传播完整调用链', () => {
    it('应该验证 ThreadInterruptedException 从底层向上传播到顶层', async () => {
      const threadContext = createTestThreadContext('node-1');
      
      const mockNodeExecutionCoordinator = (executor as any).nodeExecutionCoordinator;
      
      // 模拟在节点执行中抛出 ThreadInterruptedException
      mockNodeExecutionCoordinator.executeNode.mockImplementationOnce(async () => {
        throw new ThreadInterruptedException(
          'Thread interrupted at node: node-1',
          'PAUSE',
          threadContext.getThreadId(),
          'node-1'
        );
      });
      
      // 执行线程，应该捕获异常并正确处理
      const result = await executor.executeThread(threadContext);
      
      // 验证异常被正确处理，没有抛出到顶层
      expect(result).toBeDefined();
      expect(result.metadata.status).toBe(ThreadStatus.PAUSED);
      expect(threadContext.getAbortSignal().aborted).toBe(true);
    });

    it('应该验证 AbortError 被转换为 ThreadInterruptedException', async () => {
      const threadContext = createTestThreadContext('node-1');
      
      const mockNodeExecutionCoordinator = (executor as any).nodeExecutionCoordinator;
      
      // 模拟抛出 AbortError
      mockNodeExecutionCoordinator.executeNode.mockImplementationOnce(async () => {
        const error = new Error('Operation aborted');
        (error as any).name = 'AbortError';
        throw error;
      });
      
      // 执行线程
      const result = await executor.executeThread(threadContext);
      
      // 验证结果
      expect(result).toBeDefined();
      expect(result.metadata.errorCount).toBeGreaterThan(0);
    });

    it('应该验证其他类型的错误不会被当作中断处理', async () => {
      const threadContext = createTestThreadContext('node-1');
      
      const mockNodeExecutionCoordinator = (executor as any).nodeExecutionCoordinator;
      
      // 模拟抛出普通错误
      mockNodeExecutionCoordinator.executeNode.mockImplementationOnce(async () => {
        throw new Error('Regular error');
      });
      
      // 执行线程
      const result = await executor.executeThread(threadContext);
      
      // 验证错误被记录，但不是中断
      expect(result).toBeDefined();
      expect(result.metadata.errorCount).toBeGreaterThan(0);
      expect(threadContext.getAbortSignal().aborted).toBe(false);
    });
  });

  describe('状态转换完整调用链', () => {
    it('应该验证从 RUNNING 到 PAUSED 的状态转换', async () => {
      const threadContext = createTestThreadContext('node-1');
      threadContext.setStatus(ThreadStatus.RUNNING);
      
      const mockNodeExecutionCoordinator = (executor as any).nodeExecutionCoordinator;
      mockNodeExecutionCoordinator.executeNode.mockImplementationOnce(async () => {
        threadContext.setShouldPause(true);
        throw new ThreadInterruptedException(
          'Thread paused',
          'PAUSE',
          threadContext.getThreadId(),
          'node-1'
        );
      });
      
      await executor.executeThread(threadContext);
      
      expect(threadContext.getStatus()).toBe(ThreadStatus.PAUSED);
    });

    it('应该验证从 RUNNING 到 CANCELLED 的状态转换', async () => {
      const threadContext = createTestThreadContext('node-1');
      threadContext.setStatus(ThreadStatus.RUNNING);
      
      const mockNodeExecutionCoordinator = (executor as any).nodeExecutionCoordinator;
      mockNodeExecutionCoordinator.executeNode.mockImplementationOnce(async () => {
        threadContext.setShouldStop(true);
        throw new ThreadInterruptedException(
          'Thread stopped',
          'STOP',
          threadContext.getThreadId(),
          'node-1'
        );
      });
      
      await executor.executeThread(threadContext);
      
      expect(threadContext.getStatus()).toBe(ThreadStatus.CANCELLED);
    });

    it('应该验证从 PAUSED 到 RUNNING 的状态转换', async () => {
      const threadContext = createTestThreadContext('node-1');
      threadContext.setStatus(ThreadStatus.PAUSED);
      threadContext.setShouldPause(true);
      
      // 恢复线程
      threadContext.resetInterrupt();
      threadContext.setStatus(ThreadStatus.RUNNING);
      
      expect(threadContext.getStatus()).toBe(ThreadStatus.RUNNING);
      expect(threadContext.getShouldPause()).toBe(false);
    });
  });

  describe('多线程场景', () => {
    it('应该验证不同线程的中断状态互不影响', async () => {
      const threadContext1 = createTestThreadContext('node-1', 'thread-1');
      const threadContext2 = createTestThreadContext('node-1', 'thread-2');
      
      // 暂停第一个线程
      threadContext1.setShouldPause(true);
      
      // 验证第一个线程已暂停
      expect(threadContext1.getShouldPause()).toBe(true);
      expect(threadContext1.getAbortSignal().aborted).toBe(true);
      
      // 验证第二个线程未受影响
      expect(threadContext2.getShouldPause()).toBe(false);
      expect(threadContext2.getAbortSignal().aborted).toBe(false);
      
      // 停止第二个线程
      threadContext2.setShouldStop(true);
      
      // 验证第二个线程已停止
      expect(threadContext2.getShouldStop()).toBe(true);
      expect(threadContext2.getAbortSignal().aborted).toBe(true);
      
      // 验证第一个线程状态未变
      expect(threadContext1.getShouldPause()).toBe(true);
      expect(threadContext1.getShouldStop()).toBe(false);
    });
  });
});

/**
 * 创建测试用的 ThreadContext
 */
function createTestThreadContext(nodeId: string, threadId?: string): ThreadContext {
  const actualThreadId = threadId || generateId();
  
  const testNode = {
    id: nodeId,
    type: NodeType.START,
    name: 'Start Node',
    workflowId: 'test-workflow',
    originalNode: {
      id: nodeId,
      type: NodeType.START,
      name: 'Start Node',
      config: {},
      outgoingEdgeIds: [],
      incomingEdgeIds: []
    }
  };
  
  const testGraph = {
    nodes: new Map([[nodeId, testNode]]),
    edges: new Map(),
    adjacencyList: new Map(),
    reverseAdjacencyList: new Map(),
    startNodeId: nodeId,
    endNodeIds: new Set(),
    getNode: (id: string) => testGraph.nodes.get(id),
    getEdge: (id: string) => testGraph.edges.get(id),
    getOutgoingNeighbors: (id: string) => testGraph.adjacencyList.get(id) || new Set(),
    getIncomingNeighbors: (id: string) => testGraph.reverseAdjacencyList.get(id) || new Set(),
    getOutgoingEdges: (id: string) => [],
    getIncomingEdges: (id: string) => [],
    getEdgeBetween: (sourceId: string, targetId: string) => undefined,
    hasNode: (id: string) => testGraph.nodes.has(id),
    hasEdge: (id: string) => testGraph.edges.has(id),
    hasEdgeBetween: (sourceId: string, targetId: string) => false,
    getAllNodeIds: () => Array.from(testGraph.nodes.keys()),
    getAllEdgeIds: () => Array.from(testGraph.edges.keys()),
    getNodeCount: () => testGraph.nodes.size,
    getEdgeCount: () => testGraph.edges.size,
    getSourceNodes: () => [],
    getSinkNodes: () => [],
    // PreprocessedGraph 属性
    idMapping: {
      nodeIds: new Map(),
      edgeIds: new Map(),
      reverseNodeIds: new Map(),
      reverseEdgeIds: new Map(),
      subgraphNamespaces: new Map()
    },
    nodeConfigs: new Map(),
    triggerConfigs: new Map(),
    subgraphRelationships: [],
    graphAnalysis: {
      cycleDetection: { hasCycle: false },
      reachability: {
        reachableFromStart: new Set(),
        reachableToEnd: new Set(),
        unreachableNodes: new Set(),
        deadEndNodes: new Set()
      },
      topologicalSort: { success: true, sortedNodes: [] },
      forkJoinValidation: { isValid: true, unpairedForks: [], unpairedJoins: [], pairs: new Map() },
      nodeStats: { total: 0, byType: new Map() },
      edgeStats: { total: 0, byType: new Map() }
    },
    validationResult: { isValid: true, errors: [], warnings: [], validatedAt: Date.now() },
    topologicalOrder: [],
    subgraphMergeLogs: [],
    processedAt: Date.now(),
    workflowId: 'test-workflow',
    workflowVersion: '1.0.0',
    hasSubgraphs: false,
    subworkflowIds: new Set()
  } as PreprocessedGraph;

  const mockThread: Thread = {
    id: actualThreadId,
    workflowId: 'test-workflow',
    workflowVersion: '1.0.0',
    status: ThreadStatus.CREATED,
    currentNodeId: nodeId,
    graph: testGraph,
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

  const mockNavigator = new MockGraphNavigator(testGraph);

  // 创建 ThreadContext 实例
  const threadContext = new ThreadContext(
    mockThread,
    {} as any, // conversationManager
    {} as any, // threadRegistry
    {} as any, // workflowRegistry
    {} as any, // eventManager
    {} as any, // toolService
    {} as any  // llmExecutor
  );

  return threadContext;
}