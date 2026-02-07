/**
 * Graph注册到Thread构建集成测试
 *
 * 测试范围：
 * - 完整Graph注册到Thread构建生命周期
 * - WorkflowRegistry、GraphRegistry、ThreadBuilder的集成
 * - 预处理流程的端到端测试
 * - 异常路径和错误处理
 * - 模板展开和子工作流处理的集成验证
 */

import { WorkflowRegistry } from '../core/services/workflow-registry';
import { graphRegistry } from '../core/services/graph-registry';
import { ThreadBuilder } from '../core/execution/thread-builder';
import { ThreadContext } from '../core/execution/context/thread-context';
import { ExecutionContext } from '../core/execution/context/execution-context';
import { NodeType } from '../types/node';
import { EdgeType } from '../types/edge';
import { ValidationError } from '../types/errors';
import type { WorkflowDefinition, ProcessedWorkflowDefinition } from '../types/workflow';
import type { ThreadOptions } from '../types/thread';

describe('Graph注册到Thread构建集成测试', () => {
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

  describe('场景1：完整Graph注册到Thread构建生命周期', () => {
    it('应该成功完成从Graph注册到Thread构建的完整流程', async () => {
      const workflowId = 'workflow-complete-flow';
      const workflow = createBaseWorkflow(workflowId, 'Complete Flow Workflow');

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
      expect(graph?.isReadOnly()).toBe(true);

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
      // Graph接口没有isReadOnly方法，只检查GraphData实例
      expect(graph?.isReadOnly()).toBe(true);

      // 步骤8：验证元数据正确传递
      expect(thread.metadata?.workflowConfig).toEqual(processedWorkflow?.config);
      expect(thread.metadata?.workflowMetadata).toEqual(processedWorkflow?.metadata);
      expect(thread.metadata?.buildPath).toBe('processed');
    });

    it('应该支持复杂工作流的Graph注册和Thread构建', async () => {
      const workflow: WorkflowDefinition = {
        id: 'workflow-complex',
        name: 'Complex Workflow',
        version: '1.0.0',
        description: 'Complex workflow with multiple nodes',
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
          tags: ['complex', 'integration']
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
      expect(graphRegistry.has('workflow-complex')).toBe(true);
      const graph = graphRegistry.get('workflow-complex');
      expect(graph).toBeDefined();

      // 构建ThreadContext
      const threadContext = await threadBuilder.build('workflow-complex');

      // 验证ThreadContext
      expect(threadContext).toBeInstanceOf(ThreadContext);
      expect(threadContext.getWorkflowId()).toBe('workflow-complex');
      expect(threadContext.getCurrentNodeId()).toBe('node-start');
      expect(threadContext.thread.graph).toBe(graph);
    });
  });

  describe('场景2：异常路径和错误处理', () => {
    it('应该在Graph未注册时抛出ValidationError', async () => {
      const workflowId = 'workflow-no-graph';
      const workflow = createBaseWorkflow(workflowId, 'No Graph Workflow');

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
      const workflowId = 'non-existent-workflow';

      await expect(threadBuilder.build(workflowId)).rejects.toThrow(ValidationError);
      await expect(threadBuilder.build(workflowId)).rejects.toThrow(
        `Workflow with ID '${workflowId}' not found in registry`
      );
    });

    it('应该拒绝无效的工作流定义', async () => {
      const invalidWorkflow: WorkflowDefinition = {
        id: 'workflow-invalid',
        name: 'Invalid Workflow',
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
      expect(graphRegistry.has('workflow-invalid')).toBe(false);
    });
  });

  describe('场景3：工作流更新和重新构建', () => {
    it('应该支持工作流更新并重新构建Thread', async () => {
      const workflowId = 'workflow-update-rebuild';
      const workflow = createBaseWorkflow(workflowId, 'Update Rebuild Workflow');

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
    });

    it('应该在删除工作流时清除Graph缓存', async () => {
      const workflowId = 'workflow-delete-clear';
      const workflow = createBaseWorkflow(workflowId, 'Delete Clear Workflow');

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

  describe('场景4：批量操作集成测试', () => {
    it('应该成功批量注册多个工作流并构建Thread', async () => {
      const workflows = [
        createBaseWorkflow('workflow-batch-1', 'Batch Workflow 1'),
        createBaseWorkflow('workflow-batch-2', 'Batch Workflow 2'),
        createBaseWorkflow('workflow-batch-3', 'Batch Workflow 3')
      ];

      // 批量注册
      workflowRegistry.registerBatch(workflows);

      // 验证所有工作流都已注册
      expect(workflowRegistry.has('workflow-batch-1')).toBe(true);
      expect(workflowRegistry.has('workflow-batch-2')).toBe(true);
      expect(workflowRegistry.has('workflow-batch-3')).toBe(true);

      // 验证所有Graph都已注册
      expect(graphRegistry.has('workflow-batch-1')).toBe(true);
      expect(graphRegistry.has('workflow-batch-2')).toBe(true);
      expect(graphRegistry.has('workflow-batch-3')).toBe(true);

      // 为每个工作流构建ThreadContext
      const threadContexts = await Promise.all([
        threadBuilder.build('workflow-batch-1'),
        threadBuilder.build('workflow-batch-2'),
        threadBuilder.build('workflow-batch-3')
      ]);

      // 验证所有ThreadContext构建成功
      threadContexts.forEach((threadContext, index) => {
        expect(threadContext).toBeInstanceOf(ThreadContext);
        expect(threadContext.getWorkflowId()).toBe(`workflow-batch-${index + 1}`);
        expect(threadContext.thread.graph).toBe(graphRegistry.get(`workflow-batch-${index + 1}`));
      });
    });

    it('应该在批量注册失败时停止并清理', async () => {
      const workflows = [
        createBaseWorkflow('workflow-batch-valid', 'Valid Workflow'),
        {
          id: 'workflow-batch-invalid',
          name: 'Invalid Workflow',
          nodes: [], // 无效的工作流 - 没有节点
          edges: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        } as any,
        createBaseWorkflow('workflow-batch-not-registered', 'Not Registered Workflow')
      ];

      // 应该在第二个工作流时失败
      expect(() => workflowRegistry.registerBatch(workflows)).toThrow(ValidationError);

      // 只有第一个工作流应该被注册
      expect(workflowRegistry.has('workflow-batch-valid')).toBe(true);
      expect(workflowRegistry.has('workflow-batch-invalid')).toBe(false);
      expect(workflowRegistry.has('workflow-batch-not-registered')).toBe(false);

      // 验证GraphRegistry中只有有效的工作流
      expect(graphRegistry.has('workflow-batch-valid')).toBe(true);
      expect(graphRegistry.has('workflow-batch-invalid')).toBe(false);

      // 只有有效的工作流可以构建ThreadContext
      const validThreadContext = await threadBuilder.build('workflow-batch-valid');
      expect(validThreadContext).toBeInstanceOf(ThreadContext);

      await expect(threadBuilder.build('workflow-batch-invalid')).rejects.toThrow(ValidationError);
      await expect(threadBuilder.build('workflow-batch-not-registered')).rejects.toThrow(ValidationError);
    });
  });

  describe('场景5：线程选项和输入处理', () => {
    it('应该正确处理线程选项和输入', async () => {
      const workflowId = 'workflow-with-options';
      const workflow = createBaseWorkflow(workflowId, 'Workflow With Options');

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
      const workflowId = 'workflow-empty-options';
      const workflow = createBaseWorkflow(workflowId, 'Workflow Empty Options');

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

  describe('场景6：性能和多线程测试', () => {
    it('应该快速处理Graph注册和Thread构建', async () => {
      const workflowId = 'workflow-performance';
      const workflow = createBaseWorkflow(workflowId, 'Performance Workflow');

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
      const workflowId = 'workflow-concurrent';
      const workflow = createBaseWorkflow(workflowId, 'Concurrent Workflow');

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
  });
});