/**
 * 线程创建与管理测试
 *
 * 测试场景：
 * - 基础线程创建
 * - 线程模板缓存
 * - 线程深拷贝
 * - Fork 子线程创建
 * - 线程注册表管理
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThreadRegistry } from '../services/thread-registry.js';
import { ThreadEntity } from '../entities/thread-entity.js';
import { ThreadState } from '../entities/thread-state.js';
import { ExecutionState } from '../entities/execution-state.js';
import { GraphRegistry } from '../services/graph-registry.js';
import { WorkflowRegistry } from '../services/workflow-registry.js';
import type { Thread, ThreadStatus } from '@modular-agent/types';
import {
  createSimpleTestWorkflow,
  createTestNode,
} from './fixtures/test-helpers.js';

/**
 * 创建测试 Thread 对象
 */
function createTestThread(
  threadId: string,
  workflowId: string,
  options: {
    status?: ThreadStatus;
    currentNodeId?: string;
    input?: Record<string, any>;
  } = {}
): Thread {
  return {
    id: threadId,
    workflowId,
    workflowVersion: '1.0.0',
    status: options.status || 'CREATED',
    currentNodeId: options.currentNodeId || 'start',
    input: options.input || {},
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

/**
 * 创建测试 ThreadEntity
 */
function createTestThreadEntity(
  threadId: string,
  workflowId: string,
  options: {
    status?: ThreadStatus;
    currentNodeId?: string;
  } = {}
): ThreadEntity {
  const thread = createTestThread(threadId, workflowId, options);
  const executionState = new ExecutionState();
  return new ThreadEntity(thread, executionState);
}

describe('ThreadRegistry - 线程注册表', () => {
  let threadRegistry: ThreadRegistry;

  beforeEach(() => {
    threadRegistry = new ThreadRegistry();
  });

  afterEach(() => {
    threadRegistry.clear();
  });

  describe('基础线程注册', () => {
    it('应该成功注册线程', () => {
      const entity = createTestThreadEntity('thread-1', 'workflow-1');

      threadRegistry.register(entity);

      expect(threadRegistry.has('thread-1')).toBe(true);
      expect(threadRegistry.get('thread-1')).toBe(entity);
    });

    it('应该成功注销线程', () => {
      const entity = createTestThreadEntity('thread-2', 'workflow-1');
      threadRegistry.register(entity);

      threadRegistry.delete('thread-2');

      expect(threadRegistry.has('thread-2')).toBe(false);
      expect(threadRegistry.get('thread-2')).toBeNull();
    });

    it('应该正确查询线程', () => {
      const entity = createTestThreadEntity('thread-3', 'workflow-1');
      threadRegistry.register(entity);

      const retrieved = threadRegistry.get('thread-3');
      expect(retrieved).toBeDefined();
      expect(retrieved!.getThreadId()).toBe('thread-3');
      expect(retrieved!.getWorkflowId()).toBe('workflow-1');
    });

    it('应该正确列出所有线程', () => {
      threadRegistry.register(createTestThreadEntity('thread-a', 'workflow-1'));
      threadRegistry.register(createTestThreadEntity('thread-b', 'workflow-2'));
      threadRegistry.register(createTestThreadEntity('thread-c', 'workflow-1'));

      const allThreads = threadRegistry.getAll();
      expect(allThreads).toHaveLength(3);
    });

    it('应该正确清空所有线程', () => {
      threadRegistry.register(createTestThreadEntity('thread-1', 'workflow-1'));
      threadRegistry.register(createTestThreadEntity('thread-2', 'workflow-2'));

      threadRegistry.clear();

      expect(threadRegistry.getAll()).toHaveLength(0);
    });
  });

  describe('线程状态追踪', () => {
    it('应该正确追踪线程状态', () => {
      const entity = createTestThreadEntity('status-thread', 'workflow-1');
      entity.setStatus('RUNNING');
      threadRegistry.register(entity);

      const retrieved = threadRegistry.get('status-thread');
      expect(retrieved!.getStatus()).toBe('RUNNING');
    });

    it('应该支持状态更新', () => {
      const entity = createTestThreadEntity('update-thread', 'workflow-1');
      entity.setStatus('CREATED');
      threadRegistry.register(entity);

      // 更新状态
      const retrieved = threadRegistry.get('update-thread');
      if (retrieved) {
        retrieved.setStatus('RUNNING');
      }

      const updated = threadRegistry.get('update-thread');
      expect(updated!.getStatus()).toBe('RUNNING');
    });

    it('应该正确统计各状态的线程数量', () => {
      const e1 = createTestThreadEntity('t1', 'w1');
      e1.setStatus('CREATED');
      threadRegistry.register(e1);

      const e2 = createTestThreadEntity('t2', 'w1');
      e2.setStatus('RUNNING');
      threadRegistry.register(e2);

      const e3 = createTestThreadEntity('t3', 'w1');
      e3.setStatus('RUNNING');
      threadRegistry.register(e3);

      const e4 = createTestThreadEntity('t4', 'w1');
      e4.setStatus('COMPLETED');
      threadRegistry.register(e4);

      const threads = threadRegistry.getAll();
      const createdCount = threads.filter((t) => t.getStatus() === 'CREATED').length;
      const runningCount = threads.filter((t) => t.getStatus() === 'RUNNING').length;
      const completedCount = threads.filter((t) => t.getStatus() === 'COMPLETED').length;

      expect(createdCount).toBe(1);
      expect(runningCount).toBe(2);
      expect(completedCount).toBe(1);
    });
  });

  describe('批量操作', () => {
    it('应该支持批量注册', () => {
      const entities = [
        createTestThreadEntity('batch-1', 'workflow-1'),
        createTestThreadEntity('batch-2', 'workflow-1'),
        createTestThreadEntity('batch-3', 'workflow-1'),
      ];

      for (const entity of entities) {
        threadRegistry.register(entity);
      }

      expect(threadRegistry.getAll()).toHaveLength(3);
    });

    it('应该支持批量注销', () => {
      threadRegistry.register(createTestThreadEntity('del-1', 'workflow-1'));
      threadRegistry.register(createTestThreadEntity('del-2', 'workflow-1'));
      threadRegistry.register(createTestThreadEntity('del-3', 'workflow-1'));

      threadRegistry.delete('del-1');
      threadRegistry.delete('del-2');

      expect(threadRegistry.getAll()).toHaveLength(1);
      expect(threadRegistry.has('del-3')).toBe(true);
    });
  });
});

describe('ThreadEntity - 线程实体', () => {
  describe('基础属性访问', () => {
    it('应该正确获取线程 ID', () => {
      const entity = createTestThreadEntity('entity-1', 'workflow-1');
      expect(entity.getThreadId()).toBe('entity-1');
    });

    it('应该正确获取工作流 ID', () => {
      const entity = createTestThreadEntity('entity-2', 'workflow-2');
      expect(entity.getWorkflowId()).toBe('workflow-2');
    });

    it('应该正确获取和设置状态', () => {
      const entity = createTestThreadEntity('entity-3', 'workflow-1');
      expect(entity.getStatus()).toBe('CREATED');

      entity.setStatus('RUNNING');
      expect(entity.getStatus()).toBe('RUNNING');
    });

    it('应该正确获取和设置当前节点', () => {
      const entity = createTestThreadEntity('entity-4', 'workflow-1');
      expect(entity.getCurrentNodeId()).toBe('start');

      entity.setCurrentNodeId('node-1');
      expect(entity.getCurrentNodeId()).toBe('node-1');
    });
  });

  describe('输入输出', () => {
    it('应该正确获取输入', () => {
      const thread = createTestThread('io-thread', 'workflow-1', {
        input: { key1: 'value1', key2: 123 },
      });
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      const input = entity.getInput();
      expect(input['key1']).toBe('value1');
      expect(input['key2']).toBe(123);
    });

    it('应该正确设置输出', () => {
      const entity = createTestThreadEntity('output-thread', 'workflow-1');

      entity.setOutput({ result: 'success', data: [1, 2, 3] });

      const output = entity.getOutput();
      expect(output['result']).toBe('success');
      expect(output['data']).toEqual([1, 2, 3]);
    });
  });

  describe('执行结果', () => {
    it('应该正确添加节点结果', () => {
      const entity = createTestThreadEntity('result-thread', 'workflow-1');

      entity.addNodeResult({ nodeId: 'node-1', result: 'result-1' });
      entity.addNodeResult({ nodeId: 'node-2', result: 'result-2' });

      const results = entity.getNodeResults();
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ nodeId: 'node-1', result: 'result-1' });
    });

    it('应该正确获取所有结果', () => {
      const entity = createTestThreadEntity('all-results', 'workflow-1');

      entity.addNodeResult({ nodeId: 'n1', value: 1 });
      entity.addNodeResult({ nodeId: 'n2', value: 2 });
      entity.addNodeResult({ nodeId: 'n3', value: 3 });

      const results = entity.getNodeResults();
      expect(results).toHaveLength(3);
    });
  });

  describe('子图执行状态', () => {
    it('应该正确进入子图', () => {
      const entity = createTestThreadEntity('subgraph-thread', 'workflow-1');

      entity.enterSubgraph('sub-workflow-1', 'workflow-1', { input: 'value' });

      const context = entity.getCurrentSubgraphContext();
      expect(context).toBeDefined();
      expect(context!.workflowId).toBe('sub-workflow-1');
    });

    it('应该正确退出子图', () => {
      const entity = createTestThreadEntity('exit-subgraph', 'workflow-1');

      entity.enterSubgraph('sub-1', 'workflow-1', {});
      entity.enterSubgraph('sub-2', 'sub-1', {});
      entity.exitSubgraph();

      const context = entity.getCurrentSubgraphContext();
      expect(context!.workflowId).toBe('sub-1');
    });

    it('应该正确获取子图栈', () => {
      const entity = createTestThreadEntity('subgraph-stack', 'workflow-1');

      entity.enterSubgraph('sub-1', 'workflow-1', {});
      entity.enterSubgraph('sub-2', 'sub-1', {});

      const stack = entity.getSubgraphStack();
      expect(stack).toHaveLength(2);
    });
  });

  describe('Fork/Join 上下文', () => {
    it('应该正确设置 Fork ID', () => {
      const entity = createTestThreadEntity('fork-thread', 'workflow-1');

      entity.setForkId('fork-1');

      const thread = entity.getThread();
      expect(thread.forkJoinContext?.forkId).toBe('fork-1');
    });

    it('应该正确设置 Fork Path ID', () => {
      const entity = createTestThreadEntity('fork-path', 'workflow-1');

      entity.setForkPathId('path-a');

      const thread = entity.getThread();
      expect(thread.forkJoinContext?.forkPathId).toBe('path-a');
    });
  });

  describe('触发子工作流上下文', () => {
    it('应该正确注册子线程', () => {
      const entity = createTestThreadEntity('parent-thread', 'workflow-1');

      entity.registerChildThread('child-1');
      entity.registerChildThread('child-2');

      const thread = entity.getThread();
      expect(thread.triggeredSubworkflowContext?.childThreadIds).toContain('child-1');
      expect(thread.triggeredSubworkflowContext?.childThreadIds).toContain('child-2');
    });

    it('应该正确注销子线程', () => {
      const entity = createTestThreadEntity('unregister-child', 'workflow-1');

      entity.registerChildThread('child-1');
      entity.registerChildThread('child-2');
      entity.unregisterChildThread('child-1');

      const thread = entity.getThread();
      expect(thread.triggeredSubworkflowContext?.childThreadIds).not.toContain('child-1');
      expect(thread.triggeredSubworkflowContext?.childThreadIds).toContain('child-2');
    });

    it('应该正确设置父线程 ID', () => {
      const entity = createTestThreadEntity('child-thread', 'workflow-1');

      entity.setParentThreadId('parent-1');

      expect(entity.getParentThreadId()).toBe('parent-1');
    });
  });

  describe('中断控制', () => {
    it('应该正确暂停执行', () => {
      const entity = createTestThreadEntity('pause-thread', 'workflow-1');
      entity.setStatus('RUNNING');

      entity.pause();

      expect(entity.shouldPause()).toBe(true);
    });

    it('应该正确恢复执行', () => {
      const entity = createTestThreadEntity('resume-thread', 'workflow-1');
      entity.pause();

      entity.resume();

      expect(entity.shouldPause()).toBe(false);
    });

    it('应该正确停止执行', () => {
      const entity = createTestThreadEntity('stop-thread', 'workflow-1');
      entity.setStatus('RUNNING');

      entity.stop();

      expect(entity.shouldStop()).toBe(true);
      expect(entity.isAborted()).toBe(true);
    });
  });
});

