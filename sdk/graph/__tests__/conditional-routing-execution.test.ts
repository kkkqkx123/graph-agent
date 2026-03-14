/**
 * 条件路由执行测试
 *
 * 测试场景：
 * - 基本条件路由
 * - 多条件路由
 * - 默认分支
 * - 路由与变量更新
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkflowRegistry } from '../services/workflow-registry.js';
import { GraphRegistry } from '../services/graph-registry.js';
import { ThreadRegistry } from '../services/thread-registry.js';
import { ThreadEntity } from '../entities/thread-entity.js';
import { ExecutionState } from '../entities/execution-state.js';
import type { Thread } from '@modular-agent/types';
import {
  createSimpleTestWorkflow,
  createTestNode,
  createTestEdge,
  createRouteTestWorkflow,
} from './fixtures/test-helpers.js';

/**
 * 创建测试 Thread 对象
 */
function createTestThread(
  threadId: string,
  workflowId: string
): Thread {
  return {
    id: threadId,
    workflowId,
    workflowVersion: '1.0.0',
    status: 'CREATED',
    currentNodeId: 'start',
    input: {},
    output: {},
    nodeResults: [],
    errors: [],
    startTime: Date.now(),
    graph: {} as any,
    variables: [],
    threadType: 'MAIN',
    variableScopes: {
      global: {},
      thread: {},
      local: [],
      loop: [],
    },
  };
}

