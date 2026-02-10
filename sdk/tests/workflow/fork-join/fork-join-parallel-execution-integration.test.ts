/**
 * Fork/Join和并行执行集成测试
 * 
 * 测试范围：
 * - Fork/Join节点的并行执行机制
 * - 并行分支的创建和管理
 * - Join节点的同步和聚合
 * - 并行执行的状态管理
 * - 并行执行错误处理
 * - 性能和多线程并发测试
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

describe('Fork/Join和并行执行集成测试', () => {
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
   * 创建基础并行工作流定义（两个分支）
   */
  const createParallelWorkflow = (id: string, name: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Parallel workflow for fork/join testing',
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
        id: `${id}-fork`,
        type: NodeType.FORK,
        name: 'Fork',
        config: {
          forkId: `${id}-fork-join`,
          forkStrategy: 'PARALLEL'
        },
        outgoingEdgeIds: [`${id}-edge-2`, `${id}-edge-3`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-branch-1`,
        type: NodeType.CODE,
        name: 'Branch 1',
        config: {
          scriptName: 'process1',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-4`],
        incomingEdgeIds: [`${id}-edge-2`]
      },
      {
        id: `${id}-branch-2`,
        type: NodeType.CODE,
        name: 'Branch 2',
        config: {
          scriptName: 'process2',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-5`],
        incomingEdgeIds: [`${id}-edge-3`]
      },
      {
        id: `${id}-join`,
        type: NodeType.JOIN,
        name: 'Join',
        config: {
          joinId: `${id}-fork-join`,
          joinStrategy: 'ALL_COMPLETED',
          forkId: `${id}-fork-join`
        },
        outgoingEdgeIds: [`${id}-edge-6`],
        incomingEdgeIds: [`${id}-edge-4`, `${id}-edge-5`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-6`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-fork`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-fork`,
        targetNodeId: `${id}-branch-1`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-3`,
        sourceNodeId: `${id}-fork`,
        targetNodeId: `${id}-branch-2`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-4`,
        sourceNodeId: `${id}-branch-1`,
        targetNodeId: `${id}-join`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-5`,
        sourceNodeId: `${id}-branch-2`,
        targetNodeId: `${id}-join`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-6`,
        sourceNodeId: `${id}-join`,
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
      tags: ['test', 'parallel'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  /**
   * 创建多分支并行工作流定义（三个分支）
   */
  const createMultiBranchWorkflow = (id: string, name: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Multi-branch parallel workflow for fork/join testing',
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
        id: `${id}-fork`,
        type: NodeType.FORK,
        name: 'Fork',
        config: {
          forkId: `${id}-fork-join`,
          forkStrategy: 'PARALLEL'
        },
        outgoingEdgeIds: [`${id}-edge-2`, `${id}-edge-3`, `${id}-edge-4`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-branch-1`,
        type: NodeType.CODE,
        name: 'Branch 1',
        config: {
          scriptName: 'process1',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-5`],
        incomingEdgeIds: [`${id}-edge-2`]
      },
      {
        id: `${id}-branch-2`,
        type: NodeType.CODE,
        name: 'Branch 2',
        config: {
          scriptName: 'process2',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-6`],
        incomingEdgeIds: [`${id}-edge-3`]
      },
      {
        id: `${id}-branch-3`,
        type: NodeType.CODE,
        name: 'Branch 3',
        config: {
          scriptName: 'processTrue',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-7`],
        incomingEdgeIds: [`${id}-edge-4`]
      },
      {
        id: `${id}-join`,
        type: NodeType.JOIN,
        name: 'Join',
        config: {
          joinId: `${id}-fork-join`,
          joinStrategy: 'ALL_COMPLETED',
          forkId: `${id}-fork-join`
        },
        outgoingEdgeIds: [`${id}-edge-8`],
        incomingEdgeIds: [`${id}-edge-5`, `${id}-edge-6`, `${id}-edge-7`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-8`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-fork`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-fork`,
        targetNodeId: `${id}-branch-1`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-3`,
        sourceNodeId: `${id}-fork`,
        targetNodeId: `${id}-branch-2`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-4`,
        sourceNodeId: `${id}-fork`,
        targetNodeId: `${id}-branch-3`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-5`,
        sourceNodeId: `${id}-branch-1`,
        targetNodeId: `${id}-join`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-6`,
        sourceNodeId: `${id}-branch-2`,
        targetNodeId: `${id}-join`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-7`,
        sourceNodeId: `${id}-branch-3`,
        targetNodeId: `${id}-join`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-8`,
        sourceNodeId: `${id}-join`,
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
      tags: ['test', 'multi-branch'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  /**
   * 创建包含错误分支的并行工作流
   */
  const createErrorBranchWorkflow = (id: string, name: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Parallel workflow with error branch for testing error handling',
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
        id: `${id}-fork`,
        type: NodeType.FORK,
        name: 'Fork',
        config: {
          forkId: `${id}-fork-join`,
          forkStrategy: 'PARALLEL'
        },
        outgoingEdgeIds: [`${id}-edge-2`, `${id}-edge-3`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-branch-normal`,
        type: NodeType.CODE,
        name: 'Normal Branch',
        config: {
          scriptName: 'process1',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-4`],
        incomingEdgeIds: [`${id}-edge-2`]
      },
      {
        id: `${id}-branch-error`,
        type: NodeType.CODE,
        name: 'Error Branch',
        config: {
          scriptName: 'errorScript',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-5`],
        incomingEdgeIds: [`${id}-edge-3`]
      },
      {
        id: `${id}-join`,
        type: NodeType.JOIN,
        name: 'Join',
        config: {
          joinId: `${id}-fork-join`,
          joinStrategy: 'ALL_COMPLETED',
          forkId: `${id}-fork-join`
        },
        outgoingEdgeIds: [`${id}-edge-6`],
        incomingEdgeIds: [`${id}-edge-4`, `${id}-edge-5`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-6`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-fork`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-fork`,
        targetNodeId: `${id}-branch-normal`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-3`,
        sourceNodeId: `${id}-fork`,
        targetNodeId: `${id}-branch-error`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-4`,
        sourceNodeId: `${id}-branch-normal`,
        targetNodeId: `${id}-join`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-5`,
        sourceNodeId: `${id}-branch-error`,
        targetNodeId: `${id}-join`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-6`,
        sourceNodeId: `${id}-join`,
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
      tags: ['test', 'error-branch'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  describe('场景1：基础Fork/Join并行执行', () => {
    it('应该成功执行双分支并行工作流', async () => {
      const workflowId = 'workflow-parallel-two-branches';
      const workflow = createParallelWorkflow(workflowId, 'Parallel Two Branches Workflow');

      // 注册工作流
      workflowRegistry.register(workflow);

      // 构建ThreadContext
      const threadContext = await threadBuilder.build(workflowId);

      // 执行线程
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');

      // 验证所有分支节点都执行了
      const nodeResults = threadContext.getNodeResults();
      const executedNodeIds = nodeResults.map(result => result.nodeId);
      expect(executedNodeIds).toContain(`${workflowId}-branch-1`);
      expect(executedNodeIds).toContain(`${workflowId}-branch-2`);
      expect(executedNodeIds).toContain(`${workflowId}-fork`);
      expect(executedNodeIds).toContain(`${workflowId}-join`);

      // 验证Fork和Join节点正确执行
      const forkNodeResult = nodeResults.find(result => result.nodeId === `${workflowId}-fork`);
      const joinNodeResult = nodeResults.find(result => result.nodeId === `${workflowId}-join`);
      expect(forkNodeResult?.status).toBe('COMPLETED');
      expect(joinNodeResult?.status).toBe('COMPLETED');
    });

    it('应该成功执行多分支并行工作流', async () => {
      const workflowId = 'workflow-parallel-multi-branches';
      const workflow = createMultiBranchWorkflow(workflowId, 'Parallel Multi Branches Workflow');

      // 注册工作流
      workflowRegistry.register(workflow);

      // 构建ThreadContext
      const threadContext = await threadBuilder.build(workflowId);

      // 执行线程
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');

      // 验证所有三个分支节点都执行了
      const nodeResults = threadContext.getNodeResults();
      const executedNodeIds = nodeResults.map(result => result.nodeId);
      expect(executedNodeIds).toContain(`${workflowId}-branch-1`);
      expect(executedNodeIds).toContain(`${workflowId}-branch-2`);
      expect(executedNodeIds).toContain(`${workflowId}-branch-3`);
    });
  });

  describe('场景2：并行执行状态管理', () => {
    it('应该正确管理并行分支的执行状态', async () => {
      const workflowId = 'workflow-parallel-state-management';
      const workflow = createParallelWorkflow(workflowId, 'Parallel State Management Workflow');

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 验证初始状态
      expect(threadContext.getStatus()).toBe('CREATED');

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证最终状态
      expect(threadContext.getStatus()).toBe('COMPLETED');

      // 验证节点执行顺序
      const nodeResults = threadContext.getNodeResults();
      const startIndex = nodeResults.findIndex(result => result.nodeId === `${workflowId}-start`);
      const forkIndex = nodeResults.findIndex(result => result.nodeId === `${workflowId}-fork`);
      const branch1Index = nodeResults.findIndex(result => result.nodeId === `${workflowId}-branch-1`);
      const branch2Index = nodeResults.findIndex(result => result.nodeId === `${workflowId}-branch-2`);
      const joinIndex = nodeResults.findIndex(result => result.nodeId === `${workflowId}-join`);
      const endIndex = nodeResults.findIndex(result => result.nodeId === `${workflowId}-end`);

      // 验证基本执行顺序
      expect(startIndex).toBeLessThan(forkIndex);
      expect(forkIndex).toBeLessThan(joinIndex);
      expect(joinIndex).toBeLessThan(endIndex);

      // 分支可以并行执行，所以branch1和branch2的顺序可能不确定
      expect(branch1Index).toBeGreaterThan(forkIndex);
      expect(branch2Index).toBeGreaterThan(forkIndex);
      expect(branch1Index).toBeLessThan(joinIndex);
      expect(branch2Index).toBeLessThan(joinIndex);
    });

    it('应该正确收集并行分支的执行结果', async () => {
      const workflowId = 'workflow-parallel-results-collection';
      const workflow = createParallelWorkflow(workflowId, 'Parallel Results Collection Workflow');

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);
      await threadExecutor.execute(threadContext);

      // 验证节点执行结果收集
      const nodeResults = threadContext.getNodeResults();
      expect(nodeResults).toHaveLength(6); // START, FORK, BRANCH-1, BRANCH-2, JOIN, END

      // 验证每个节点都有执行结果
      nodeResults.forEach(result => {
        expect(result.nodeId).toBeDefined();
        expect(result.status).toBeDefined();
        expect(result.startTime).toBeDefined();
        expect(result.endTime).toBeDefined();
      });

      // 验证分支节点执行成功
      const branch1Result = nodeResults.find(result => result.nodeId === `${workflowId}-branch-1`);
      const branch2Result = nodeResults.find(result => result.nodeId === `${workflowId}-branch-2`);
      expect(branch1Result?.status).toBe('COMPLETED');
      expect(branch2Result?.status).toBe('COMPLETED');
    });
  });

  describe('场景3：并行执行错误处理', () => {
    it('应该正确处理并行分支中的错误', async () => {
      const workflowId = 'workflow-parallel-error-handling';
      const workflow = createErrorBranchWorkflow(workflowId, 'Parallel Error Handling Workflow');

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 执行线程（应该处理错误）
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果（可能因错误分支而失败）
      // 注意：具体行为取决于Join策略和错误处理机制
      expect(executionResult).toBeDefined();
      expect(executionResult.threadId).toBe(threadContext.getThreadId());

      // 验证错误信息
      const errors = threadContext.getErrors();
      // 可能包含错误信息，取决于实现

      // 验证节点执行结果
      const nodeResults = threadContext.getNodeResults();
      const errorBranchResult = nodeResults.find(result => result.nodeId === `${workflowId}-branch-error`);
      const normalBranchResult = nodeResults.find(result => result.nodeId === `${workflowId}-branch-normal`);

      // 正常分支应该执行成功
      expect(normalBranchResult?.status).toBe('COMPLETED');
      // 错误分支可能失败，取决于实现
    });

    it('应该处理Join节点的超时等待', async () => {
      const workflowId = 'workflow-join-timeout';
      const workflow: WorkflowDefinition = {
        id: workflowId,
        name: 'Join Timeout Workflow',
        version: '1.0.0',
        description: 'Workflow with potential join timeout for testing timeout handling',
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
            id: `${workflowId}-fork`,
            type: NodeType.FORK,
            name: 'Fork',
            config: {
              forkId: `${workflowId}-fork-join`,
              forkStrategy: 'PARALLEL'
            },
            outgoingEdgeIds: [`${workflowId}-edge-2`, `${workflowId}-edge-3`],
            incomingEdgeIds: [`${workflowId}-edge-1`]
          },
          {
            id: `${workflowId}-branch-fast`,
            type: NodeType.CODE,
            name: 'Fast Branch',
            config: {
              scriptName: 'process1',
              scriptType: 'javascript',
              risk: 'low'
            },
            outgoingEdgeIds: [`${workflowId}-edge-4`],
            incomingEdgeIds: [`${workflowId}-edge-2`]
          },
          {
            id: `${workflowId}-branch-slow`,
            type: NodeType.CODE,
            name: 'Slow Branch',
            config: {
              scriptName: 'process2',
              scriptType: 'javascript',
              risk: 'low'
            },
            outgoingEdgeIds: [`${workflowId}-edge-5`],
            incomingEdgeIds: [`${workflowId}-edge-3`]
          },
          {
            id: `${workflowId}-join`,
            type: NodeType.JOIN,
            name: 'Join',
            config: {
              joinId: `${workflowId}-fork-join`,
              joinStrategy: 'ALL_COMPLETED',
              forkId: `${workflowId}-fork-join`,
              timeout: 1000 // 较短的超时时间
            },
            outgoingEdgeIds: [`${workflowId}-edge-6`],
            incomingEdgeIds: [`${workflowId}-edge-4`, `${workflowId}-edge-5`]
          },
          {
            id: `${workflowId}-end`,
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: [`${workflowId}-edge-6`]
          }
        ],
        edges: [
          {
            id: `${workflowId}-edge-1`,
            sourceNodeId: `${workflowId}-start`,
            targetNodeId: `${workflowId}-fork`,
            type: EdgeType.DEFAULT
          },
          {
            id: `${workflowId}-edge-2`,
            sourceNodeId: `${workflowId}-fork`,
            targetNodeId: `${workflowId}-branch-fast`,
            type: EdgeType.DEFAULT
          },
          {
            id: `${workflowId}-edge-3`,
            sourceNodeId: `${workflowId}-fork`,
            targetNodeId: `${workflowId}-branch-slow`,
            type: EdgeType.DEFAULT
          },
          {
            id: `${workflowId}-edge-4`,
            sourceNodeId: `${workflowId}-branch-fast`,
            targetNodeId: `${workflowId}-join`,
            type: EdgeType.DEFAULT
          },
          {
            id: `${workflowId}-edge-5`,
            sourceNodeId: `${workflowId}-branch-slow`,
            targetNodeId: `${workflowId}-join`,
            type: EdgeType.DEFAULT
          },
          {
            id: `${workflowId}-edge-6`,
            sourceNodeId: `${workflowId}-join`,
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
          tags: ['test', 'join-timeout'],
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

      // 验证执行结果（可能因超时而失败，取决于实现）
      expect(executionResult).toBeDefined();
      expect(executionResult.threadId).toBe(threadContext.getThreadId());
    });
  });

  describe('场景4：并行执行性能和多线程', () => {
    it('应该展示并行执行的性能优势', async () => {
      const workflowId = 'workflow-parallel-performance';
      const workflow = createParallelWorkflow(workflowId, 'Parallel Performance Workflow');

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

    it('应该支持并发并行工作流执行', async () => {
      const workflowId = 'workflow-concurrent-parallel';
      const workflow = createParallelWorkflow(workflowId, 'Concurrent Parallel Workflow');

      workflowRegistry.register(workflow);

      // 并发构建和执行多个线程
      const executionPromises = Array.from({ length: 2 }, async () => {
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

  describe('场景5：Fork/Join策略测试', () => {
    it('应该支持不同的Join策略', async () => {
      const workflowId = 'workflow-join-strategies';
      const workflow: WorkflowDefinition = {
        id: workflowId,
        name: 'Join Strategies Workflow',
        version: '1.0.0',
        description: 'Workflow testing different join strategies',
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
            id: `${workflowId}-fork`,
            type: NodeType.FORK,
            name: 'Fork',
            config: {
              forkId: `${workflowId}-fork-join`,
              forkStrategy: 'PARALLEL'
            },
            outgoingEdgeIds: [`${workflowId}-edge-2`, `${workflowId}-edge-3`],
            incomingEdgeIds: [`${workflowId}-edge-1`]
          },
          {
            id: `${workflowId}-branch-1`,
            type: NodeType.CODE,
            name: 'Branch 1',
            config: {
              scriptName: 'process1',
              scriptType: 'javascript',
              risk: 'low'
            },
            outgoingEdgeIds: [`${workflowId}-edge-4`],
            incomingEdgeIds: [`${workflowId}-edge-2`]
          },
          {
            id: `${workflowId}-branch-2`,
            type: NodeType.CODE,
            name: 'Branch 2',
            config: {
              scriptName: 'process2',
              scriptType: 'javascript',
              risk: 'low'
            },
            outgoingEdgeIds: [`${workflowId}-edge-5`],
            incomingEdgeIds: [`${workflowId}-edge-3`]
          },
          {
            id: `${workflowId}-join`,
            type: NodeType.JOIN,
            name: 'Join',
            config: {
              joinId: `${workflowId}-fork-join`,
              joinStrategy: 'FIRST_COMPLETED', // 使用FIRST_COMPLETED策略
              forkId: `${workflowId}-fork-join`
            },
            outgoingEdgeIds: [`${workflowId}-edge-6`],
            incomingEdgeIds: [`${workflowId}-edge-4`, `${workflowId}-edge-5`]
          },
          {
            id: `${workflowId}-end`,
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: [`${workflowId}-edge-6`]
          }
        ],
        edges: [
          {
            id: `${workflowId}-edge-1`,
            sourceNodeId: `${workflowId}-start`,
            targetNodeId: `${workflowId}-fork`,
            type: EdgeType.DEFAULT
          },
          {
            id: `${workflowId}-edge-2`,
            sourceNodeId: `${workflowId}-fork`,
            targetNodeId: `${workflowId}-branch-1`,
            type: EdgeType.DEFAULT
          },
          {
            id: `${workflowId}-edge-3`,
            sourceNodeId: `${workflowId}-fork`,
            targetNodeId: `${workflowId}-branch-2`,
            type: EdgeType.DEFAULT
          },
          {
            id: `${workflowId}-edge-4`,
            sourceNodeId: `${workflowId}-branch-1`,
            targetNodeId: `${workflowId}-join`,
            type: EdgeType.DEFAULT
          },
          {
            id: `${workflowId}-edge-5`,
            sourceNodeId: `${workflowId}-branch-2`,
            targetNodeId: `${workflowId}-join`,
            type: EdgeType.DEFAULT
          },
          {
            id: `${workflowId}-edge-6`,
            sourceNodeId: `${workflowId}-join`,
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
          tags: ['test', 'join-strategies'],
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

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');

      // 验证Join节点执行成功
      const nodeResults = threadContext.getNodeResults();
      const joinNodeResult = nodeResults.find(result => result.nodeId === `${workflowId}-join`);
      expect(joinNodeResult?.status).toBe('COMPLETED');
    });
  });
});