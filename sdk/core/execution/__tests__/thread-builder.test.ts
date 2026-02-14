/**
 * ThreadBuilder 单元测试
 */

import { ThreadBuilder } from '../thread-builder';
import { ThreadContext } from '../context/thread-context';
import { ExecutionContext } from '../context/execution-context';
import { ValidationError } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import { PreprocessedGraphData } from '../../entities/preprocessed-graph-data';
import { GraphData } from '../../entities/graph-data';
import type { ThreadOptions } from '@modular-agent/types';

// Mock 依赖
class MockWorkflowRegistry {
  private workflows = new Map<string, any>();
  private processedWorkflows = new Map<string, any>();

  get(workflowId: string): any {
    return this.workflows.get(workflowId);
  }

  getProcessed(workflowId: string): any {
    return this.processedWorkflows.get(workflowId);
  }

  preprocessAndStore(workflow: any): Promise<any> {
    const processed = {
      ...workflow,
      processedAt: new Date().toISOString(),
      hasSubgraphs: false,
      graphAnalysis: {},
      validationResult: { isValid: true },
      subgraphMergeLogs: [],
      topologicalOrder: []
    };
    this.processedWorkflows.set(workflow.id, processed);
    return Promise.resolve(processed);
  }

  async ensureProcessed(workflowId: string): Promise<any> {
    const processed = this.processedWorkflows.get(workflowId);
    if (processed) {
      return Promise.resolve(processed);
    }
    
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      const { ValidationError } = require('../../../types/errors');
      throw new ValidationError(
        `Workflow with ID '${workflowId}' not found`,
        'workflowId'
      );
    }
    
    const result = await this.preprocessAndStore(workflow);
    if (!result) {
      const { ValidationError } = require('../../../types/errors');
      throw new ValidationError(
        `Failed to preprocess workflow with ID '${workflowId}'`,
        'workflowId'
      );
    }
    return result;
  }

  addWorkflow(workflow: any): void {
    this.workflows.set(workflow.id, workflow);
  }

  addProcessedWorkflow(workflow: any): void {
    this.processedWorkflows.set(workflow.id, workflow);
  }
}

class MockThreadRegistry {
  private threads = new Map<string, any>();

  get(threadId: string): any {
    return this.threads.get(threadId);
  }

  addThread(thread: any): void {
    this.threads.set(thread.id, thread);
  }
}

class MockEventManager {
  emit(event: string, data: any): void {
    // Mock implementation
  }
}

class MockToolService {
  // Mock implementation
}

class MockLLMExecutor {
  // Mock implementation
}

