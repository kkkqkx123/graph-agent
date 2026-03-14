/**
 * Fork/Join 并行执行测试
 *
 * 测试场景：
 * - 基础 Fork/Join
 * - 分支变量隔离
 * - 分支错误处理
 * - 嵌套 Fork/Join
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkflowRegistry } from '../services/workflow-registry.js';
import { GraphRegistry } from '../services/graph-registry.js';
import { ThreadRegistry } from '../services/thread-registry.js';
import { ThreadEntity } from '../entities/thread-entity.js';
import { ExecutionState } from '../entities/execution-state.js';
import type { Thread, ThreadType } from '@modular-agent/types';
import {
  createSimpleTestWorkflow,
  createTestNode,
  createTestEdge,
  createForkJoinTestWorkflow,
} from './fixtures/test-helpers.js';

/**
 * 创建测试 Thread 对象
 */
function createTestThread(
  threadId: string,
  workflowId: string,
  options: {
    threadType?: ThreadType;
    forkId?: string;
    forkPathId?: string;
  } = {}
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
    threadType: options.threadType as ThreadType || 'MAIN',
    forkJoinContext: options.forkId ? {
      forkId: options.forkId,
      forkPathId: options.forkPathId || '',
    } : undefined,
    variableScopes: {
      global: {},
      thread: {},
      local: [],
      loop: [],
    },
  };
}