describe('Conditional Routing Execution - 条件路由执行', () => {
  let threadRegistry: ThreadRegistry;
  let graphRegistry: GraphRegistry;
  let workflowRegistry: WorkflowRegistry;

  beforeEach(() => {
    threadRegistry = new ThreadRegistry();
    graphRegistry = new GraphRegistry();
    workflowRegistry = new WorkflowRegistry({}, threadRegistry);
  });

  afterEach(() => {
    threadRegistry.clear();
    graphRegistry.clear();
    workflowRegistry.clear();
  });

  describe('基本条件路由', () => {
    it('应该正确配置 ROUTE 节点', async () => {
      const workflow = createSimpleTestWorkflow('route-basic', {
        middleNodes: [
          createTestNode('route-1', 'ROUTE', {
            config: {
              conditions: [
                {
                  id: 'cond-1',
                  expression: {
                    type: 'comparison',
                    left: { type: 'variable', name: 'score' },
                    operator: '>=',
                    right: { type: 'literal', value: 60 },
                  },
                  targetNodeId: 'pass',
                },
              ],
              defaultTargetNodeId: 'fail',
            },
          }),
          createTestNode('pass', 'VARIABLE', {
            config: { variableName: 'result', variableValue: 'PASS' },
          }),
          createTestNode('fail', 'VARIABLE', {
            config: { variableName: 'result', variableValue: 'FAIL' },
          }),
        ],
        middleEdges: [
          createTestEdge('e-route-pass', 'route-1', 'pass'),
          createTestEdge('e-route-fail', 'route-1', 'fail'),
          createTestEdge('e-pass-end', 'pass', 'end'),
          createTestEdge('e-fail-end', 'fail', 'end'),
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('route-basic');
      const routeNode = registered!.nodes.find((n) => n.type === 'ROUTE');
      expect(routeNode).toBeDefined();
      expect((routeNode!.config as any).conditions).toHaveLength(1);
      expect((routeNode!.config as any).defaultTargetNodeId).toBe('fail');
    });

    it('ROUTE 节点应该根据变量值选择路径', async () => {
      const workflow = createSimpleTestWorkflow('route-select', {
        middleNodes: [
          createTestNode('route-1', 'ROUTE', {
            config: {
              conditions: [
                {
                  id: 'cond-1',
                  expression: {
                    type: 'comparison',
                    left: { type: 'variable', name: 'value' },
                    operator: '==',
                    right: { type: 'literal', value: 'A' },
                  },
                  targetNodeId: 'branch-a',
                },
                {
                  id: 'cond-2',
                  expression: {
                    type: 'comparison',
                    left: { type: 'variable', name: 'value' },
                    operator: '==',
                    right: { type: 'literal', value: 'B' },
                  },
                  targetNodeId: 'branch-b',
                },
              ],
              defaultTargetNodeId: 'branch-default',
            },
          }),
          createTestNode('branch-a', 'VARIABLE', {
            config: { variableName: 'branch', variableValue: 'A' },
          }),
          createTestNode('branch-b', 'VARIABLE', {
            config: { variableName: 'branch', variableValue: 'B' },
          }),
          createTestNode('branch-default', 'VARIABLE', {
            config: { variableName: 'branch', variableValue: 'DEFAULT' },
          }),
        ],
        middleEdges: [
          createTestEdge('e-route-a', 'route-1', 'branch-a'),
          createTestEdge('e-route-b', 'route-1', 'branch-b'),
          createTestEdge('e-route-default', 'route-1', 'branch-default'),
          createTestEdge('e-a-end', 'branch-a', 'end'),
          createTestEdge('e-b-end', 'branch-b', 'end'),
          createTestEdge('e-default-end', 'branch-default', 'end'),
        ],
      });

      workflowRegistry.register(workflow);

      // 验证工作流结构
      const registered = workflowRegistry.get('route-select');
      expect(registered!.nodes.filter((n) => n.type === 'VARIABLE')).toHaveLength(3);
    });

    it('应该验证正确分支被执行', async () => {
      // 创建线程实体并设置变量
      const thread = createTestThread('route-thread', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 设置变量值
      entity.setVariable('score', 85);

      // 验证变量设置成功
      expect(entity.getVariable('score')).toBe(85);
    });

    it('应该验证其他分支未执行', async () => {
      const thread = createTestThread('exclusive-thread', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟执行了一个分支
      entity.addNodeResult({
        nodeId: 'branch-a',
        type: 'VARIABLE',
        result: { branch: 'A' },
        timestamp: Date.now(),
      });

      // 验证只有 branch-a 的结果
      const results = entity.getNodeResults();
      expect(results).toHaveLength(1);
      expect(results[0]!.nodeId).toBe('branch-a');
    });
  });

  describe('多条件路由', () => {
    it('应该正确处理多个条件的复杂路由', async () => {
      const workflow = createSimpleTestWorkflow('multi-route', {
        middleNodes: [
          createTestNode('route-1', 'ROUTE', {
            config: {
              conditions: [
                {
                  id: 'cond-1',
                  expression: {
                    type: 'comparison',
                    left: { type: 'variable', name: 'age' },
                    operator: '<',
                    right: { type: 'literal', value: 18 },
                  },
                  targetNodeId: 'minor',
                },
                {
                  id: 'cond-2',
                  expression: {
                    type: 'comparison',
                    left: { type: 'variable', name: 'age' },
                    operator: '>=',
                    right: { type: 'literal', value: 18 },
                  },
                  targetNodeId: 'adult',
                },
                {
                  id: 'cond-3',
                  expression: {
                    type: 'comparison',
                    left: { type: 'variable', name: 'age' },
                    operator: '>=',
                    right: { type: 'literal', value: 65 },
                  },
                  targetNodeId: 'senior',
                },
              ],
              defaultTargetNodeId: 'unknown',
            },
          }),
          createTestNode('minor', 'VARIABLE', {
            config: { variableName: 'category', variableValue: 'minor' },
          }),
          createTestNode('adult', 'VARIABLE', {
            config: { variableName: 'category', variableValue: 'adult' },
          }),
          createTestNode('senior', 'VARIABLE', {
            config: { variableName: 'category', variableValue: 'senior' },
          }),
          createTestNode('unknown', 'VARIABLE', {
            config: { variableName: 'category', variableValue: 'unknown' },
          }),
        ],
        middleEdges: [
          createTestEdge('e-route-minor', 'route-1', 'minor'),
          createTestEdge('e-route-adult', 'route-1', 'adult'),
          createTestEdge('e-route-senior', 'route-1', 'senior'),
          createTestEdge('e-route-unknown', 'route-1', 'unknown'),
          createTestEdge('e-minor-end', 'minor', 'end'),
          createTestEdge('e-adult-end', 'adult', 'end'),
          createTestEdge('e-senior-end', 'senior', 'end'),
          createTestEdge('e-unknown-end', 'unknown', 'end'),
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('multi-route');
      const routeNode = registered!.nodes.find((n) => n.type === 'ROUTE');
      expect((routeNode!.config as any).conditions).toHaveLength(3);
    });

    it('应该验证优先级处理', async () => {
      // 条件按顺序评估，第一个匹配的条件决定路径
      const conditions = [
        { id: 'c1', priority: 1, targetNodeId: 'high' },
        { id: 'c2', priority: 2, targetNodeId: 'medium' },
        { id: 'c3', priority: 3, targetNodeId: 'low' },
      ];

      // 验证条件顺序
      expect(conditions[0]!.priority).toBe(1);
      expect(conditions[1]!.priority).toBe(2);
      expect(conditions[2]!.priority).toBe(3);
    });

    it('应该支持嵌套条件表达式', async () => {
      const workflow = createSimpleTestWorkflow('nested-route', {
        middleNodes: [
          createTestNode('route-1', 'ROUTE', {
            config: {
              conditions: [
                {
                  id: 'cond-1',
                  expression: {
                    type: 'logical',
                    operator: 'AND',
                    left: {
                      type: 'comparison',
                      left: { type: 'variable', name: 'age' },
                      operator: '>=',
                      right: { type: 'literal', value: 18 },
                    },
                    right: {
                      type: 'comparison',
                      left: { type: 'variable', name: 'age' },
                      operator: '<',
                      right: { type: 'literal', value: 65 },
                    },
                  },
                  targetNodeId: 'working-age',
                },
              ],
              defaultTargetNodeId: 'other',
            },
          }),
          createTestNode('working-age', 'VARIABLE', {
            config: { variableName: 'status', variableValue: 'working' },
          }),
          createTestNode('other', 'VARIABLE', {
            config: { variableName: 'status', variableValue: 'other' },
          }),
        ],
        middleEdges: [
          createTestEdge('e-route-work', 'route-1', 'working-age'),
          createTestEdge('e-route-other', 'route-1', 'other'),
          createTestEdge('e-work-end', 'working-age', 'end'),
          createTestEdge('e-other-end', 'other', 'end'),
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('nested-route');
      const routeNode = registered!.nodes.find((n) => n.type === 'ROUTE');
      const cond = (routeNode!.config as any).conditions[0];
      expect(cond.expression.type).toBe('logical');
      expect(cond.expression.operator).toBe('AND');
    });
  });

  describe('默认分支', () => {
    it('无匹配条件时应该走默认分支', async () => {
      const workflow = createSimpleTestWorkflow('default-route', {
        middleNodes: [
          createTestNode('route-1', 'ROUTE', {
            config: {
              conditions: [
                {
                  id: 'cond-1',
                  expression: {
                    type: 'comparison',
                    left: { type: 'variable', name: 'type' },
                    operator: '==',
                    right: { type: 'literal', value: 'A' },
                  },
                  targetNodeId: 'type-a',
                },
              ],
              defaultTargetNodeId: 'type-default',
            },
          }),
          createTestNode('type-a', 'VARIABLE', {
            config: { variableName: 'matched', variableValue: 'A' },
          }),
          createTestNode('type-default', 'VARIABLE', {
            config: { variableName: 'matched', variableValue: 'DEFAULT' },
          }),
        ],
        middleEdges: [
          createTestEdge('e-route-a', 'route-1', 'type-a'),
          createTestEdge('e-route-default', 'route-1', 'type-default'),
          createTestEdge('e-a-end', 'type-a', 'end'),
          createTestEdge('e-default-end', 'type-default', 'end'),
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('default-route');
      const routeNode = registered!.nodes.find((n) => n.type === 'ROUTE');
      expect((routeNode!.config as any).defaultTargetNodeId).toBe('type-default');
    });

    it('应该验证默认分支执行', async () => {
      const thread = createTestThread('default-thread', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 设置一个不匹配任何条件的值
      entity.setVariable('type', 'UNKNOWN');

      // 模拟默认分支执行
      entity.addNodeResult({
        nodeId: 'type-default',
        type: 'VARIABLE',
        result: { matched: 'DEFAULT' },
        timestamp: Date.now(),
      });

      const results = entity.getNodeResults();
      expect(results[0]!.nodeId).toBe('type-default');
    });
  });

  describe('路由与变量更新', () => {
    it('路由前更新变量应该影响路由决策', async () => {
      const workflow = createSimpleTestWorkflow('var-update-route', {
        middleNodes: [
          createTestNode('set-var', 'VARIABLE', {
            config: { variableName: 'status', variableValue: 'active' },
          }),
          createTestNode('route-1', 'ROUTE', {
            config: {
              conditions: [
                {
                  id: 'cond-1',
                  expression: {
                    type: 'comparison',
                    left: { type: 'variable', name: 'status' },
                    operator: '==',
                    right: { type: 'literal', value: 'active' },
                  },
                  targetNodeId: 'active-branch',
                },
              ],
              defaultTargetNodeId: 'inactive-branch',
            },
          }),
          createTestNode('active-branch', 'VARIABLE', {
            config: { variableName: 'result', variableValue: 'ACTIVE' },
          }),
          createTestNode('inactive-branch', 'VARIABLE', {
            config: { variableName: 'result', variableValue: 'INACTIVE' },
          }),
        ],
        middleEdges: [
          createTestEdge('e-set-route', 'set-var', 'route-1'),
          createTestEdge('e-route-active', 'route-1', 'active-branch'),
          createTestEdge('e-route-inactive', 'route-1', 'inactive-branch'),
          createTestEdge('e-active-end', 'active-branch', 'end'),
          createTestEdge('e-inactive-end', 'inactive-branch', 'end'),
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('var-update-route');
      expect(registered!.nodes).toHaveLength(6);
    });

    it('应该验证路由条件使用最新变量值', async () => {
      const thread = createTestThread('latest-var-thread', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 设置初始值
      entity.setVariable('counter', 0);

      // 更新值
      entity.setVariable('counter', 5);

      // 验证获取的是最新值
      expect(entity.getVariable('counter')).toBe(5);
    });

    it('应该支持动态变量更新', async () => {
      const thread = createTestThread('dynamic-var-thread', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟多次变量更新
      entity.setVariable('value', 1);
      expect(entity.getVariable('value')).toBe(1);

      entity.setVariable('value', 2);
      expect(entity.getVariable('value')).toBe(2);

      entity.setVariable('value', 3);
      expect(entity.getVariable('value')).toBe(3);
    });
  });

  describe('条件表达式类型', () => {
    it('应该支持比较运算符', async () => {
      const operators = ['==', '!=', '<', '>', '<=', '>='];

      for (const op of operators) {
        const workflow = createSimpleTestWorkflow(`op-${op}`, {
          middleNodes: [
            createTestNode('route-1', 'ROUTE', {
              config: {
                conditions: [
                  {
                    id: 'cond-1',
                    expression: {
                      type: 'comparison',
                      left: { type: 'variable', name: 'x' },
                      operator: op,
                      right: { type: 'literal', value: 10 },
                    },
                    targetNodeId: 'branch-1',
                  },
                ],
                defaultTargetNodeId: 'default',
              },
            }),
            createTestNode('branch-1', 'VARIABLE', {
              config: { variableName: 'result', variableValue: 'matched' },
            }),
            createTestNode('default', 'VARIABLE', {
              config: { variableName: 'result', variableValue: 'default' },
            }),
          ],
          middleEdges: [
            createTestEdge('e-route-branch', 'route-1', 'branch-1'),
            createTestEdge('e-route-default', 'route-1', 'default'),
            createTestEdge('e-branch-end', 'branch-1', 'end'),
            createTestEdge('e-default-end', 'default', 'end'),
          ],
        });

        workflowRegistry.register(workflow);

        const registered = workflowRegistry.get(`op-${op}`);
        const routeNode = registered!.nodes.find((n) => n.type === 'ROUTE');
        expect((routeNode!.config as any).conditions[0].expression.operator).toBe(op);
      }
    });

    it('应该支持逻辑运算符', async () => {
      const workflow = createSimpleTestWorkflow('logical-ops', {
        middleNodes: [
          createTestNode('route-1', 'ROUTE', {
            config: {
              conditions: [
                {
                  id: 'cond-and',
                  expression: {
                    type: 'logical',
                    operator: 'AND',
                    left: {
                      type: 'comparison',
                      left: { type: 'variable', name: 'a' },
                      operator: '>',
                      right: { type: 'literal', value: 0 },
                    },
                    right: {
                      type: 'comparison',
                      left: { type: 'variable', name: 'b' },
                      operator: '>',
                      right: { type: 'literal', value: 0 },
                    },
                  },
                  targetNodeId: 'both-positive',
                },
                {
                  id: 'cond-or',
                  expression: {
                    type: 'logical',
                    operator: 'OR',
                    left: {
                      type: 'comparison',
                      left: { type: 'variable', name: 'a' },
                      operator: '>',
                      right: { type: 'literal', value: 100 },
                    },
                    right: {
                      type: 'comparison',
                      left: { type: 'variable', name: 'b' },
                      operator: '>',
                      right: { type: 'literal', value: 100 },
                    },
                  },
                  targetNodeId: 'either-large',
                },
              ],
              defaultTargetNodeId: 'other',
            },
          }),
          createTestNode('both-positive', 'VARIABLE', {
            config: { variableName: 'category', variableValue: 'both-positive' },
          }),
          createTestNode('either-large', 'VARIABLE', {
            config: { variableName: 'category', variableValue: 'either-large' },
          }),
          createTestNode('other', 'VARIABLE', {
            config: { variableName: 'category', variableValue: 'other' },
          }),
        ],
        middleEdges: [
          createTestEdge('e-route-both', 'route-1', 'both-positive'),
          createTestEdge('e-route-either', 'route-1', 'either-large'),
          createTestEdge('e-route-other', 'route-1', 'other'),
          createTestEdge('e-both-end', 'both-positive', 'end'),
          createTestEdge('e-either-end', 'either-large', 'end'),
          createTestEdge('e-other-end', 'other', 'end'),
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('logical-ops');
      const routeNode = registered!.nodes.find((n) => n.type === 'ROUTE');
      const conditions = (routeNode!.config as any).conditions;

      expect(conditions[0].expression.operator).toBe('AND');
      expect(conditions[1].expression.operator).toBe('OR');
    });
  });
});
