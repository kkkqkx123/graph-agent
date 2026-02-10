/**
 * 子工作流和嵌套执行集成测试
 * 
 * 测试范围：
 * - SUBGRAPH节点的子工作流执行
 * - 嵌套工作流的递归处理
 * - 子工作流边界标记和上下文传递
 * - 输入输出映射和变量作用域
 * - 嵌套执行的状态管理
 * - 递归深度限制和错误处理
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

describe('子工作流和嵌套执行集成测试', () => {
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
   * 创建简单子工作流定义
   */
  const createSimpleSubworkflow = (id: string, name: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Simple subworkflow for testing',
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
          scriptName: 'process1',
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
      tags: ['test', 'subworkflow'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  /**
   * 创建包含子工作流的主工作流定义
   */
  const createMainWorkflowWithSubgraph = (id: string, name: string, subworkflowId: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Main workflow containing subgraph reference',
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
        id: `${id}-pre-process`,
        type: NodeType.CODE,
        name: 'Pre Process',
        config: {
          scriptName: 'process1',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-2`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-subgraph-node`,
        type: NodeType.SUBGRAPH,
        name: 'Subgraph Boundary',
        config: {
          subgraphId: subworkflowId,
          inputMapping: {
            parentData: 'input.data'
          },
          outputMapping: {
            subgraphResult: 'output.result'
          },
          async: false
        },
        outgoingEdgeIds: [`${id}-edge-3`],
        incomingEdgeIds: [`${id}-edge-2`]
      },
      {
        id: `${id}-post-process`,
        type: NodeType.CODE,
        name: 'Post Process',
        config: {
          scriptName: 'process2',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-4`],
        incomingEdgeIds: [`${id}-edge-3`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-4`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-pre-process`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-pre-process`,
        targetNodeId: `${id}-subgraph-node`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-3`,
        sourceNodeId: `${id}-subgraph-node`,
        targetNodeId: `${id}-post-process`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-4`,
        sourceNodeId: `${id}-post-process`,
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
      tags: ['test', 'subgraph'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  /**
   * 创建嵌套子工作流定义（子工作流引用另一个子工作流）
   */
  const createNestedSubworkflow = (id: string, name: string, innerSubworkflowId: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Nested subworkflow containing another subworkflow',
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
        id: `${id}-inner-subgraph`,
        type: NodeType.SUBGRAPH,
        name: 'Inner Subgraph',
        config: {
          subgraphId: innerSubworkflowId,
          inputMapping: {},
          outputMapping: {},
          async: false
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
        targetNodeId: `${id}-inner-subgraph`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-inner-subgraph`,
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
      tags: ['test', 'nested'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  describe('场景1：基础子工作流执行', () => {
    it('应该成功执行包含子工作流的主工作流', async () => {
      const subworkflowId = 'simple-subworkflow';
      const mainWorkflowId = 'main-workflow-with-subgraph';
      
      // 创建子工作流
      const subworkflow = createSimpleSubworkflow(subworkflowId, 'Simple Subworkflow');
      
      // 创建主工作流
      const mainWorkflow = createMainWorkflowWithSubgraph(mainWorkflowId, 'Main Workflow With Subgraph', subworkflowId);

      // 先注册子工作流
      workflowRegistry.register(subworkflow);

      // 再注册主工作流
      workflowRegistry.register(mainWorkflow);

      // 构建ThreadContext
      const threadContext = await threadBuilder.build(mainWorkflowId);

      // 执行线程
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');

      // 验证所有节点都执行了
      const nodeResults = threadContext.getNodeResults();
      const executedNodeIds = nodeResults.map(result => result.nodeId);
      expect(executedNodeIds).toContain(`${mainWorkflowId}-start`);
      expect(executedNodeIds).toContain(`${mainWorkflowId}-pre-process`);
      expect(executedNodeIds).toContain(`${mainWorkflowId}-subgraph-node`);
      expect(executedNodeIds).toContain(`${mainWorkflowId}-post-process`);
      expect(executedNodeIds).toContain(`${mainWorkflowId}-end`);

      // 验证SUBGRAPH节点正确执行
      const subgraphNodeResult = nodeResults.find(result => result.nodeId === `${mainWorkflowId}-subgraph-node`);
      expect(subgraphNodeResult?.status).toBe('COMPLETED');
    });

    it('应该正确处理子工作流的输入输出映射', async () => {
      const subworkflowId = 'subworkflow-with-mapping';
      const mainWorkflowId = 'main-workflow-with-mapping';
      
      // 创建子工作流
      const subworkflow = createSimpleSubworkflow(subworkflowId, 'Subworkflow With Mapping');
      
      // 创建主工作流
      const mainWorkflow = createMainWorkflowWithSubgraph(mainWorkflowId, 'Main Workflow With Mapping', subworkflowId);

      // 注册工作流
      workflowRegistry.register(subworkflow);
      workflowRegistry.register(mainWorkflow);

      // 构建ThreadContext（带输入数据）
      const threadOptions: ThreadOptions = {
        input: { data: 'test input data' }
      };
      const threadContext = await threadBuilder.build(mainWorkflowId, threadOptions);

      // 执行线程
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');

      // 验证输入数据正确传递（通过映射）
      // 具体验证取决于实现，这里主要验证没有错误
      expect(executionResult).toBeDefined();
    });
  });

  describe('场景2：嵌套子工作流执行', () => {
    it('应该成功执行嵌套子工作流', async () => {
      const innerSubworkflowId = 'inner-subworkflow';
      const outerSubworkflowId = 'outer-subworkflow';
      const mainWorkflowId = 'main-workflow-nested';
      
      // 创建最内层子工作流
      const innerSubworkflow = createSimpleSubworkflow(innerSubworkflowId, 'Inner Subworkflow');
      
      // 创建外层子工作流（引用内层）
      const outerSubworkflow = createNestedSubworkflow(outerSubworkflowId, 'Outer Subworkflow', innerSubworkflowId);
      
      // 创建主工作流（引用外层）
      const mainWorkflow = createMainWorkflowWithSubgraph(mainWorkflowId, 'Main Workflow Nested', outerSubworkflowId);

      // 按依赖顺序注册工作流
      workflowRegistry.register(innerSubworkflow);
      workflowRegistry.register(outerSubworkflow);
      workflowRegistry.register(mainWorkflow);

      // 构建ThreadContext
      const threadContext = await threadBuilder.build(mainWorkflowId);

      // 执行线程
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');

      // 验证所有层级的SUBGRAPH节点都执行了
      const nodeResults = threadContext.getNodeResults();
      const executedNodeIds = nodeResults.map(result => result.nodeId);
      expect(executedNodeIds).toContain(`${mainWorkflowId}-subgraph-node`);
    });

    it('应该正确处理嵌套子工作流的递归深度', async () => {
      const workflows: WorkflowDefinition[] = [];
      
      // 创建深度为3的子工作流链
      for (let i = 0; i < 3; i++) {
        const workflowId = `subworkflow-depth-${i}`;
        const parentWorkflowId = i > 0 ? `subworkflow-depth-${i-1}` : undefined;
        
        if (i === 0) {
          // 最内层子工作流
          workflows.push(createSimpleSubworkflow(workflowId, `Subworkflow Depth ${i}`));
        } else {
          // 嵌套子工作流
          workflows.push(createNestedSubworkflow(workflowId, `Subworkflow Depth ${i}`, parentWorkflowId!));
        }
      }

      // 创建主工作流（引用最外层子工作流）
      const mainWorkflowId = 'main-workflow-depth';
      const mainWorkflow = createMainWorkflowWithSubgraph(mainWorkflowId, 'Main Workflow Depth', 'subworkflow-depth-2');

      // 注册所有工作流
      workflows.forEach(workflow => workflowRegistry.register(workflow));
      workflowRegistry.register(mainWorkflow);

      // 构建ThreadContext
      const threadContext = await threadBuilder.build(mainWorkflowId);

      // 执行线程（应该在递归深度限制内成功）
      const executionResult = await threadExecutor.execute(threadContext);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');
    });
  });

  describe('场景3：子工作流边界和上下文管理', () => {
    it('应该正确管理子工作流边界', async () => {
      const subworkflowId = 'subworkflow-boundary';
      const mainWorkflowId = 'main-workflow-boundary';
      
      const subworkflow = createSimpleSubworkflow(subworkflowId, 'Subworkflow Boundary');
      const mainWorkflow = createMainWorkflowWithSubgraph(mainWorkflowId, 'Main Workflow Boundary', subworkflowId);

      workflowRegistry.register(subworkflow);
      workflowRegistry.register(mainWorkflow);

      const threadContext = await threadBuilder.build(mainWorkflowId);

      // 验证初始状态
      expect(threadContext.getStatus()).toBe('CREATED');

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证最终状态
      expect(threadContext.getStatus()).toBe('COMPLETED');

      // 验证节点执行顺序
      const nodeResults = threadContext.getNodeResults();
      const startIndex = nodeResults.findIndex(result => result.nodeId === `${mainWorkflowId}-start`);
      const preProcessIndex = nodeResults.findIndex(result => result.nodeId === `${mainWorkflowId}-pre-process`);
      const subgraphIndex = nodeResults.findIndex(result => result.nodeId === `${mainWorkflowId}-subgraph-node`);
      const postProcessIndex = nodeResults.findIndex(result => result.nodeId === `${mainWorkflowId}-post-process`);
      const endIndex = nodeResults.findIndex(result => result.nodeId === `${mainWorkflowId}-end`);

      // 验证执行顺序
      expect(startIndex).toBeLessThan(preProcessIndex);
      expect(preProcessIndex).toBeLessThan(subgraphIndex);
      expect(subgraphIndex).toBeLessThan(postProcessIndex);
      expect(postProcessIndex).toBeLessThan(endIndex);
    });

    it('应该正确管理子工作流上下文', async () => {
      const subworkflowId = 'subworkflow-context';
      const mainWorkflowId = 'main-workflow-context';
      
      const subworkflow = createSimpleSubworkflow(subworkflowId, 'Subworkflow Context');
      const mainWorkflow = createMainWorkflowWithSubgraph(mainWorkflowId, 'Main Workflow Context', subworkflowId);

      workflowRegistry.register(subworkflow);
      workflowRegistry.register(mainWorkflow);

      const threadContext = await threadBuilder.build(mainWorkflowId);

      // 验证执行上下文初始化
      expect(threadContext.executionContext).toBe(executionContext);

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证执行上下文在过程中保持稳定
      expect(threadContext.executionContext).toBe(executionContext);

      // 验证变量作用域管理
      expect(threadContext.thread.variableScopes.global).toBeDefined();
      expect(threadContext.thread.variableScopes.thread).toBeDefined();
      // 子工作流执行时应该创建子图作用域
    });
  });

  describe('场景4：子工作流错误处理', () => {
    it('应该处理不存在的子工作流引用', async () => {
      const mainWorkflowId = 'main-workflow-invalid-subgraph';
      const mainWorkflow: WorkflowDefinition = {
        id: mainWorkflowId,
        name: 'Main Workflow Invalid Subgraph',
        version: '1.0.0',
        description: 'Main workflow with invalid subgraph reference',
        nodes: [
          {
            id: `${mainWorkflowId}-start`,
            type: NodeType.START,
            name: 'Start',
            config: {},
            outgoingEdgeIds: [`${mainWorkflowId}-edge-1`],
            incomingEdgeIds: []
          },
          {
            id: `${mainWorkflowId}-subgraph-node`,
            type: NodeType.SUBGRAPH,
            name: 'Subgraph Node',
            config: {
              subgraphId: 'non-existent-subworkflow',
              inputMapping: {},
              outputMapping: {}
            },
            outgoingEdgeIds: [`${mainWorkflowId}-edge-2`],
            incomingEdgeIds: [`${mainWorkflowId}-edge-1`]
          },
          {
            id: `${mainWorkflowId}-end`,
            type: NodeType.END,
            name: 'End',
            config: {},
            outgoingEdgeIds: [],
            incomingEdgeIds: [`${mainWorkflowId}-edge-2`]
          }
        ],
        edges: [
          {
            id: `${mainWorkflowId}-edge-1`,
            sourceNodeId: `${mainWorkflowId}-start`,
            targetNodeId: `${mainWorkflowId}-subgraph-node`,
            type: EdgeType.DEFAULT
          },
          {
            id: `${mainWorkflowId}-edge-2`,
            sourceNodeId: `${mainWorkflowId}-subgraph-node`,
            targetNodeId: `${mainWorkflowId}-end`,
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
          tags: ['test', 'invalid-subgraph'],
          category: 'test'
        },
        availableTools: {
          initial: new Set()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 注册主工作流（应该失败，因为子工作流不存在）
      expect(() => workflowRegistry.register(mainWorkflow)).toThrow(ValidationError);
    });

    it('应该处理超过最大递归深度的子工作流', async () => {
      // 创建深度为4的子工作流链（超过默认的maxRecursionDepth=3）
      const workflows: WorkflowDefinition[] = [];
      
      for (let i = 0; i < 4; i++) {
        const workflowId = `subworkflow-deep-${i}`;
        const parentWorkflowId = i > 0 ? `subworkflow-deep-${i-1}` : undefined;
        
        if (i === 0) {
          workflows.push(createSimpleSubworkflow(workflowId, `Subworkflow Deep ${i}`));
        } else {
          workflows.push(createNestedSubworkflow(workflowId, `Subworkflow Deep ${i}`, parentWorkflowId!));
        }
      }

      // 创建主工作流
      const mainWorkflowId = 'main-workflow-deep';
      const mainWorkflow = createMainWorkflowWithSubgraph(mainWorkflowId, 'Main Workflow Deep', 'subworkflow-deep-3');

      // 注册所有子工作流
      workflows.forEach(workflow => workflowRegistry.register(workflow));

      // 注册主工作流应该失败（超过递归深度限制）
      expect(() => workflowRegistry.register(mainWorkflow)).toThrow(ValidationError);
    });
  });

  describe('场景5：子工作流性能和多线程', () => {
    it('应该快速执行包含子工作流的工作流', async () => {
      const subworkflowId = 'subworkflow-performance';
      const mainWorkflowId = 'main-workflow-performance';
      
      const subworkflow = createSimpleSubworkflow(subworkflowId, 'Subworkflow Performance');
      const mainWorkflow = createMainWorkflowWithSubgraph(mainWorkflowId, 'Main Workflow Performance', subworkflowId);

      workflowRegistry.register(subworkflow);
      workflowRegistry.register(mainWorkflow);

      const startTime = Date.now();

      const threadContext = await threadBuilder.build(mainWorkflowId);
      const executionResult = await threadExecutor.execute(threadContext);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 完整执行流程应该在合理时间内完成
      expect(duration).toBeLessThan(5000);

      // 验证执行结果
      expect(executionResult.success).toBe(true);
      expect(executionResult.status).toBe('COMPLETED');
    });

    it('应该支持并发子工作流执行', async () => {
      const subworkflowId = 'subworkflow-concurrent';
      const mainWorkflowId = 'main-workflow-concurrent';
      
      const subworkflow = createSimpleSubworkflow(subworkflowId, 'Subworkflow Concurrent');
      const mainWorkflow = createMainWorkflowWithSubgraph(mainWorkflowId, 'Main Workflow Concurrent', subworkflowId);

      workflowRegistry.register(subworkflow);
      workflowRegistry.register(mainWorkflow);

      // 并发构建和执行多个线程
      const executionPromises = Array.from({ length: 2 }, async () => {
        const threadContext = await threadBuilder.build(mainWorkflowId);
        return threadExecutor.execute(threadContext);
      });

      const executionResults = await Promise.all(executionPromises);

      // 验证所有执行成功
      executionResults.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.status).toBe('COMPLETED');
        expect(result.workflowId).toBe(mainWorkflowId);
      });

      // 验证所有线程有不同的ID
      const threadIds = executionResults.map(result => result.threadId);
      const uniqueThreadIds = new Set(threadIds);
      expect(uniqueThreadIds.size).toBe(executionResults.length);
    });
  });
});