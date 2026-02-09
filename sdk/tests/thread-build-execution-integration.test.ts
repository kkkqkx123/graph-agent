/**
 * Thread构建到执行实例创建集成测试
 * 
 * 测试范围：
 * - 完整Thread构建到执行实例创建生命周期
 * - WorkflowRegistry、GraphRegistry、ThreadBuilder、ThreadContext的集成
 * - 基础Thread构建功能的端到端测试
 * - 异常路径和错误处理
 * - 性能和多线程测试
 */

import { WorkflowRegistry } from '../core/services/workflow-registry';
import { graphRegistry } from '../core/services/graph-registry';
import { ThreadBuilder } from '../core/execution/thread-builder';
import { ThreadContext } from '../core/execution/context/thread-context';
import { ExecutionContext } from '../core/execution/context/execution-context';
import { NodeType } from '../types/node';
import { EdgeType } from '../types/edge';
import { ValidationError } from '../types/errors';
import type { WorkflowDefinition } from '../types/workflow';
import type { ThreadOptions } from '../types/thread';

describe('Thread构建到执行实例创建集成测试', () => {
  let workflowRegistry: WorkflowRegistry;
  let threadBuilder: ThreadBuilder;
  let executionContext: ExecutionContext;

  beforeEach(() => {
    // 创建新的实例以避免测试间干扰
    workflowRegistry = new WorkflowRegistry({
      enableVersioning: true,
      enablePreprocessing: true,
      maxVersions: 5,
      maxRecursionDepth: 3
    });

    // 创建执行上下文
    executionContext = ExecutionContext.createDefault();
    executionContext.register('workflowRegistry', workflowRegistry);

    // 创建线程构建器
    threadBuilder = new ThreadBuilder(workflowRegistry, executionContext);

    // 清理全局注册表
    graphRegistry.clear();
  });

  afterEach(() => {
    // 清理全局注册表
    graphRegistry.clear();
  });

  /**
   * 创建基础工作流定义
   */
  const createBaseWorkflow = (id: string, name: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Test workflow',
    nodes: [
      {
        id: `${id}-start`,
        type: NodeType.START,
        name: 'Start',
        config: {},
        outgoingEdgeIds: [`${id}-edge-1`],
        incomingEdgeIds: []
      },
      {
        id: `${id}-process`,
        type: NodeType.CODE,
        name: 'Process',
        config: {
          scriptName: 'process',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-2`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-2`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-process`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-process`,
        targetNodeId: `${id}-end`,
        type: EdgeType.DEFAULT
      }
    ],
    variables: [],
    triggers: [],
    config: {
      timeout: 60000,
      maxSteps: 1000,
      toolApproval: {
        autoApprovedTools: []
      }
    },
    metadata: {
      author: 'test-author',
      tags: ['test', 'integration'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  describe('场景1：完整Thread构建到执行实例创建生命周期', () => {
    it('应该成功完成从Thread构建到ThreadContext创建的完整流程', async () => {
      const workflowId = 'workflow-complete-thread-flow';
      const workflow = createBaseWorkflow(workflowId, 'Complete Thread Flow Workflow');

      // 步骤1：注册工作流到WorkflowRegistry
      expect(() => workflowRegistry.register(workflow)).not.toThrow();

      // 步骤2：验证工作流已注册
      expect(workflowRegistry.has(workflowId)).toBe(true);
      const registeredWorkflow = workflowRegistry.get(workflowId);
      expect(registeredWorkflow).toEqual(workflow);

      // 步骤3：验证预处理结果
      const processedWorkflow = workflowRegistry.getProcessed(workflowId);
      expect(processedWorkflow).toBeDefined();
      expect(processedWorkflow?.graph).toBeDefined();
      expect(processedWorkflow?.validationResult.isValid).toBe(true);

      // 步骤4：验证Graph已注册到GraphRegistry
      expect(graphRegistry.has(workflowId)).toBe(true);
      const graph = graphRegistry.get(workflowId);
      expect(graph).toBeDefined();

      // 步骤5：使用ThreadBuilder构建ThreadContext
      const threadOptions: ThreadOptions = {
        input: { testInput: 'value' }
      };

      const threadContext = await threadBuilder.build(workflowId, threadOptions);

      // 步骤6：验证ThreadContext构建成功
      expect(threadContext).toBeInstanceOf(ThreadContext);
      expect(threadContext.getWorkflowId()).toBe(workflowId);
      expect(threadContext.getThreadId()).toBeDefined();
      expect(threadContext.getStatus()).toBe('CREATED');
      expect(threadContext.getCurrentNodeId()).toBe(`${workflowId}-start`);

      // 步骤7：验证ThreadContext包含正确的图引用
      const thread = threadContext.thread;
      expect(thread.graph).toBe(graph); // 应该是同一个图实例

      // 步骤8：验证ThreadContext的组件初始化
      expect(threadContext.conversationManager).toBeDefined();
      expect(threadContext.triggerStateManager).toBeDefined();
      expect(threadContext.triggerManager).toBeDefined();

      // 步骤9：验证变量作用域初始化
      expect(thread.variableScopes.global).toBeDefined();
      expect(thread.variableScopes.thread).toBeDefined();
      expect(thread.variableScopes.subgraph).toEqual([]);
      expect(thread.variableScopes.loop).toEqual([]);

      // 步骤10：验证输入数据正确传递
      expect(thread.input).toEqual(threadOptions.input);
    });

    it('应该支持复杂工作流的Thread构建和ThreadContext创建', async () => {
      const workflow: WorkflowDefinition = {
        id: 'workflow-complex-thread',
        name: 'Complex Thread Workflow',
        version: '1.0.0',
        description: 'Complex workflow with multiple nodes for thread testing',
        nodes: [
          {
            id: 'node-start',
            type: NodeType.START,
            name: 'Start',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'node-llm',
            type: NodeType.LLM,
            name: 'LLM Node',
            config: {
              profileId: 'profile-1',
              prompt: 'Hello'
            },
            outgoingEdgeIds: ['edge-2'],
            incomingEdgeIds: ['edge-1']
          },
          {
            id: 'node-code',
            type: NodeType.CODE,
            name: 'Code Node',
            config: {
              scriptName: 'process',
              scriptType: 'javascript',
              risk: 'low',
              timeout: 5000,
              retries: 3
            },
            outgoingEdgeIds: ['edge-3'],
            incomingEdgeIds: ['edge-2']
          },
          {
            id: 'node-end',
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['edge-3']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-start',
            targetNodeId: 'node-llm',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-2',
            sourceNodeId: 'node-llm',
            targetNodeId: 'node-code',
            type: EdgeType.DEFAULT
          },
          {
            id: 'edge-3',
            sourceNodeId: 'node-code',
            targetNodeId: 'node-end',
            type: EdgeType.DEFAULT
          }
        ],
        config: {
          timeout: 60000,
          maxSteps: 100,
          enableCheckpoints: true,
          toolApproval: {
            autoApprovedTools: []
          }
        },
        metadata: {
          author: 'test-author',
          tags: ['complex', 'thread', 'integration']
        },
        availableTools: {
          initial: new Set()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 注册工作流
      workflowRegistry.register(workflow);

      // 验证Graph注册
      expect(graphRegistry.has('workflow-complex-thread')).toBe(true);
      const graph = graphRegistry.get('workflow-complex-thread');
      expect(graph).toBeDefined();

      // 构建ThreadContext
      const threadContext = await threadBuilder.build('workflow-complex-thread');

      // 验证ThreadContext
      expect(threadContext).toBeInstanceOf(ThreadContext);
      expect(threadContext.getWorkflowId()).toBe('workflow-complex-thread');
      expect(threadContext.getCurrentNodeId()).toBe('node-start');
      expect(threadContext.thread.graph).toBe(graph);

      // 验证ThreadContext的完整状态
      expect(threadContext.getStatus()).toBe('CREATED');
      expect(threadContext.getStartTime()).toBeGreaterThan(0);
      expect(threadContext.getEndTime()).toBeUndefined();
      expect(threadContext.getErrors()).toEqual([]);
      expect(threadContext.getNodeResults()).toEqual([]);
    });
  });

  describe('场景2：变量作用域初始化', () => {
    it('应该正确初始化变量作用域结构', async () => {
      const workflowId = 'workflow-variable-scopes';
      const workflow = createBaseWorkflow(workflowId, 'Workflow Variable Scopes');

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 验证变量作用域结构已正确初始化
      expect(threadContext.thread.variableScopes.global).toBeDefined();
      expect(threadContext.thread.variableScopes.thread).toBeDefined();
      expect(threadContext.thread.variableScopes.subgraph).toEqual([]);
      expect(threadContext.thread.variableScopes.loop).toEqual([]);
    });
  });

  describe('场景3：基础Thread构建功能', () => {
    it('应该支持基础Thread构建', async () => {
      const workflowId = 'workflow-basic-thread';
      const workflow = createBaseWorkflow(workflowId, 'Basic Thread Workflow');

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 验证ThreadContext构建成功
      expect(threadContext).toBeInstanceOf(ThreadContext);
      expect(threadContext.getWorkflowId()).toBe(workflowId);
      expect(threadContext.getThreadId()).toBeDefined();
      expect(threadContext.getStatus()).toBe('CREATED');
    });
  });

  describe('场景4：异常路径和错误处理', () => {
    it('应该在Graph未注册时抛出ValidationError', async () => {
      const workflowId = 'workflow-no-graph-thread';
      const workflow = createBaseWorkflow(workflowId, 'No Graph Thread Workflow');

      // 注册工作流但不注册图
      workflowRegistry.register(workflow);

      // 手动从GraphRegistry删除图（模拟图未注册的情况）
      graphRegistry.delete(workflowId);

      // 应该抛出错误，因为图不存在
      await expect(threadBuilder.build(workflowId)).rejects.toThrow(ValidationError);
      await expect(threadBuilder.build(workflowId)).rejects.toThrow(
        `Graph not found for workflow: ${workflowId}`
      );
    });

    it('应该在工作流不存在时抛出ValidationError', async () => {
      const workflowId = 'non-existent-workflow-thread';

      await expect(threadBuilder.build(workflowId)).rejects.toThrow(ValidationError);
      await expect(threadBuilder.build(workflowId)).rejects.toThrow(
        `Workflow with ID '${workflowId}' not found in registry`
      );
    });

    it('应该拒绝无效的工作流定义', async () => {
      const invalidWorkflow: WorkflowDefinition = {
        id: 'workflow-invalid-thread',
        name: 'Invalid Thread Workflow',
        version: '1.0.0',
        nodes: [], // 无效 - 没有节点
        edges: [],
        config: {},
        metadata: {},
        availableTools: { initial: new Set() },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 注册应该失败
      expect(() => workflowRegistry.register(invalidWorkflow)).toThrow(ValidationError);

      // 验证图未注册
      expect(graphRegistry.has('workflow-invalid-thread')).toBe(false);
    });

    it('应该在缺少START节点时抛出ValidationError', async () => {
      const workflowWithoutStart: WorkflowDefinition = {
        id: 'workflow-no-start',
        name: 'Workflow Without Start',
        version: '1.0.0',
        nodes: [
          {
            id: 'node-process',
            type: NodeType.CODE,
            name: 'Process',
            config: {},
            outgoingEdgeIds: ['edge-1'],
            incomingEdgeIds: []
          },
          {
            id: 'node-end',
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: ['edge-1']
          }
        ],
        edges: [
          {
            id: 'edge-1',
            sourceNodeId: 'node-process',
            targetNodeId: 'node-end',
            type: EdgeType.DEFAULT
          }
        ],
        config: {},
        metadata: {},
        availableTools: { initial: new Set() },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 注册应该失败
      expect(() => workflowRegistry.register(workflowWithoutStart)).toThrow(ValidationError);
    });
  });

  describe('场景5：工作流更新和重新构建', () => {
    it('应该支持工作流更新并重新构建Thread', async () => {
      const workflowId = 'workflow-update-rebuild-thread';
      const workflow = createBaseWorkflow(workflowId, 'Update Rebuild Thread Workflow');

      // 初始注册
      workflowRegistry.register(workflow);

      // 获取初始Graph
      const initialGraph = graphRegistry.get(workflowId);
      expect(initialGraph).toBeDefined();

      // 构建初始ThreadContext
      const initialThreadContext = await threadBuilder.build(workflowId);
      expect(initialThreadContext.thread.graph).toBe(initialGraph);

      // 更新工作流
      const updatedWorkflow: WorkflowDefinition = {
        ...workflow,
        description: 'Updated description',
        version: '2.0.0',
        updatedAt: Date.now()
      };

      workflowRegistry.update(updatedWorkflow);

      // 验证Graph已更新
      const updatedGraph = graphRegistry.get(workflowId);
      expect(updatedGraph).toBeDefined();
      expect(updatedGraph).not.toBe(initialGraph); // 应该是新的Graph实例

      // 重新构建ThreadContext
      const updatedThreadContext = await threadBuilder.build(workflowId);

      // 验证使用新的Graph
      expect(updatedThreadContext.thread.graph).toBe(updatedGraph);
      expect(updatedThreadContext.thread.graph).not.toBe(initialGraph);

      // 验证ThreadContext是不同的实例
      expect(updatedThreadContext.getThreadId()).not.toBe(initialThreadContext.getThreadId());
    });

    it('应该在删除工作流时清除Graph缓存', async () => {
      const workflowId = 'workflow-delete-clear-thread';
      const workflow = createBaseWorkflow(workflowId, 'Delete Clear Thread Workflow');

      // 注册工作流
      workflowRegistry.register(workflow);

      // 验证Graph已注册
      expect(graphRegistry.has(workflowId)).toBe(true);

      // 构建ThreadContext
      const threadContext = await threadBuilder.build(workflowId);
      expect(threadContext).toBeInstanceOf(ThreadContext);

      // 删除工作流
      workflowRegistry.unregister(workflowId);

      // 验证Graph已清除
      expect(graphRegistry.has(workflowId)).toBe(false);

      // 验证无法再构建ThreadContext
      await expect(threadBuilder.build(workflowId)).rejects.toThrow(ValidationError);
    });
  });

  describe('场景6：批量操作集成测试', () => {
    it('应该成功批量注册多个工作流并构建Thread', async () => {
      const workflows = [
        createBaseWorkflow('workflow-batch-thread-1', 'Batch Thread Workflow 1'),
        createBaseWorkflow('workflow-batch-thread-2', 'Batch Thread Workflow 2'),
        createBaseWorkflow('workflow-batch-thread-3', 'Batch Thread Workflow 3')
      ];

      // 批量注册
      workflowRegistry.registerBatch(workflows);

      // 验证所有工作流都已注册
      expect(workflowRegistry.has('workflow-batch-thread-1')).toBe(true);
      expect(workflowRegistry.has('workflow-batch-thread-2')).toBe(true);
      expect(workflowRegistry.has('workflow-batch-thread-3')).toBe(true);

      // 验证所有Graph都已注册
      expect(graphRegistry.has('workflow-batch-thread-1')).toBe(true);
      expect(graphRegistry.has('workflow-batch-thread-2')).toBe(true);
      expect(graphRegistry.has('workflow-batch-thread-3')).toBe(true);

      // 为每个工作流构建ThreadContext
      const threadContexts = await Promise.all([
        threadBuilder.build('workflow-batch-thread-1'),
        threadBuilder.build('workflow-batch-thread-2'),
        threadBuilder.build('workflow-batch-thread-3')
      ]);

      // 验证所有ThreadContext构建成功
      threadContexts.forEach((threadContext, index) => {
        expect(threadContext).toBeInstanceOf(ThreadContext);
        expect(threadContext.getWorkflowId()).toBe(`workflow-batch-thread-${index + 1}`);
        expect(threadContext.thread.graph).toBe(graphRegistry.get(`workflow-batch-thread-${index + 1}`));
      });
    });

    it('应该在批量注册失败时停止并清理', async () => {
      const workflows = [
        createBaseWorkflow('workflow-batch-valid-thread', 'Valid Thread Workflow'),
        {
          id: 'workflow-batch-invalid-thread',
          name: 'Invalid Thread Workflow',
          nodes: [], // 无效的工作流 - 没有节点
          edges: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        } as any,
        createBaseWorkflow('workflow-batch-not-registered-thread', 'Not Registered Thread Workflow')
      ];

      // 应该在第二个工作流时失败
      expect(() => workflowRegistry.registerBatch(workflows)).toThrow(ValidationError);

      // 只有第一个工作流应该被注册
      expect(workflowRegistry.has('workflow-batch-valid-thread')).toBe(true);
      expect(workflowRegistry.has('workflow-batch-invalid-thread')).toBe(false);
      expect(workflowRegistry.has('workflow-batch-not-registered-thread')).toBe(false);

      // 验证GraphRegistry中只有有效的工作流
      expect(graphRegistry.has('workflow-batch-valid-thread')).toBe(true);
      expect(graphRegistry.has('workflow-batch-invalid-thread')).toBe(false);

      // 只有有效的工作流可以构建ThreadContext
      const validThreadContext = await threadBuilder.build('workflow-batch-valid-thread');
      expect(validThreadContext).toBeInstanceOf(ThreadContext);

      await expect(threadBuilder.build('workflow-batch-invalid-thread')).rejects.toThrow(ValidationError);
      await expect(threadBuilder.build('workflow-batch-not-registered-thread')).rejects.toThrow(ValidationError);
    });
  });

  describe('场景7：线程选项和输入处理', () => {
    it('应该正确处理线程选项和输入', async () => {
      const workflowId = 'workflow-with-options-thread';
      const workflow = createBaseWorkflow(workflowId, 'Workflow With Options Thread');

      workflowRegistry.register(workflow);

      const threadOptions: ThreadOptions = {
        input: {
          testInput: 'custom value',
          creator: 'test-creator',
          tags: ['tag1', 'tag2']
        },
        tokenLimit: 8000
      };

      const threadContext = await threadBuilder.build(workflowId, threadOptions);

      // 验证输入正确传递
      expect(threadContext.thread.input).toEqual(threadOptions.input);

      // 验证元数据正确设置
      expect(threadContext.thread.metadata?.creator).toBe('test-creator');
      expect(threadContext.thread.metadata?.tags).toEqual(['tag1', 'tag2']);
      expect(threadContext.thread.metadata?.isPreprocessed).toBe(true);

      // 验证ConversationManager配置
      const conversationManager = threadContext.conversationManager;
      expect(conversationManager).toBeDefined();
    });

    it('应该处理空的线程选项', async () => {
      const workflowId = 'workflow-empty-options-thread';
      const workflow = createBaseWorkflow(workflowId, 'Workflow Empty Options Thread');

      workflowRegistry.register(workflow);

      // 使用空选项构建ThreadContext
      const threadContext = await threadBuilder.build(workflowId);

      // 验证默认值
      expect(threadContext.thread.input).toEqual({});
      expect(threadContext.thread.metadata?.creator).toBeUndefined();
      expect(threadContext.thread.metadata?.tags).toBeUndefined();
      expect(threadContext.thread.metadata?.isPreprocessed).toBe(true);
    });
  });

  describe('场景8：性能和多线程测试', () => {
    it('应该快速处理Thread构建', async () => {
      const workflowId = 'workflow-performance-thread';
      const workflow = createBaseWorkflow(workflowId, 'Performance Thread Workflow');

      const startTime = Date.now();

      // 注册工作流
      workflowRegistry.register(workflow);

      // 构建ThreadContext
      const threadContext = await threadBuilder.build(workflowId);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 完整流程应该在合理时间内完成
      expect(duration).toBeLessThan(1000);

      // 验证结果
      expect(threadContext).toBeInstanceOf(ThreadContext);
      expect(graphRegistry.has(workflowId)).toBe(true);
    });

    it('应该支持并发Thread构建', async () => {
      const workflowId = 'workflow-concurrent-thread';
      const workflow = createBaseWorkflow(workflowId, 'Concurrent Thread Workflow');

      workflowRegistry.register(workflow);

      // 并发构建多个ThreadContext
      const buildPromises = Array.from({ length: 5 }, () => 
        threadBuilder.build(workflowId)
      );

      const threadContexts = await Promise.all(buildPromises);

      // 验证所有ThreadContext构建成功
      threadContexts.forEach(threadContext => {
        expect(threadContext).toBeInstanceOf(ThreadContext);
        expect(threadContext.getWorkflowId()).toBe(workflowId);
        expect(threadContext.thread.graph).toBe(graphRegistry.get(workflowId));
      });

      // 验证所有ThreadContext有不同的ID
      const threadIds = threadContexts.map(tc => tc.getThreadId());
      const uniqueThreadIds = new Set(threadIds);
      expect(uniqueThreadIds.size).toBe(threadContexts.length);
    });

    it('应该支持Thread副本创建', async () => {
      const workflowId = 'workflow-copy-thread';
      const workflow = createBaseWorkflow(workflowId, 'Copy Thread Workflow');

      workflowRegistry.register(workflow);

      // 构建原始ThreadContext
      const originalThreadContext = await threadBuilder.build(workflowId);

      // 创建副本
      const copiedThreadContext = await threadBuilder.createCopy(originalThreadContext);

      // 验证副本构建成功
      expect(copiedThreadContext).toBeInstanceOf(ThreadContext);
      expect(copiedThreadContext.getWorkflowId()).toBe(workflowId);

      // 验证副本有不同ID
      expect(copiedThreadContext.getThreadId()).not.toBe(originalThreadContext.getThreadId());

      // 验证变量作用域正确复制
      expect(copiedThreadContext.thread.variableScopes.global).toBe(originalThreadContext.thread.variableScopes.global); // 全局作用域共享
      expect(copiedThreadContext.thread.variableScopes.thread).not.toBe(originalThreadContext.thread.variableScopes.thread); // 线程作用域深拷贝
      expect(copiedThreadContext.thread.variableScopes.subgraph).toEqual([]); // 子图作用域清空
      expect(copiedThreadContext.thread.variableScopes.loop).toEqual([]); // 循环作用域清空

      // 验证元数据正确设置（副本线程应该是子线程）
      expect(copiedThreadContext.thread.triggeredSubworkflowContext?.parentThreadId).toBe(originalThreadContext.getThreadId());
    });
  });

  describe('场景9：状态管理和生命周期', () => {
    it('应该支持ThreadContext资源清理', async () => {
      const workflowId = 'workflow-cleanup-thread';
      const workflow = createBaseWorkflow(workflowId, 'Cleanup Thread Workflow');

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 验证ThreadContext已初始化
      expect(threadContext.isInitialized()).toBe(true);

      // 执行清理
      threadContext.cleanup();

      // 验证清理后状态（这里主要验证没有抛出异常）
      expect(threadContext.isInitialized()).toBe(true); // ThreadContext在构造时总是初始化的
    });

    it('应该支持图导航器功能', async () => {
      const workflowId = 'workflow-navigation-thread';
      const workflow = createBaseWorkflow(workflowId, 'Navigation Thread Workflow');

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 获取图导航器
      const navigator = threadContext.getNavigator();
      expect(navigator).toBeDefined();

      // 获取下一个节点信息
      const nextNode = threadContext.getNextNode();
      expect(nextNode).toBeDefined();
      expect(nextNode.isEnd).toBeDefined();
      expect(nextNode.hasMultiplePaths).toBeDefined();
      expect(nextNode.possibleNextNodeIds).toBeDefined();
    });
  });
});