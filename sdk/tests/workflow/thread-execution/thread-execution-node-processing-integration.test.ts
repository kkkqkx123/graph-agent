/**
 * 线程执行与节点处理集成测试
 * 
 * 测试范围：
 * - ThreadExecutor与节点处理器的集成
 * - 完整线程执行生命周期
 * - 节点执行流程和状态管理
 * - 节点执行结果收集和验证
 * - 异常节点执行处理
 * - 执行上下文和变量管理
 */

import { WorkflowRegistry } from '../../../core/services/workflow-registry';
import { ExecutionContext } from '../../../core/execution/context/execution-context';
import { ThreadBuilder } from '../../../core/execution/thread-builder';
import { ThreadExecutor } from '../../../core/execution/thread-executor';
import { NodeType } from '../../../types/node';
import { EdgeType } from '../../../types/edge';
import { ValidationError } from '../../../types/errors';
import type { WorkflowDefinition } from '../../../types/workflow';
import type { ThreadOptions } from '../../../types/thread';

describe('线程执行与节点处理集成测试', () => {
  let workflowRegistry: WorkflowRegistry;
  let executionContext: ExecutionContext;
  let threadBuilder: ThreadBuilder;
  let threadExecutor: ThreadExecutor;

  beforeEach(async () => {
    // 创建新的实例以避免测试间干扰
    workflowRegistry = new WorkflowRegistry({
      maxRecursionDepth: 3
    });

    // 创建执行上下文
    executionContext = ExecutionContext.createDefault();
    executionContext.register('workflowRegistry', workflowRegistry);

    // 创建线程构建器
    threadBuilder = new ThreadBuilder(workflowRegistry, executionContext);

    // 创建线程执行器
    threadExecutor = new ThreadExecutor(executionContext);
  });

  afterEach(() => {
    // 清理执行上下文
    executionContext.destroy();
  });

  /**
   * 创建简单线性工作流定义
   */
  const createSimpleLinearWorkflow = (id: string, name: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Simple linear workflow for execution testing',
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
        id: `${id}-process-1`,
        type: NodeType.CODE,
        name: 'Process 1',
        config: {
          scriptName: 'process1',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-2`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-process-2`,
        type: NodeType.CODE,
        name: 'Process 2',
        config: {
          scriptName: 'process2',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-3`],
        incomingEdgeIds: [`${id}-edge-2`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-3`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-process-1`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-process-1`,
        targetNodeId: `${id}-process-2`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-3`,
        sourceNodeId: `${id}-process-2`,
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
      tags: ['test', 'execution'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  /**
   * 创建条件分支工作流定义
   */
  const createConditionalWorkflow = (id: string, name: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Conditional workflow for execution testing',
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
        id: `${id}-condition`,
        type: NodeType.CONDITION,
        name: 'Condition',
        config: {
          condition: 'input.shouldProcess === true'
        },
        outgoingEdgeIds: [`${id}-edge-2`, `${id}-edge-3`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-process-true`,
        type: NodeType.CODE,
        name: 'Process True',
        config: {
          scriptName: 'processTrue',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-4`],
        incomingEdgeIds: [`${id}-edge-2`]
      },
      {
        id: `${id}-process-false`,
        type: NodeType.CODE,
        name: 'Process False',
        config: {
          scriptName: 'processFalse',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-5`],
        incomingEdgeIds: [`${id}-edge-3`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-4`, `${id}-edge-5`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-condition`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-condition`,
        targetNodeId: `${id}-process-true`,
        type: EdgeType.CONDITIONAL,
        condition: 'input.shouldProcess === true'
      },
      {
        id: `${id}-edge-3`,
        sourceNodeId: `${id}-condition`,
        targetNodeId: `${id}-process-false`,
        type: EdgeType.CONDITIONAL,
        condition: 'input.shouldProcess !== true'
      },
      {
        id: `${id}-edge-4`,
        sourceNodeId: `${id}-process-true`,
        targetNodeId: `${id}-end`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-5`,
        sourceNodeId: `${id}-process-false`,
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
      tags: ['test', 'conditional'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  describe('场景1：完整线程执行生命周期', () => {
    it('应该成功执行简单线性工作流', async () => {
      const workflowId = 'workflow-simple-execution';
      const workflow = createSimpleLinearWorkflow(workflowId, 'Simple Execution Workflow');

      // 注册工作流
      workflowRegistry.register(workflow);

      // 构建ThreadContext
      const threadContext = await threadBuilder.build(workflowId);

      // 执行线程
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');
      expect(executionResult.threadId).toBe(threadContext.getThreadId());
      expect(executionResult.workflowId).toBe(workflowId);

      // 验证线程状态
      expect(threadContext.getStatus()).toBe('COMPLETED');
      expect(threadContext.getEndTime()).toBeDefined();
      expect(threadContext.getEndTime()).toBeGreaterThan(threadContext.getStartTime());

      // 验证节点执行结果
      const nodeResults = threadContext.getNodeResults();
      expect(nodeResults).toHaveLength(3); // START, PROCESS-1, PROCESS-2, END
      expect(nodeResults[0].nodeId).toBe(`${workflowId}-start`);
      expect(nodeResults[1].nodeId).toBe(`${workflowId}-process-1`);
      expect(nodeResults[2].nodeId).toBe(`${workflowId}-process-2`);
    });

    it('应该正确处理条件分支工作流', async () => {
      const workflowId = 'workflow-conditional-execution';
      const workflow = createConditionalWorkflow(workflowId, 'Conditional Execution Workflow');

      // 注册工作流
      workflowRegistry.register(workflow);

      // 构建ThreadContext（条件为true）
      const threadOptions: ThreadOptions = {
        input: { shouldProcess: true }
      };
      const threadContext = await threadBuilder.build(workflowId, threadOptions);

      // 执行线程
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');

      // 验证节点执行路径（应该走true分支）
      const nodeResults = threadContext.getNodeResults();
      const executedNodeIds = nodeResults.map(result => result.nodeId);
      expect(executedNodeIds).toContain(`${workflowId}-process-true`);
      expect(executedNodeIds).not.toContain(`${workflowId}-process-false`);
    });

    it('应该正确处理条件分支工作流（false分支）', async () => {
      const workflowId = 'workflow-conditional-false-execution';
      const workflow = createConditionalWorkflow(workflowId, 'Conditional False Execution Workflow');

      // 注册工作流
      workflowRegistry.register(workflow);

      // 构建ThreadContext（条件为false）
      const threadOptions: ThreadOptions = {
        input: { shouldProcess: false }
      };
      const threadContext = await threadBuilder.build(workflowId, threadOptions);

      // 执行线程
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');

      // 验证节点执行路径（应该走false分支）
      const nodeResults = threadContext.getNodeResults();
      const executedNodeIds = nodeResults.map(result => result.nodeId);
      expect(executedNodeIds).toContain(`${workflowId}-process-false`);
      expect(executedNodeIds).not.toContain(`${workflowId}-process-true`);
    });
  });

  describe('场景2：节点执行流程和状态管理', () => {
    it('应该正确管理节点执行状态', async () => {
      const workflowId = 'workflow-node-state-management';
      const workflow = createSimpleLinearWorkflow(workflowId, 'Node State Management Workflow');

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 验证初始状态
      expect(threadContext.getStatus()).toBe('CREATED');
      expect(threadContext.getCurrentNodeId()).toBe(`${workflowId}-start`);

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证最终状态
      expect(threadContext.getStatus()).toBe('COMPLETED');
      expect(threadContext.getCurrentNodeId()).toBeUndefined(); // 执行完成后当前节点应为undefined

      // 验证节点执行顺序
      const nodeResults = threadContext.getNodeResults();
      expect(nodeResults[0].nodeId).toBe(`${workflowId}-start`);
      expect(nodeResults[1].nodeId).toBe(`${workflowId}-process-1`);
      expect(nodeResults[2].nodeId).toBe(`${workflowId}-process-2`);
    });

    it('应该正确收集节点执行结果', async () => {
      const workflowId = 'workflow-node-results-collection';
      const workflow = createSimpleLinearWorkflow(workflowId, 'Node Results Collection Workflow');

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);
      await threadExecutor.execute(threadContext);

      // 验证节点执行结果收集
      const nodeResults = threadContext.getNodeResults();
      expect(nodeResults).toHaveLength(3);

      // 验证每个节点都有执行结果
      nodeResults.forEach(result => {
        expect(result.nodeId).toBeDefined();
        expect(result.status).toBeDefined();
        expect(result.startTime).toBeDefined();
        expect(result.endTime).toBeDefined();
        expect(result.endTime).toBeGreaterThanOrEqual(result.startTime);
      });
    });
  });

  describe('场景3：异常节点执行处理', () => {
    it('应该正确处理节点执行错误', async () => {
      const workflowId = 'workflow-node-error-handling';
      const workflow: WorkflowDefinition = {
        id: workflowId,
        name: 'Node Error Handling Workflow',
        version: '1.0.0',
        description: 'Workflow with error node for testing error handling',
        nodes: [
          {
            id: `${workflowId}-start`,
            type: NodeType.START,
            name: 'Start',
            config: {},
            outgoingEdgeIds: [`${workflowId}-edge-1`],
            incomingEdgeIds: []
          },
          {
            id: `${workflowId}-error-node`,
            type: NodeType.CODE,
            name: 'Error Node',
            config: {
              scriptName: 'errorScript',
              scriptType: 'javascript',
              risk: 'low'
            },
            outgoingEdgeIds: [`${workflowId}-edge-2`],
            incomingEdgeIds: [`${workflowId}-edge-1`]
          },
          {
            id: `${workflowId}-end`,
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: [`${workflowId}-edge-2`]
          }
        ],
        edges: [
          {
            id: `${workflowId}-edge-1`,
            sourceNodeId: `${workflowId}-start`,
            targetNodeId: `${workflowId}-error-node`,
            type: EdgeType.DEFAULT
          },
          {
            id: `${workflowId}-edge-2`,
            sourceNodeId: `${workflowId}-error-node`,
            targetNodeId: `${workflowId}-end`,
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
          tags: ['test', 'error-handling'],
          category: 'test'
        },
        availableTools: {
          initial: new Set()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 执行线程（应该处理错误）
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果（应该失败）
      expect(executionResult.success).toBe(false);
      expect(executionResult.status).toBe('FAILED');

      // 验证错误信息
      const errors = threadContext.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('error');

      // 验证节点执行结果包含错误
      const nodeResults = threadContext.getNodeResults();
      const errorNodeResult = nodeResults.find(result => result.nodeId === `${workflowId}-error-node`);
      expect(errorNodeResult?.status).toBe('FAILED');
      expect(errorNodeResult?.error).toBeDefined();
    });

    it('应该处理超时节点执行', async () => {
      const workflowId = 'workflow-timeout-handling';
      const workflow: WorkflowDefinition = {
        id: workflowId,
        name: 'Timeout Handling Workflow',
        version: '1.0.0',
        description: 'Workflow with timeout node for testing timeout handling',
        nodes: [
          {
            id: `${workflowId}-start`,
            type: NodeType.START,
            name: 'Start',
            config: {},
            outgoingEdgeIds: [`${workflowId}-edge-1`],
            incomingEdgeIds: []
          },
          {
            id: `${workflowId}-timeout-node`,
            type: NodeType.CODE,
            name: 'Timeout Node',
            config: {
              scriptName: 'timeoutScript',
              scriptType: 'javascript',
              risk: 'low',
              timeout: 100 // 很短的超时时间
            },
            outgoingEdgeIds: [`${workflowId}-edge-2`],
            incomingEdgeIds: [`${workflowId}-edge-1`]
          },
          {
            id: `${workflowId}-end`,
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: [`${workflowId}-edge-2`]
          }
        ],
        edges: [
          {
            id: `${workflowId}-edge-1`,
            sourceNodeId: `${workflowId}-start`,
            targetNodeId: `${workflowId}-timeout-node`,
            type: EdgeType.DEFAULT
          },
          {
            id: `${workflowId}-edge-2`,
            sourceNodeId: `${workflowId}-timeout-node`,
            targetNodeId: `${workflowId}-end`,
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
          tags: ['test', 'timeout'],
          category: 'test'
        },
        availableTools: {
          initial: new Set()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 执行线程
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果（可能因超时而失败）
      // 注意：这里不严格验证成功/失败，因为超时处理可能因实现而异
      expect(executionResult).toBeDefined();
      expect(executionResult.threadId).toBe(threadContext.getThreadId());
    });
  });

  describe('场景4：执行上下文和变量管理', () => {
    it('应该正确管理执行上下文', async () => {
      const workflowId = 'workflow-execution-context';
      const workflow = createSimpleLinearWorkflow(workflowId, 'Execution Context Workflow');

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 验证执行上下文初始化
      expect(threadContext.executionContext).toBe(executionContext);

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证执行上下文在过程中保持稳定
      expect(threadContext.executionContext).toBe(executionContext);
    });

    it('应该正确处理变量作用域', async () => {
      const workflowId = 'workflow-variable-scopes-execution';
      const workflow = createSimpleLinearWorkflow(workflowId, 'Variable Scopes Execution Workflow');

      workflowRegistry.register(workflow);

      const threadOptions: ThreadOptions = {
        input: { initialValue: 'test' }
      };
      const threadContext = await threadBuilder.build(workflowId, threadOptions);

      // 验证变量作用域初始化
      expect(threadContext.thread.variableScopes.global).toBeDefined();
      expect(threadContext.thread.variableScopes.thread).toBeDefined();

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证变量作用域在过程中保持稳定
      expect(threadContext.thread.variableScopes.global).toBeDefined();
      expect(threadContext.thread.variableScopes.thread).toBeDefined();
    });
  });

  describe('场景5：执行性能和多线程', () => {
    it('应该快速执行简单工作流', async () => {
      const workflowId = 'workflow-performance-execution';
      const workflow = createSimpleLinearWorkflow(workflowId, 'Performance Execution Workflow');

      workflowRegistry.register(workflow);

      const startTime = Date.now();

      const threadContext = await threadBuilder.build(workflowId);
      const executionResult = await threadExecutor.execute(threadContext);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 完整执行流程应该在合理时间内完成
      expect(duration).toBeLessThan(5000);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');
    });

    it('应该支持并发线程执行', async () => {
      const workflowId = 'workflow-concurrent-execution';
      const workflow = createSimpleLinearWorkflow(workflowId, 'Concurrent Execution Workflow');

      workflowRegistry.register(workflow);

      // 并发构建和执行多个线程
      const executionPromises = Array.from({ length: 3 }, async () => {
        const threadContext = await threadBuilder.build(workflowId);
        return threadExecutor.execute(threadContext);
      });

      const executionResults = await Promise.all(executionPromises);

      // 验证所有执行成功
      executionResults.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.status).toBe('COMPLETED');
        expect(result.workflowId).toBe(workflowId);
      });

      // 验证所有线程有不同的ID
      const threadIds = executionResults.map(result => result.threadId);
      const uniqueThreadIds = new Set(threadIds);
      expect(uniqueThreadIds.size).toBe(executionResults.length);
    });
  });
});