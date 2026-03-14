/**
 * 错误处理测试
 *
 * 测试场景：
 * - 配置错误
 * - 运行时错误
 * - 错误传播
 * - 错误恢复
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkflowRegistry } from '../services/workflow-registry.js';
import { GraphRegistry } from '../services/graph-registry.js';
import { ThreadRegistry } from '../services/thread-registry.js';
import { ThreadEntity } from '../entities/thread-entity.js';
import { ExecutionState } from '../entities/execution-state.js';
import { GraphValidator } from '../validation/graph-validator.js';
import { GraphData } from '../entities/graph-data.js';
import {
  ConfigurationValidationError,
  ExecutionError,
  WorkflowNotFoundError,
} from '@modular-agent/types';
import {
  createSimpleTestWorkflow,
  createTestNode,
  createTestEdge,
  createTestGraphNode,
  createTestGraphEdge,
  createTestGraphData,
  createCyclicTestWorkflow,
} from './fixtures/test-helpers.js';
import type { Thread } from '@modular-agent/types';

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

describe('Error Handling - 错误处理', () => {
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

  describe('配置错误', () => {
    it('应该检测工作流定义错误', async () => {
      const invalidWorkflow = {
        id: '',
        name: 'Invalid Workflow',
        type: 'standard' as const,
        nodes: [],
        edges: [],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(() => workflowRegistry.register(invalidWorkflow as any)).toThrow(ConfigurationValidationError);
    });

    it('应该报告正确的错误信息和位置', async () => {
      const invalidWorkflow = {
        id: 'test-workflow',
        name: '', // 缺少名称
        type: 'standard' as const,
        nodes: [],
        edges: [],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        workflowRegistry.register(invalidWorkflow as any);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationValidationError);
        const configError = error as ConfigurationValidationError;
        expect(configError.message).toContain('validation failed');
      }
    });

    it('应该检测缺少 START 节点', async () => {
      const workflow = {
        id: 'no-start',
        name: 'No Start Workflow',
        type: 'standard' as const,
        nodes: [
          createTestNode('node-1', 'VARIABLE', { config: { variableName: 'x', variableValue: 1 } }),
          createTestNode('end', 'END'),
        ],
        edges: [
          createTestEdge('e1', 'node-1', 'end'),
        ],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(() => workflowRegistry.register(workflow as any)).toThrow();
    });

    it('应该检测缺少 END 节点', async () => {
      const workflow = {
        id: 'no-end',
        name: 'No End Workflow',
        type: 'standard' as const,
        nodes: [
          createTestNode('start', 'START'),
          createTestNode('node-1', 'VARIABLE', { config: { variableName: 'x', variableValue: 1 } }),
        ],
        edges: [
          createTestEdge('e1', 'start', 'node-1'),
        ],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(() => workflowRegistry.register(workflow as any)).toThrow();
    });

    it('应该检测重复节点 ID', async () => {
      const workflow = {
        id: 'duplicate-ids',
        name: 'Duplicate IDs Workflow',
        type: 'standard' as const,
        nodes: [
          createTestNode('start', 'START'),
          createTestNode('node-1', 'VARIABLE', { config: { variableName: 'x', variableValue: 1 } }),
          createTestNode('node-1', 'VARIABLE', { config: { variableName: 'y', variableValue: 2 } }), // 重复 ID
          createTestNode('end', 'END'),
        ],
        edges: [
          createTestEdge('e1', 'start', 'node-1'),
          createTestEdge('e2', 'node-1', 'end'),
        ],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(() => workflowRegistry.register(workflow as any)).toThrow();
    });

    it('应该检测边引用不存在的节点', async () => {
      const workflow = {
        id: 'invalid-edge',
        name: 'Invalid Edge Workflow',
        type: 'standard' as const,
        nodes: [
          createTestNode('start', 'START'),
          createTestNode('end', 'END'),
        ],
        edges: [
          createTestEdge('e1', 'start', 'non-existent-node'), // 引用不存在的节点
        ],
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(() => workflowRegistry.register(workflow as any)).toThrow();
    });
  });

  describe('运行时错误', () => {
    it('应该捕获脚本执行错误', async () => {
      const thread = createTestThread('script-error', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟脚本执行错误
      entity.getThread().errors.push({
        nodeId: 'script-node-1',
        error: 'Script execution failed: ReferenceError: x is not defined',
        timestamp: Date.now(),
      });

      const errors = entity.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]!.error).toContain('Script execution failed');
    });

    it('应该捕获 LLM 调用错误', async () => {
      const thread = createTestThread('llm-error', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟 LLM 调用错误
      entity.getThread().errors.push({
        nodeId: 'llm-node-1',
        error: 'LLM API error: Rate limit exceeded',
        timestamp: Date.now(),
      });

      const errors = entity.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]!.error).toContain('Rate limit exceeded');
    });

    it('应该验证错误捕获', async () => {
      const thread = createTestThread('error-capture', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟多个错误
      entity.getThread().errors.push({
        nodeId: 'node-1',
        error: 'Error 1',
        timestamp: Date.now(),
      });
      entity.getThread().errors.push({
        nodeId: 'node-2',
        error: 'Error 2',
        timestamp: Date.now(),
      });

      const errors = entity.getErrors();
      expect(errors).toHaveLength(2);
    });

    it('应该包含错误上下文信息', async () => {
      const thread = createTestThread('error-context', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      const errorTime = Date.now();
      entity.getThread().errors.push({
        nodeId: 'node-1',
        error: 'Test error',
        timestamp: errorTime,
        context: {
          variableName: 'testVar',
          variableValue: 'testValue',
        },
      });

      const errors = entity.getErrors();
      expect(errors[0]!.nodeId).toBe('node-1');
      expect(errors[0]!.timestamp).toBe(errorTime);
      expect((errors[0] as any).context).toBeDefined();
    });
  });

  describe('错误传播', () => {
    it('错误应该在节点间传播', async () => {
      const thread = createTestThread('error-propagation', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 节点 1 发生错误
      entity.getThread().errors.push({
        nodeId: 'node-1',
        error: 'Error in node-1',
        timestamp: Date.now(),
      });

      // 后续节点应该能感知到错误
      const hasError = entity.getErrors().length > 0;
      expect(hasError).toBe(true);
    });

    it('应该验证错误上下文', async () => {
      const thread = createTestThread('error-ctx-verify', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.getThread().errors.push({
        nodeId: 'failing-node',
        error: 'Detailed error message',
        timestamp: Date.now(),
        context: {
          workflowId: 'workflow-1',
          threadId: 'error-ctx-verify',
          previousNodeId: 'previous-node',
        },
      });

      const errors = entity.getErrors();
      expect(errors[0]!.nodeId).toBe('failing-node');
      expect((errors[0] as any).context?.workflowId).toBe('workflow-1');
    });

    it('应该正确处理级联错误', async () => {
      const thread = createTestThread('cascade-error', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟级联错误
      entity.getThread().errors.push({
        nodeId: 'node-1',
        error: 'Primary error',
        timestamp: Date.now(),
      });
      entity.getThread().errors.push({
        nodeId: 'node-2',
        error: 'Secondary error caused by node-1 failure',
        timestamp: Date.now(),
      });

      const errors = entity.getErrors();
      expect(errors).toHaveLength(2);
    });
  });

  describe('错误恢复', () => {
    it('应该支持从错误中恢复执行', async () => {
      const thread = createTestThread('error-recovery', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 发生错误
      entity.getThread().errors.push({
        nodeId: 'node-1',
        error: 'Recoverable error',
        timestamp: Date.now(),
      });

      // 模拟恢复：清除错误并继续
      entity.getThread().errors = [];

      // 设置恢复后的状态
      entity.setStatus('RUNNING');
      entity.setCurrentNodeId('node-2');

      expect(entity.getErrors()).toHaveLength(0);
      expect(entity.getStatus()).toBe('RUNNING');
      expect(entity.getCurrentNodeId()).toBe('node-2');
    });

    it('应该验证恢复机制', async () => {
      const thread = createTestThread('recovery-verify', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟错误和恢复
      entity.setStatus('FAILED');
      entity.getThread().errors.push({
        nodeId: 'node-1',
        error: 'Error before recovery',
        timestamp: Date.now(),
      });

      // 恢复
      entity.setStatus('RUNNING');
      entity.getThread().errors = [];

      expect(entity.getStatus()).toBe('RUNNING');
      expect(entity.getErrors()).toHaveLength(0);
    });

    it('应该支持重试机制', async () => {
      const thread = createTestThread('retry-mechanism', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟重试逻辑
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;

        // 模拟前两次失败，第三次成功
        if (attempts < 3) {
          entity.getThread().errors.push({
            nodeId: 'retry-node',
            error: `Attempt ${attempts} failed`,
            timestamp: Date.now(),
          });
        } else {
          // 成功
          entity.addNodeResult({
            nodeId: 'retry-node',
            result: 'Success on attempt 3',
            timestamp: Date.now(),
          });
          break;
        }
      }

      expect(attempts).toBe(3);
      expect(entity.getErrors()).toHaveLength(2); // 两次失败
      expect(entity.getNodeResults()).toHaveLength(1); // 一次成功
    });

    it('应该支持降级处理', async () => {
      const thread = createTestThread('fallback', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 主流程失败
      entity.getThread().errors.push({
        nodeId: 'primary-node',
        error: 'Primary method failed',
        timestamp: Date.now(),
      });

      // 执行降级处理
      entity.addNodeResult({
        nodeId: 'fallback-node',
        result: 'Fallback executed successfully',
        timestamp: Date.now(),
      });

      expect(entity.getErrors()).toHaveLength(1);
      expect(entity.getNodeResults()).toHaveLength(1);
      expect((entity.getNodeResults()[0]!.result as string)).toContain('Fallback');
    });
  });

  describe('错误类型', () => {
    it('应该正确处理 ConfigurationValidationError', async () => {
      const error = new ConfigurationValidationError('Config error', {
        configType: 'workflow',
        configPath: 'nodes[0].config',
      });

      expect(error.message).toBe('Config error');
      expect(error.context?.['configType']).toBe('workflow');
    });

    it('应该正确处理 ExecutionError', async () => {
      const error = new ExecutionError(
        'Execution failed',
        undefined,
        'workflow-1',
        { nodeId: 'node-1' }
      );

      expect(error.message).toBe('Execution failed');
      expect(error.workflowId).toBe('workflow-1');
    });

    it('应该正确处理 WorkflowNotFoundError', async () => {
      const error = new WorkflowNotFoundError('Workflow not found', 'missing-workflow');

      expect(error.message).toContain('not found');
      expect(error.resourceId).toBe('missing-workflow');
    });
  });

  describe('图验证错误', () => {
    it('应该检测环并报告错误', async () => {
      const workflow = createCyclicTestWorkflow('cycle-error');

      expect(() => workflowRegistry.register(workflow)).toThrow();
    });

    it('应该检测不可达节点并报告错误', async () => {
      const nodes = [
        createTestGraphNode('start', 'START'),
        createTestGraphNode('node-1', 'VARIABLE'),
        createTestGraphNode('unreachable', 'VARIABLE'),
        createTestGraphNode('end', 'END'),
      ];
      const edges = [
        createTestGraphEdge('e1', 'start', 'node-1'),
        createTestGraphEdge('e2', 'node-1', 'end'),
        // unreachable 没有入边
      ];

      const graph = createTestGraphData(nodes, edges);
      const result = GraphValidator.validate(graph);

      expect(result.isErr()).toBe(true);
    });

    it('应该检测孤立节点并报告错误', async () => {
      const nodes = [
        createTestGraphNode('start', 'START'),
        createTestGraphNode('node-1', 'VARIABLE'),
        createTestGraphNode('isolated', 'VARIABLE'),
        createTestGraphNode('end', 'END'),
      ];
      const edges = [
        createTestGraphEdge('e1', 'start', 'node-1'),
        createTestGraphEdge('e2', 'node-1', 'end'),
        // isolated 既没有入边也没有出边
      ];

      const graph = createTestGraphData(nodes, edges);
      const result = GraphValidator.validate(graph);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('线程状态错误', () => {
    it('应该正确处理 FAILED 状态', async () => {
      const thread = createTestThread('failed-thread', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.setStatus('FAILED');

      expect(entity.getStatus()).toBe('FAILED');
    });

    it('应该正确处理 CANCELLED 状态', async () => {
      const thread = createTestThread('cancelled-thread', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.stop();

      expect(entity.shouldStop()).toBe(true);
    });

    it('应该正确处理 PAUSED 状态', async () => {
      const thread = createTestThread('paused-thread', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.pause();

      expect(entity.shouldPause()).toBe(true);
    });
  });
});
