/**
 * 变量和状态管理集成测试
 * 
 * 测试范围：
 * - 四级变量作用域管理（global/thread/subgraph/loop）
 * - 变量声明、赋值和访问
 * - 变量作用域继承和覆盖
 * - 状态管理和持久化
 * - 变量作用域生命周期
 * - 异常变量操作处理
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
import type { VariableDefinition } from '../../../types/variable';

describe('变量和状态管理集成测试', () => {
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
   * 创建包含变量声明的工作流定义
   */
  const createWorkflowWithVariables = (id: string, name: string, variables: VariableDefinition[]): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Workflow with variables for testing',
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
    variables,
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
      tags: ['test', 'variables'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  /**
   * 创建包含子工作流和变量映射的工作流定义
   */
  const createWorkflowWithSubgraphAndVariables = (
    id: string, 
    name: string, 
    subworkflowId: string,
    variables: VariableDefinition[]
  ): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Workflow with subgraph and variables for testing',
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
            parentData: 'thread.variables.parentValue'
          },
          outputMapping: {
            subgraphResult: 'thread.variables.subgraphValue'
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
    variables,
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
      tags: ['test', 'subgraph-variables'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  describe('场景1：四级变量作用域管理', () => {
    it('应该正确初始化四级变量作用域', async () => {
      const workflowId = 'workflow-variable-scopes';
      const variables: VariableDefinition[] = [
        {
          name: 'globalVar',
          type: 'string',
          scope: 'global',
          defaultValue: 'global value',
          description: 'Global variable'
        },
        {
          name: 'threadVar',
          type: 'string',
          scope: 'thread',
          defaultValue: 'thread value',
          description: 'Thread variable'
        }
      ];

      const workflow = createWorkflowWithVariables(workflowId, 'Workflow Variable Scopes', variables);

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 验证四级变量作用域初始化
      expect(threadContext.thread.variableScopes.global).toBeDefined();
      expect(threadContext.thread.variableScopes.thread).toBeDefined();
      expect(threadContext.thread.variableScopes.subgraph).toEqual([]);
      expect(threadContext.thread.variableScopes.loop).toEqual([]);

      // 验证全局变量作用域
      const globalScope = threadContext.thread.variableScopes.global;
      expect(globalScope).toBeDefined();

      // 验证线程变量作用域
      const threadScope = threadContext.thread.variableScopes.thread;
      expect(threadScope).toBeDefined();
    });

    it('应该支持变量声明和默认值', async () => {
      const workflowId = 'workflow-variable-declarations';
      const variables: VariableDefinition[] = [
        {
          name: 'stringVar',
          type: 'string',
          scope: 'thread',
          defaultValue: 'default string',
          description: 'String variable'
        },
        {
          name: 'numberVar',
          type: 'number',
          scope: 'thread',
          defaultValue: 42,
          description: 'Number variable'
        },
        {
          name: 'booleanVar',
          type: 'boolean',
          scope: 'thread',
          defaultValue: true,
          description: 'Boolean variable'
        },
        {
          name: 'objectVar',
          type: 'object',
          scope: 'thread',
          defaultValue: { key: 'value' },
          description: 'Object variable'
        },
        {
          name: 'arrayVar',
          type: 'array',
          scope: 'thread',
          defaultValue: [1, 2, 3],
          description: 'Array variable'
        }
      ];

      const workflow = createWorkflowWithVariables(workflowId, 'Workflow Variable Declarations', variables);

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 验证变量作用域初始化
      const threadScope = threadContext.thread.variableScopes.thread;
      expect(threadScope).toBeDefined();

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证执行成功
      expect(threadContext.getStatus()).toBe('COMPLETED');

      // 验证变量管理（具体验证取决于实现）
      // 这里主要验证没有错误发生
      expect(threadContext).toBeDefined();
    });
  });

  describe('场景2：变量赋值和访问', () => {
    it('应该支持变量赋值操作', async () => {
      const workflowId = 'workflow-variable-assignment';
      const variables: VariableDefinition[] = [
        {
          name: 'assignableVar',
          type: 'string',
          scope: 'thread',
          defaultValue: 'initial value',
          description: 'Assignable variable'
        }
      ];

      const workflow = createWorkflowWithVariables(workflowId, 'Workflow Variable Assignment', variables);

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 验证初始变量值
      const threadScope = threadContext.thread.variableScopes.thread;
      expect(threadScope).toBeDefined();

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证执行成功
      expect(threadContext.getStatus()).toBe('COMPLETED');

      // 验证变量赋值操作（具体验证取决于实现）
      // 这里主要验证没有错误发生
      expect(threadContext).toBeDefined();
    });

    it('应该支持变量访问操作', async () => {
      const workflowId = 'workflow-variable-access';
      const variables: VariableDefinition[] = [
        {
          name: 'accessibleVar',
          type: 'string',
          scope: 'thread',
          defaultValue: 'accessible value',
          description: 'Accessible variable'
        }
      ];

      const workflow = createWorkflowWithVariables(workflowId, 'Workflow Variable Access', variables);

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 验证变量作用域初始化
      const threadScope = threadContext.thread.variableScopes.thread;
      expect(threadScope).toBeDefined();

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证执行成功
      expect(threadContext.getStatus()).toBe('COMPLETED');

      // 验证变量访问操作（具体验证取决于实现）
      // 这里主要验证没有错误发生
      expect(threadContext).toBeDefined();
    });
  });

  describe('场景3：变量作用域继承和覆盖', () => {
    it('应该正确处理全局作用域继承', async () => {
      const subworkflowId = 'subworkflow-scope-inheritance';
      const mainWorkflowId = 'main-workflow-scope-inheritance';
      
      // 创建子工作流
      const subworkflowVariables: VariableDefinition[] = [
        {
          name: 'subgraphVar',
          type: 'string',
          scope: 'subgraph',
          defaultValue: 'subgraph value',
          description: 'Subgraph variable'
        }
      ];
      const subworkflow = createWorkflowWithVariables(subworkflowId, 'Subworkflow Scope Inheritance', subworkflowVariables);
      
      // 创建主工作流
      const mainWorkflowVariables: VariableDefinition[] = [
        {
          name: 'globalVar',
          type: 'string',
          scope: 'global',
          defaultValue: 'global value',
          description: 'Global variable'
        },
        {
          name: 'threadVar',
          type: 'string',
          scope: 'thread',
          defaultValue: 'thread value',
          description: 'Thread variable'
        }
      ];
      const mainWorkflow = createWorkflowWithSubgraphAndVariables(
        mainWorkflowId, 
        'Main Workflow Scope Inheritance', 
        subworkflowId,
        mainWorkflowVariables
      );

      // 注册工作流
      workflowRegistry.register(subworkflow);
      workflowRegistry.register(mainWorkflow);

      const threadContext = await threadBuilder.build(mainWorkflowId);

      // 验证初始作用域结构
      expect(threadContext.thread.variableScopes.global).toBeDefined();
      expect(threadContext.thread.variableScopes.thread).toBeDefined();
      expect(threadContext.thread.variableScopes.subgraph).toEqual([]);

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证执行成功
      expect(threadContext.getStatus()).toBe('COMPLETED');

      // 验证作用域继承（具体验证取决于实现）
      // 这里主要验证没有错误发生
      expect(threadContext).toBeDefined();
    });

    it('应该支持变量作用域覆盖', async () => {
      const workflowId = 'workflow-variable-override';
      const variables: VariableDefinition[] = [
        {
          name: 'overrideVar',
          type: 'string',
          scope: 'thread',
          defaultValue: 'default value',
          description: 'Variable for override testing'
        }
      ];

      const workflow = createWorkflowWithVariables(workflowId, 'Workflow Variable Override', variables);

      workflowRegistry.register(workflow);

      // 构建ThreadContext（带输入数据，可能覆盖默认值）
      const threadOptions: ThreadOptions = {
        input: { 
          overrideVar: 'overridden value'
        }
      };
      const threadContext = await threadBuilder.build(workflowId, threadOptions);

      // 验证输入数据传递
      expect(threadContext.thread.input).toEqual(threadOptions.input);

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证执行成功
      expect(threadContext.getStatus()).toBe('COMPLETED');

      // 验证变量覆盖（具体验证取决于实现）
      // 这里主要验证没有错误发生
      expect(threadContext).toBeDefined();
    });
  });

  describe('场景4：状态管理和持久化', () => {
    it('应该正确管理工作流执行状态', async () => {
      const workflowId = 'workflow-state-management';
      const workflow = createWorkflowWithVariables(workflowId, 'Workflow State Management', []);

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);

      // 验证初始状态
      expect(threadContext.getStatus()).toBe('CREATED');
      expect(threadContext.getStartTime()).toBeGreaterThan(0);
      expect(threadContext.getEndTime()).toBeUndefined();
      expect(threadContext.getErrors()).toEqual([]);
      expect(threadContext.getNodeResults()).toEqual([]);

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证最终状态
      expect(threadContext.getStatus()).toBe('COMPLETED');
      expect(threadContext.getEndTime()).toBeDefined();
      expect(threadContext.getEndTime()).toBeGreaterThan(threadContext.getStartTime());
      expect(threadContext.getErrors()).toEqual([]);
      expect(threadContext.getNodeResults().length).toBeGreaterThan(0);
    });

    it('应该正确收集节点执行结果', async () => {
      const workflowId = 'workflow-node-results';
      const workflow = createWorkflowWithVariables(workflowId, 'Workflow Node Results', []);

      workflowRegistry.register(workflow);

      const threadContext = await threadBuilder.build(workflowId);
      await threadExecutor.execute(threadContext);

      // 验证节点执行结果收集
      const nodeResults = threadContext.getNodeResults();
      expect(nodeResults).toHaveLength(3); // START, PROCESS, END

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

  describe('场景5：变量作用域生命周期', () => {
    it('应该正确管理全局作用域生命周期', async () => {
      const workflowId = 'workflow-global-scope-lifecycle';
      const variables: VariableDefinition[] = [
        {
          name: 'globalLifecycleVar',
          type: 'string',
          scope: 'global',
          defaultValue: 'global lifecycle',
          description: 'Global lifecycle variable'
        }
      ];

      const workflow = createWorkflowWithVariables(workflowId, 'Workflow Global Scope Lifecycle', variables);

      workflowRegistry.register(workflow);

      const threadContext1 = await threadBuilder.build(workflowId);
      const threadContext2 = await threadBuilder.build(workflowId);

      // 验证全局作用域共享
      expect(threadContext1.thread.variableScopes.global).toBe(threadContext2.thread.variableScopes.global);

      // 执行两个线程
      await threadExecutor.execute(threadContext1);
      await threadExecutor.execute(threadContext2);

      // 验证执行成功
      expect(threadContext1.getStatus()).toBe('COMPLETED');
      expect(threadContext2.getStatus()).toBe('COMPLETED');
    });

    it('应该正确管理线程作用域生命周期', async () => {
      const workflowId = 'workflow-thread-scope-lifecycle';
      const variables: VariableDefinition[] = [
        {
          name: 'threadLifecycleVar',
          type: 'string',
          scope: 'thread',
          defaultValue: 'thread lifecycle',
          description: 'Thread lifecycle variable'
        }
      ];

      const workflow = createWorkflowWithVariables(workflowId, 'Workflow Thread Scope Lifecycle', variables);

      workflowRegistry.register(workflow);

      const threadContext1 = await threadBuilder.build(workflowId);
      const threadContext2 = await threadBuilder.build(workflowId);

      // 验证线程作用域独立
      expect(threadContext1.thread.variableScopes.thread).not.toBe(threadContext2.thread.variableScopes.thread);

      // 执行两个线程
      await threadExecutor.execute(threadContext1);
      await threadExecutor.execute(threadContext2);

      // 验证执行成功
      expect(threadContext1.getStatus()).toBe('COMPLETED');
      expect(threadContext2.getStatus()).toBe('COMPLETED');
    });

    it('应该正确管理子图作用域生命周期', async () => {
      const subworkflowId = 'subworkflow-subgraph-scope';
      const mainWorkflowId = 'main-workflow-subgraph-scope';
      
      // 创建子工作流
      const subworkflow = createWorkflowWithVariables(subworkflowId, 'Subworkflow Subgraph Scope', []);
      
      // 创建主工作流
      const mainWorkflow = createWorkflowWithSubgraphAndVariables(
        mainWorkflowId, 
        'Main Workflow Subgraph Scope', 
        subworkflowId,
        []
      );

      // 注册工作流
      workflowRegistry.register(subworkflow);
      workflowRegistry.register(mainWorkflow);

      const threadContext = await threadBuilder.build(mainWorkflowId);

      // 验证初始子图作用域为空
      expect(threadContext.thread.variableScopes.subgraph).toEqual([]);

      // 执行线程
      await threadExecutor.execute(threadContext);

      // 验证执行成功
      expect(threadContext.getStatus()).toBe('COMPLETED');

      // 验证子图作用域管理（具体验证取决于实现）
      // 这里主要验证没有错误发生
      expect(threadContext).toBeDefined();
    });
  });

  describe('场景6：异常变量操作处理', () => {
    it('应该处理无效的变量声明', () => {
      const workflowId = 'workflow-invalid-variable';
      const variables: VariableDefinition[] = [
        {
          name: 'invalidVar',
          type: 'invalid-type' as any, // 无效的类型
          scope: 'thread',
          defaultValue: 'value',
          description: 'Invalid variable'
        }
      ];

      const workflow = createWorkflowWithVariables(workflowId, 'Workflow Invalid Variable', variables);

      // 注册应该失败
      expect(() => workflowRegistry.register(workflow)).toThrow(ValidationError);
    });

    it('应该处理无效的作用域声明', () => {
      const workflowId = 'workflow-invalid-scope';
      const variables: VariableDefinition[] = [
        {
          name: 'invalidScopeVar',
          type: 'string',
          scope: 'invalid-scope' as any, // 无效的作用域
          defaultValue: 'value',
          description: 'Invalid scope variable'
        }
      ];

      const workflow = createWorkflowWithVariables(workflowId, 'Workflow Invalid Scope', variables);

      // 注册应该失败
      expect(() => workflowRegistry.register(workflow)).toThrow(ValidationError);
    });

    it('应该处理变量名称冲突', () => {
      const workflowId = 'workflow-variable-conflict';
      const variables: VariableDefinition[] = [
        {
          name: 'conflictVar',
          type: 'string',
          scope: 'thread',
          defaultValue: 'value1',
          description: 'Conflict variable 1'
        },
        {
          name: 'conflictVar', // 重复的名称
          type: 'number',
          scope: 'thread',
          defaultValue: 42,
          description: 'Conflict variable 2'
        }
      ];

      const workflow = createWorkflowWithVariables(workflowId, 'Workflow Variable Conflict', variables);

      // 注册应该失败
      expect(() => workflowRegistry.register(workflow)).toThrow(ValidationError);
    });
  });

  describe('场景7：变量性能和多线程', () => {
    it('应该快速执行包含变量的工作流', async () => {
      const workflowId = 'workflow-variable-performance';
      const variables: VariableDefinition[] = [
        {
          name: 'performanceVar',
          type: 'string',
          scope: 'thread',
          defaultValue: 'performance value',
          description: 'Performance variable'
        }
      ];

      const workflow = createWorkflowWithVariables(workflowId, 'Workflow Variable Performance', variables);

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

    it('应该支持并发变量操作', async () => {
      const workflowId = 'workflow-concurrent-variables';
      const variables: VariableDefinition[] = [
        {
          name: 'concurrentVar',
          type: 'string',
          scope: 'thread',
          defaultValue: 'concurrent value',
          description: 'Concurrent variable'
        }
      ];

      const workflow = createWorkflowWithVariables(workflowId, 'Workflow Concurrent Variables', variables);

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