describe('ThreadState - 线程状态', () => {
  it('应该正确初始化状态', () => {
    const state = new ThreadState();
    expect(state.status).toBe('CREATED');
  });

  it('应该正确转换状态', () => {
    const state = new ThreadState();

    state.status = 'RUNNING';
    expect(state.status).toBe('RUNNING');

    state.status = 'COMPLETED';
    expect(state.status).toBe('COMPLETED');
  });

  it('应该正确处理中断', () => {
    const state = new ThreadState();

    state.interrupt('PAUSE');
    expect(state.shouldPause()).toBe(true);

    state.resetInterrupt();
    expect(state.shouldPause()).toBe(false);

    state.interrupt('STOP');
    expect(state.shouldStop()).toBe(true);
  });
});

describe('ExecutionState - 执行状态', () => {
  it('应该正确管理子图栈', () => {
    const state = new ExecutionState();

    state.enterSubgraph('sub-1', 'parent-1', {});
    state.enterSubgraph('sub-2', 'sub-1', {});

    const context = state.getCurrentSubgraphContext();
    expect(context!.workflowId).toBe('sub-2');

    state.exitSubgraph();
    const parentContext = state.getCurrentSubgraphContext();
    expect(parentContext!.workflowId).toBe('sub-1');
  });

  it('应该正确处理空子图栈', () => {
    const state = new ExecutionState();

    const context = state.getCurrentSubgraphContext();
    expect(context).toBeNull();
  });
});