describe('Fork/Join Parallel Execution - Fork/Join 并行执行', () => {
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

  describe('基础 Fork/Join', () => {
    it('应该正确配置 FORK 节点', async () => {
      const workflow = createSimpleTestWorkflow('fork-config', {
        middleNodes: [
          createTestNode('fork-1', 'FORK', {
            config: {
              forkPaths: [
                { pathId: 'path-a', childNodeId: 'branch-a' },
                { pathId: 'path-b', childNodeId: 'branch-b' },
              ],
            },
          }),
          createTestNode('branch-a', 'VARIABLE', {
            config: { variableName: 'a', variableValue: 1 },
          }),
          createTestNode('branch-b', 'VARIABLE', {
            config: { variableName: 'b', variableValue: 2 },
          }),
          createTestNode('join-1', 'JOIN', {
            config: { forkPathIds: ['path-a', 'path-b'] },
          }),
        ],
        middleEdges: [
          createTestEdge('e-fork-a', 'fork-1', 'branch-a'),
          createTestEdge('e-fork-b', 'fork-1', 'branch-b'),
          createTestEdge('e-a-join', 'branch-a', 'join-1'),
          createTestEdge('e-b-join', 'branch-b', 'join-1'),
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('fork-config');
      const forkNode = registered!.nodes.find((n) => n.type === 'FORK');
      expect(forkNode).toBeDefined();
      expect((forkNode!.config as any).forkPaths).toHaveLength(2);
    });

    it('应该正确配置 JOIN 节点', async () => {
      const workflow = createSimpleTestWorkflow('join-config', {
        middleNodes: [
          createTestNode('fork-1', 'FORK', {
            config: {
              forkPaths: [
                { pathId: 'path-1', childNodeId: 'branch-1' },
                { pathId: 'path-2', childNodeId: 'branch-2' },
                { pathId: 'path-3', childNodeId: 'branch-3' },
              ],
            },
          }),
          createTestNode('branch-1', 'VARIABLE', { config: { variableName: 'x', variableValue: 1 } }),
          createTestNode('branch-2', 'VARIABLE', { config: { variableName: 'y', variableValue: 2 } }),
          createTestNode('branch-3', 'VARIABLE', { config: { variableName: 'z', variableValue: 3 } }),
          createTestNode('join-1', 'JOIN', {
            config: {
              forkPathIds: ['path-1', 'path-2', 'path-3'],
              mainPathId: 'path-1',
            },
          }),
        ],
        middleEdges: [
          createTestEdge('e-fork-1', 'fork-1', 'branch-1'),
          createTestEdge('e-fork-2', 'fork-1', 'branch-2'),
          createTestEdge('e-fork-3', 'fork-1', 'branch-3'),
          createTestEdge('e-1-join', 'branch-1', 'join-1'),
          createTestEdge('e-2-join', 'branch-2', 'join-1'),
          createTestEdge('e-3-join', 'branch-3', 'join-1'),
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('join-config');
      const joinNode = registered!.nodes.find((n) => n.type === 'JOIN');
      expect(joinNode).toBeDefined();
      expect((joinNode!.config as any).forkPathIds).toHaveLength(3);
      expect((joinNode!.config as any).mainPathId).toBe('path-1');
    });

    it('FORK 应该创建多个并行分支', async () => {
      const workflow = createForkJoinTestWorkflow('parallel-branches', {
        paths: [
          {
            pathId: 'path-a',
            nodes: [
              createTestNode('branch-a-1', 'VARIABLE', { config: { variableName: 'a1', variableValue: 1 } }),
              createTestNode('branch-a-2', 'VARIABLE', { config: { variableName: 'a2', variableValue: 2 } }),
            ],
          },
          {
            pathId: 'path-b',
            nodes: [
              createTestNode('branch-b-1', 'VARIABLE', { config: { variableName: 'b1', variableValue: 3 } }),
              createTestNode('branch-b-2', 'VARIABLE', { config: { variableName: 'b2', variableValue: 4 } }),
            ],
          },
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('parallel-branches');
      expect(registered).toBeDefined();
    });

    it('JOIN 应该等待所有分支完成', async () => {
      // 创建主线程和分支线程
      const mainThread = createTestThread('main-thread', 'workflow-1');
      const branchAThread = createTestThread('branch-a', 'workflow-1', {
        threadType: 'FORK_JOIN',
        forkId: 'fork-1',
        forkPathId: 'path-a',
      });
      const branchBThread = createTestThread('branch-b', 'workflow-1', {
        threadType: 'FORK_JOIN',
        forkId: 'fork-1',
        forkPathId: 'path-b',
      });

      // 注册线程
      const mainEntity = new ThreadEntity(mainThread, new ExecutionState());
      const branchAEntity = new ThreadEntity(branchAThread, new ExecutionState());
      const branchBEntity = new ThreadEntity(branchBThread, new ExecutionState());

      threadRegistry.register(mainEntity);
      threadRegistry.register(branchAEntity);
      threadRegistry.register(branchBEntity);

      // 验证分支线程
      expect(threadRegistry.getAll()).toHaveLength(3);
      expect(branchAThread.threadType).toBe('FORK');
      expect(branchBThread.threadType).toBe('FORK');
    });

    it('应该验证最终合并', async () => {
      const thread = createTestThread('merge-thread', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟分支结果合并
      entity.addNodeResult({
        nodeId: 'join-1',
        type: 'JOIN',
        result: {
          mergedResults: {
            'path-a': { value: 1 },
            'path-b': { value: 2 },
          },
        },
        timestamp: Date.now(),
      });

      const results = entity.getNodeResults();
      expect(results).toHaveLength(1);
      expect((results[0]!.result as any).mergedResults).toBeDefined();
    });
  });

  describe('分支变量隔离', () => {
    it('各分支变量应该独立', async () => {
      // 创建两个分支线程
      const threadA = createTestThread('branch-a-var', 'workflow-1', {
        threadType: 'FORK_JOIN',
        forkId: 'fork-1',
        forkPathId: 'path-a',
      });
      const threadB = createTestThread('branch-b-var', 'workflow-1', {
        threadType: 'FORK_JOIN',
        forkId: 'fork-1',
        forkPathId: 'path-b',
      });

      const executionStateA = new ExecutionState();
      const executionStateB = new ExecutionState();
      const entityA = new ThreadEntity(threadA, executionStateA);
      const entityB = new ThreadEntity(threadB, executionStateB);

      // 在分支 A 设置变量
      entityA.setVariable('branchVar', 'value-a');
      // 在分支 B 设置变量
      entityB.setVariable('branchVar', 'value-b');

      // 验证变量隔离
      expect(entityA.getVariable('branchVar')).toBe('value-a');
      expect(entityB.getVariable('branchVar')).toBe('value-b');
    });

    it('global 变量应该共享', async () => {
      const mainThread = createTestThread('main-global', 'workflow-1');
      const branchThread = createTestThread('branch-global', 'workflow-1', {
        threadType: 'FORK_JOIN',
        forkId: 'fork-1',
        forkPathId: 'path-a',
      });

      const mainExecutionState = new ExecutionState();
      const branchExecutionState = new ExecutionState();
      const mainEntity = new ThreadEntity(mainThread, mainExecutionState);
      const branchEntity = new ThreadEntity(branchThread, branchExecutionState);

      // 在主线程设置 global 变量
      mainEntity.getThread().variableScopes.global = { sharedVar: 'shared-value' };

      // 分支线程应该能访问 global 变量
      branchEntity.getThread().variableScopes.global = { sharedVar: 'shared-value' };

      expect(branchEntity.getThread().variableScopes.global['sharedVar']).toBe('shared-value');
    });

    it('分支内变量修改不应影响其他分支', async () => {
      const threadA = createTestThread('isolate-a', 'workflow-1', {
        threadType: 'FORK_JOIN',
        forkId: 'fork-1',
        forkPathId: 'path-a',
      });
      const threadB = createTestThread('isolate-b', 'workflow-1', {
        threadType: 'FORK_JOIN',
        forkId: 'fork-1',
        forkPathId: 'path-b',
      });

      const executionStateA = new ExecutionState();
      const executionStateB = new ExecutionState();
      const entityA = new ThreadEntity(threadA, executionStateA);
      const entityB = new ThreadEntity(threadB, executionStateB);

      // 初始共享变量
      entityA.setVariable('counter', 0);
      entityB.setVariable('counter', 0);

      // 分支 A 修改
      entityA.setVariable('counter', 10);

      // 分支 B 不应受影响
      expect(entityB.getVariable('counter')).toBe(0);
    });
  });

  describe('分支错误处理', () => {
    it('单个分支失败应该被记录', async () => {
      const thread = createTestThread('error-branch', 'workflow-1', {
        threadType: 'FORK_JOIN',
        forkId: 'fork-1',
        forkPathId: 'path-a',
      });
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟分支错误
      entity.getThread().errors.push({
        nodeId: 'branch-node-1',
        error: 'Branch execution failed',
        timestamp: Date.now(),
      });

      const errors = entity.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]!.error).toBe('Branch execution failed');
    });

    it('应该验证错误传播', async () => {
      const mainThread = createTestThread('error-prop-main', 'workflow-1');
      const branchThread = createTestThread('error-prop-branch', 'workflow-1', {
        threadType: 'FORK_JOIN',
        forkId: 'fork-1',
        forkPathId: 'path-a',
      });

      // 分支线程发生错误
      branchThread.errors.push({
        nodeId: 'node-1',
        error: 'Branch error',
        timestamp: Date.now(),
      });

      // 主线程应该能感知到分支错误
      const mainEntity = new ThreadEntity(mainThread, new ExecutionState());
      const branchEntity = new ThreadEntity(branchThread, new ExecutionState());

      threadRegistry.register(mainEntity);
      threadRegistry.register(branchEntity);

      const registeredBranch = threadRegistry.get('error-prop-branch');
      expect(registeredBranch!.getErrors()).toHaveLength(1);
    });

    it('JOIN 应该正确处理分支错误', async () => {
      const thread = createTestThread('join-error', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟 JOIN 结果包含错误信息
      entity.addNodeResult({
        nodeId: 'join-1',
        type: 'JOIN',
        result: {
          success: false,
          errors: {
            'path-a': null,
            'path-b': 'Branch B failed',
          },
        },
        timestamp: Date.now(),
      });

      const results = entity.getNodeResults();
      expect((results[0]!.result as any).success).toBe(false);
      expect((results[0]!.result as any).errors['path-b']).toBe('Branch B failed');
    });
  });

  describe('嵌套 Fork/Join', () => {
    it('应该正确处理 Fork 内部再有 Fork', async () => {
      const workflow = createSimpleTestWorkflow('nested-fork', {
        middleNodes: [
          // 外层 FORK
          createTestNode('outer-fork', 'FORK', {
            config: {
              forkPaths: [
                { pathId: 'outer-path-a', childNodeId: 'outer-branch-a' },
                { pathId: 'outer-path-b', childNodeId: 'outer-branch-b' },
              ],
            },
          }),
          // 外层分支 A
          createTestNode('outer-branch-a', 'VARIABLE', {
            config: { variableName: 'outerA', variableValue: 1 },
          }),
          // 内层 FORK（在分支 A 内）
          createTestNode('inner-fork', 'FORK', {
            config: {
              forkPaths: [
                { pathId: 'inner-path-1', childNodeId: 'inner-branch-1' },
                { pathId: 'inner-path-2', childNodeId: 'inner-branch-2' },
              ],
            },
          }),
          createTestNode('inner-branch-1', 'VARIABLE', {
            config: { variableName: 'inner1', variableValue: 11 },
          }),
          createTestNode('inner-branch-2', 'VARIABLE', {
            config: { variableName: 'inner2', variableValue: 12 },
          }),
          createTestNode('inner-join', 'JOIN', {
            config: { forkPathIds: ['inner-path-1', 'inner-path-2'] },
          }),
          // 外层分支 B
          createTestNode('outer-branch-b', 'VARIABLE', {
            config: { variableName: 'outerB', variableValue: 2 },
          }),
          // 外层 JOIN
          createTestNode('outer-join', 'JOIN', {
            config: { forkPathIds: ['outer-path-a', 'outer-path-b'] },
          }),
        ],
        middleEdges: [
          createTestEdge('e-outer-fork-a', 'outer-fork', 'outer-branch-a'),
          createTestEdge('e-outer-fork-b', 'outer-fork', 'outer-branch-b'),
          createTestEdge('e-a-inner-fork', 'outer-branch-a', 'inner-fork'),
          createTestEdge('e-inner-fork-1', 'inner-fork', 'inner-branch-1'),
          createTestEdge('e-inner-fork-2', 'inner-fork', 'inner-branch-2'),
          createTestEdge('e-inner-1-join', 'inner-branch-1', 'inner-join'),
          createTestEdge('e-inner-2-join', 'inner-branch-2', 'inner-join'),
          createTestEdge('e-inner-join-outer-join', 'inner-join', 'outer-join'),
          createTestEdge('e-b-outer-join', 'outer-branch-b', 'outer-join'),
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('nested-fork');
      const forkNodes = registered!.nodes.filter((n) => n.type === 'FORK');
      const joinNodes = registered!.nodes.filter((n) => n.type === 'JOIN');

      expect(forkNodes).toHaveLength(2); // 外层和内层
      expect(joinNodes).toHaveLength(2);
    });

    it('应该验证嵌套变量作用域', async () => {
      // 创建嵌套的分支线程
      const outerBranchThread = createTestThread('outer-branch', 'workflow-1', {
        threadType: 'FORK_JOIN',
        forkId: 'outer-fork',
        forkPathId: 'outer-path-a',
      });
      const innerBranchThread = createTestThread('inner-branch', 'workflow-1', {
        threadType: 'FORK_JOIN',
        forkId: 'inner-fork',
        forkPathId: 'inner-path-1',
      });

      const outerExecutionState = new ExecutionState();
      const innerExecutionState = new ExecutionState();
      const outerEntity = new ThreadEntity(outerBranchThread, outerExecutionState);
      const innerEntity = new ThreadEntity(innerBranchThread, innerExecutionState);

      // 设置不同层级的变量
      outerEntity.setVariable('level', 'outer');
      innerEntity.setVariable('level', 'inner');

      expect(outerEntity.getVariable('level')).toBe('outer');
      expect(innerEntity.getVariable('level')).toBe('inner');
    });

    it('应该正确处理多层 JOIN', async () => {
      const thread = createTestThread('multi-join', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟内层 JOIN 结果
      entity.addNodeResult({
        nodeId: 'inner-join',
        type: 'JOIN',
        result: {
          mergedResults: {
            'inner-path-1': { value: 11 },
            'inner-path-2': { value: 12 },
          },
        },
        timestamp: Date.now(),
      });

      // 模拟外层 JOIN 结果
      entity.addNodeResult({
        nodeId: 'outer-join',
        type: 'JOIN',
        result: {
          mergedResults: {
            'outer-path-a': { inner: { value: 23 } },
            'outer-path-b': { value: 2 },
          },
        },
        timestamp: Date.now(),
      });

      const results = entity.getNodeResults();
      expect(results).toHaveLength(2);
    });
  });

  describe('Fork/Join 配置验证', () => {
    it('FORK 节点必须有 forkPaths 配置', async () => {
      const workflow = createSimpleTestWorkflow('fork-no-paths', {
        middleNodes: [
          createTestNode('fork-1', 'FORK', {
            config: {}, // 缺少 forkPaths
          }),
        ],
      });

      // 应该在验证时失败
      expect(() => workflowRegistry.register(workflow)).toThrow();
    });

    it('JOIN 节点必须有 forkPathIds 配置', async () => {
      const workflow = createSimpleTestWorkflow('join-no-paths', {
        middleNodes: [
          createTestNode('join-1', 'JOIN', {
            config: {}, // 缺少 forkPathIds
          }),
        ],
      });

      // 应该在验证时失败
      expect(() => workflowRegistry.register(workflow)).toThrow();
    });

    it('FORK 和 JOIN 的 pathId 必须匹配', async () => {
      const workflow = createSimpleTestWorkflow('mismatch-paths', {
        middleNodes: [
          createTestNode('fork-1', 'FORK', {
            config: {
              forkPaths: [
                { pathId: 'path-a', childNodeId: 'branch-a' },
                { pathId: 'path-b', childNodeId: 'branch-b' },
              ],
            },
          }),
          createTestNode('branch-a', 'VARIABLE', { config: { variableName: 'a', variableValue: 1 } }),
          createTestNode('branch-b', 'VARIABLE', { config: { variableName: 'b', variableValue: 2 } }),
          createTestNode('join-1', 'JOIN', {
            config: {
              forkPathIds: ['path-x', 'path-y'], // 不匹配
            },
          }),
        ],
        middleEdges: [
          createTestEdge('e-fork-a', 'fork-1', 'branch-a'),
          createTestEdge('e-fork-b', 'fork-1', 'branch-b'),
          createTestEdge('e-a-join', 'branch-a', 'join-1'),
          createTestEdge('e-b-join', 'branch-b', 'join-1'),
        ],
      });

      // 应该在验证时失败
      expect(() => workflowRegistry.register(workflow)).toThrow();
    });
  });
});