describe('ThreadBuilder', () => {
  let builder: ThreadBuilder;
  let workflowRegistry: MockWorkflowRegistry;
  let threadRegistry: MockThreadRegistry;
  let eventManager: MockEventManager;
  let toolService: MockToolService;
  let llmExecutor: MockLLMExecutor;
  let executionContext: ExecutionContext;

  beforeEach(() => {
    workflowRegistry = new MockWorkflowRegistry();
    threadRegistry = new MockThreadRegistry();
    eventManager = new MockEventManager();
    toolService = new MockToolService();
    llmExecutor = new MockLLMExecutor();

    // 创建执行上下文
    executionContext = ExecutionContext.createDefault();

    // 注册 mock 服务到执行上下文
    executionContext.register('workflowRegistry', workflowRegistry);
    executionContext.register('threadRegistry', threadRegistry);
    executionContext.register('eventManager', eventManager);
    executionContext.register('toolService', toolService);
    executionContext.register('llmExecutor', llmExecutor);

    builder = new ThreadBuilder(workflowRegistry as any, executionContext);
  });

  describe('build', () => {
    it('应该从工作流ID成功构建ThreadContext', async () => {
      // 准备测试数据
      const workflowId = 'test-workflow';
      // 工作流定义
      const workflow = {
        id: workflowId,
        version: '1.0.0',
        name: 'Test Workflow',
        description: 'Test workflow for unit testing',
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            name: 'Start Node',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: []
          },
          {
            id: 'end',
            type: NodeType.END,
            name: 'End Node',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: []
          }
        ],
        edges: [],
        variables: [],
        triggers: [],
        config: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
        availableTools: { initial: new Set<string>() }
      };

      // 创建图数据
      const graph = new GraphData();
      graph.startNodeId = 'start';
      graph.endNodeIds.add('end');
      graph.addNode({
        id: 'start',
        type: NodeType.START,
        name: 'Start Node',
        workflowId: workflowId,
        originalNode: workflow.nodes[0]
      });
      graph.addNode({
        id: 'end',
        type: NodeType.END,
        name: 'End Node',
        workflowId: workflowId,
        originalNode: workflow.nodes[1]
      });

      // 创建PreprocessedGraph
      const processedWorkflow = new PreprocessedGraphData();
      processedWorkflow.nodes = graph.nodes;
      processedWorkflow.edges = graph.edges;
      processedWorkflow.adjacencyList = graph.adjacencyList;
      processedWorkflow.reverseAdjacencyList = graph.reverseAdjacencyList;
      processedWorkflow.startNodeId = 'start';
      processedWorkflow.endNodeIds.add('end');
      processedWorkflow.workflowId = workflowId;
      processedWorkflow.workflowVersion = workflow.version;
      processedWorkflow.triggers = workflow.triggers;
      processedWorkflow.variables = workflow.variables;
      processedWorkflow.hasSubgraphs = false;
      processedWorkflow.subworkflowIds = new Set<string>();
      processedWorkflow.processedAt = Date.now();
      processedWorkflow.graphAnalysis = {
        cycleDetection: { hasCycle: false, cycleNodes: [], cycleEdges: [] },
        reachability: {
          reachableFromStart: new Set<string>(['start', 'end']),
          reachableToEnd: new Set<string>(['start', 'end']),
          unreachableNodes: new Set<string>(),
          deadEndNodes: new Set<string>()
        },
        topologicalSort: { success: true, sortedNodes: ['start', 'end'] },
        forkJoinValidation: {
          isValid: true,
          unpairedForks: [],
          unpairedJoins: [],
          pairs: new Map()
        },
        nodeStats: { total: 2, byType: new Map() },
        edgeStats: { total: 0, byType: new Map() }
      };
      processedWorkflow.validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        validatedAt: Date.now()
      };
      processedWorkflow.subgraphMergeLogs = [];
      processedWorkflow.topologicalOrder = ['start', 'end'];

      workflowRegistry.addProcessedWorkflow(processedWorkflow);

      const options: ThreadOptions = {
        input: { testInput: 'value' }
      };

      // 执行测试
      const threadContext = await builder.build(workflowId, options);

      // 验证结果
      expect(threadContext).toBeInstanceOf(ThreadContext);
      expect(threadContext.getWorkflowId()).toBe(workflowId);
      expect(threadContext.getThreadId()).toBeDefined();
      expect(threadContext.getStatus()).toBe('CREATED');
      expect(threadContext.getCurrentNodeId()).toBe('start');
    });

    it('应该在工作流不存在时抛出ValidationError', async () => {
      const workflowId = 'non-existent-workflow';

      await expect(builder.build(workflowId)).rejects.toThrow(ValidationError);
      await expect(builder.build(workflowId)).rejects.toThrow(
        `Workflow with ID '${workflowId}' not found`
      );
    });

    it('应该在工作流预处理失败时抛出ValidationError', async () => {
      const workflowId = 'test-workflow';
      const workflow = {
        id: workflowId,
        name: 'Test Workflow',
        nodes: [],
        edges: []
      };

      workflowRegistry.addWorkflow(workflow);

      // Mock preprocessAndStore 返回 null
      workflowRegistry.preprocessAndStore = jest.fn().mockResolvedValue(null);

      await expect(builder.build(workflowId)).rejects.toThrow(ValidationError);
      await expect(builder.build(workflowId)).rejects.toThrow(
        `Failed to preprocess workflow with ID '${workflowId}'`
      );
    });

    it('应该在没有START节点时抛出ValidationError', async () => {
      const workflowId = 'test-workflow';
      const workflow = {
        id: workflowId,
        version: '1.0.0',
        name: 'Test Workflow',
        description: 'Test workflow for unit testing',
        nodes: [
          {
            id: 'end',
            type: NodeType.END,
            name: 'End Node',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: []
          }
        ],
        edges: [],
        variables: [],
        triggers: [],
        config: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
        availableTools: { initial: new Set<string>() }
      };
      // 创建PreprocessedGraph
      const processedWorkflow = new PreprocessedGraphData();
      processedWorkflow.nodes = new Map();
      processedWorkflow.edges = new Map();
      processedWorkflow.adjacencyList = new Map();
      processedWorkflow.reverseAdjacencyList = new Map();
      processedWorkflow.endNodeIds.add('end');
      processedWorkflow.workflowId = workflowId;
      processedWorkflow.workflowVersion = workflow.version;
      processedWorkflow.triggers = workflow.triggers;
      processedWorkflow.variables = workflow.variables;
      processedWorkflow.hasSubgraphs = false;
      processedWorkflow.subworkflowIds = new Set<string>();
      processedWorkflow.processedAt = Date.now();
      processedWorkflow.graphAnalysis = {
        cycleDetection: { hasCycle: false, cycleNodes: [], cycleEdges: [] },
        reachability: {
          reachableFromStart: new Set<string>(['end']),
          reachableToEnd: new Set<string>(['end']),
          unreachableNodes: new Set<string>(),
          deadEndNodes: new Set<string>()
        },
        topologicalSort: { success: true, sortedNodes: ['end'] },
        forkJoinValidation: {
          isValid: true,
          unpairedForks: [],
          unpairedJoins: [],
          pairs: new Map()
        },
        nodeStats: { total: 1, byType: new Map() },
        edgeStats: { total: 0, byType: new Map() }
      };
      processedWorkflow.validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        validatedAt: Date.now()
      };
      processedWorkflow.subgraphMergeLogs = [];
      processedWorkflow.topologicalOrder = ['end'];

      workflowRegistry.addProcessedWorkflow(processedWorkflow);

      await expect(builder.build(workflowId)).rejects.toThrow(ValidationError);
      await expect(builder.build(workflowId)).rejects.toThrow(
        'Processed workflow must have a START node'
      );
    });

    it('应该在没有END节点时抛出ValidationError', async () => {
      const workflowId = 'test-workflow';
      // 工作流定义
      const workflow = {
        id: workflowId,
        version: '1.0.0',
        name: 'Test Workflow',
        description: 'Test workflow for unit testing',
        nodes: [
          {
            id: 'start',
            type: NodeType.START,
            name: 'Start Node',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: []
          }
        ],
        edges: [],
        variables: [],
        triggers: [],
        config: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
        availableTools: { initial: new Set<string>() }
      };

      // 创建图数据
      const graph = new GraphData();
      graph.startNodeId = 'start';
      graph.addNode({
        id: 'start',
        type: NodeType.START,
        name: 'Start Node',
        workflowId: workflowId,
        originalNode: workflow.nodes[0]
      });

      // 创建PreprocessedGraph
      const processedWorkflow = new PreprocessedGraphData();
      processedWorkflow.nodes = graph.nodes;
      processedWorkflow.edges = graph.edges;
      processedWorkflow.adjacencyList = graph.adjacencyList;
      processedWorkflow.reverseAdjacencyList = graph.reverseAdjacencyList;
      processedWorkflow.startNodeId = 'start';
      processedWorkflow.workflowId = workflowId;
      processedWorkflow.workflowVersion = workflow.version;
      processedWorkflow.triggers = workflow.triggers;
      processedWorkflow.variables = workflow.variables;
      processedWorkflow.hasSubgraphs = false;
      processedWorkflow.subworkflowIds = new Set<string>();
      processedWorkflow.processedAt = Date.now();
      processedWorkflow.graphAnalysis = {
        cycleDetection: { hasCycle: false, cycleNodes: [], cycleEdges: [] },
        reachability: {
          reachableFromStart: new Set<string>(['start']),
          reachableToEnd: new Set<string>(['start']),
          unreachableNodes: new Set<string>(),
          deadEndNodes: new Set<string>()
        },
        topologicalSort: { success: true, sortedNodes: ['start'] },
        forkJoinValidation: {
          isValid: true,
          unpairedForks: [],
          unpairedJoins: [],
          pairs: new Map()
        },
        nodeStats: { total: 1, byType: new Map() },
        edgeStats: { total: 0, byType: new Map() }
      };
      processedWorkflow.validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        validatedAt: Date.now()
      };
      processedWorkflow.subgraphMergeLogs = [];
      processedWorkflow.topologicalOrder = ['start'];

      workflowRegistry.addProcessedWorkflow(processedWorkflow);

      await expect(builder.build(workflowId)).rejects.toThrow(ValidationError);
      await expect(builder.build(workflowId)).rejects.toThrow(
        'Processed workflow must have an END node'
      );
    });

  });

  describe('buildFromTemplate', () => {
    it('应该从模板成功构建ThreadContext', async () => {
      // 创建模板
      const templateId = 'test-template';
      const mockThreadContext = {
        thread: {
          id: 'template-thread',
          workflowId: 'test-workflow',
          workflowVersion: '1.0.0',
          status: 'CREATED',
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
          startTime: new Date().toISOString(),
          errors: []
        },
        conversationManager: {
          clone: jest.fn().mockReturnValue({
            // Mock conversation manager
          })
        },
        getWorkflowId: () => 'test-workflow',
        getThreadId: () => 'template-thread',
        getStatus: () => 'CREATED',
        getCurrentNodeId: () => 'start',
        initializeVariables: jest.fn()
      } as any;

      // 添加模板到缓存
      (builder as any).threadTemplates.set(templateId, mockThreadContext);

      const options: ThreadOptions = {
        input: { testInput: 'value' }
      };

      // 执行测试
      const threadContext = await builder.buildFromTemplate(templateId, options);

      // 验证结果
      expect(threadContext).toBeInstanceOf(ThreadContext);
      expect(threadContext.getThreadId()).not.toBe('template-thread'); // 应该是新的ID
    });

    it('应该在模板不存在时抛出ValidationError', async () => {
      const templateId = 'non-existent-template';

      await expect(builder.buildFromTemplate(templateId)).rejects.toThrow(ValidationError);
      await expect(builder.buildFromTemplate(templateId)).rejects.toThrow(
        `Thread template not found: ${templateId}`
      );
    });
  });

  describe('createCopy', () => {
    it('应该成功创建ThreadContext副本', async () => {
      const sourceThreadContext = {
        thread: {
          id: 'source-thread',
          workflowId: 'test-workflow',
          workflowVersion: '1.0.0',
          status: 'CREATED',
          currentNodeId: 'start',
          variables: [
            { name: 'testVar', value: 'testValue', type: 'string', scope: 'thread', readonly: false }
          ],
          variableScopes: {
            global: { globalVar: 'globalValue' },
            thread: { threadVar: 'threadValue' },
            subgraph: [],
            loop: []
          },
          input: { originalInput: 'value' },
          output: {},
          nodeResults: [{ nodeId: 'start', status: 'COMPLETED' }],
          startTime: new Date().toISOString(),
          errors: []
        },
        conversationManager: {
          clone: jest.fn().mockReturnValue({
            // Mock conversation manager
          })
        },
        getWorkflowId: () => 'test-workflow',
        getThreadId: () => 'source-thread',
        getStatus: () => 'CREATED',
        getCurrentNodeId: () => 'start',
        initializeVariables: jest.fn()
      } as any;

      // 执行测试
      const copiedThreadContext = await builder.createCopy(sourceThreadContext);

      // 验证结果
      expect(copiedThreadContext).toBeInstanceOf(ThreadContext);
      expect(copiedThreadContext.getThreadId()).not.toBe('source-thread');
      expect(copiedThreadContext.getWorkflowId()).toBe('test-workflow');

      // 验证变量作用域复制
      const copiedThread = copiedThreadContext.thread;
      expect(copiedThread.variableScopes.global).toBe(sourceThreadContext.thread.variableScopes.global); // 引用共享
      expect(copiedThread.variableScopes.thread).not.toBe(sourceThreadContext.thread.variableScopes.thread); // 深拷贝
      expect(copiedThread.variableScopes.thread).toEqual(sourceThreadContext.thread.variableScopes.thread);
      expect(copiedThread.variableScopes.local).toEqual([]); // 清空
      expect(copiedThread.variableScopes.loop).toEqual([]); // 清空
    });
  });

  describe('createFork', () => {
    it('应该成功创建Fork子ThreadContext', async () => {
      const parentThreadContext = {
        thread: {
          id: 'parent-thread',
          workflowId: 'test-workflow',
          workflowVersion: '1.0.0',
          status: 'CREATED',
          currentNodeId: 'start',
          variables: [
            { name: 'globalVar', value: 'globalValue', type: 'string', scope: 'global', readonly: false },
            { name: 'threadVar', value: 'threadValue', type: 'string', scope: 'thread', readonly: false }
          ],
          variableScopes: {
            global: { globalVar: 'globalValue' },
            thread: { threadVar: 'threadValue' },
            subgraph: [],
            loop: []
          },
          input: { originalInput: 'value' },
          output: {},
          nodeResults: [],
          startTime: new Date().toISOString(),
          errors: []
        },
        conversationManager: {
          clone: jest.fn().mockReturnValue({
            // Mock conversation manager
          })
        },
        getWorkflowId: () => 'test-workflow',
        getThreadId: () => 'parent-thread',
        getStatus: () => 'CREATED',
        getCurrentNodeId: () => 'start',
        initializeVariables: jest.fn()
      } as any;

      const forkConfig = {
        forkId: 'test-fork',
        startNodeId: 'fork-start',
        forkPathId: 'test-path-1'
      };

      // 执行测试
      const forkThreadContext = await builder.createFork(parentThreadContext, forkConfig);

      // 验证结果
      expect(forkThreadContext).toBeInstanceOf(ThreadContext);
      expect(forkThreadContext.getThreadId()).not.toBe('parent-thread');
      expect(forkThreadContext.getWorkflowId()).toBe('test-workflow');
      expect(forkThreadContext.getCurrentNodeId()).toBe('fork-start');

      // 验证变量作用域分离
      const forkThread = forkThreadContext.thread;
      expect(forkThread.variableScopes.global).toBe(parentThreadContext.thread.variableScopes.global); // 引用共享
      expect(forkThread.variableScopes.thread).not.toBe(parentThreadContext.thread.variableScopes.thread); // 深拷贝
      expect(forkThread.variableScopes.thread).toEqual(parentThreadContext.thread.variableScopes.thread);
      expect(forkThread.variableScopes.local).toEqual([]); // 清空
      expect(forkThread.variableScopes.loop).toEqual([]); // 清空

      // 验证Fork/Join上下文
      expect(forkThread.threadType).toBe('FORK_JOIN');
      expect(forkThread.forkJoinContext?.forkId).toBe('test-fork');
      expect(forkThread.forkJoinContext?.forkPathId).toBeDefined();
    });
  });

  describe('缓存管理', () => {
    it('应该正确清理缓存', () => {
      const templateId = 'test-template';
      const mockThreadContext = {} as any;

      // 添加模板到缓存
      (builder as any).threadTemplates.set(templateId, mockThreadContext);
      expect((builder as any).threadTemplates.size).toBe(1);

      // 清理缓存
      builder.clearCache();

      // 验证缓存已清空
      expect((builder as any).threadTemplates.size).toBe(0);
    });

    it('应该正确失效指定工作流的缓存', () => {
      const workflowId = 'test-workflow';
      const template1 = {
        getWorkflowId: () => workflowId
      } as any;
      const template2 = {
        getWorkflowId: () => 'other-workflow'
      } as any;

      // 添加模板到缓存
      (builder as any).threadTemplates.set('template1', template1);
      (builder as any).threadTemplates.set('template2', template2);
      expect((builder as any).threadTemplates.size).toBe(2);

      // 失效指定工作流的缓存
      builder.invalidateWorkflow(workflowId);

      // 验证只有指定工作流的模板被删除
      expect((builder as any).threadTemplates.size).toBe(1);
      expect((builder as any).threadTemplates.has('template2')).toBe(true);
      expect((builder as any).threadTemplates.has('template1')).toBe(false);
    });
  });
});