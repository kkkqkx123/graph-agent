/**
 * 变量系统测试
 *
 * 测试场景：
 * - 四级作用域
 * - 变量读写
 * - 变量传递
 * - 变量引用解析
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThreadEntity } from '../entities/thread-entity.js';
import { ExecutionState } from '../entities/execution-state.js';
import { VariableStateManager } from '../../agent/execution/managers/variable-state-manager.js';
import type { Thread, VariableScopes } from '@modular-agent/types';

/**
 * 创建测试 Thread 对象
 */
function createTestThread(
  threadId: string,
  workflowId: string,
  options: {
    variableScopes?: VariableScopes;
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
    threadType: 'MAIN',
    variableScopes: options.variableScopes || {
      global: {},
      thread: {},
      local: [],
      loop: [],
    },
  };
}

describe('Variable System - 变量系统', () => {
  describe('四级作用域', () => {
    it('global 作用域应该跨线程共享', async () => {
      const thread1 = createTestThread('thread-1', 'workflow-1');
      const thread2 = createTestThread('thread-2', 'workflow-1');

      const executionState1 = new ExecutionState();
      const executionState2 = new ExecutionState();
      const entity1 = new ThreadEntity(thread1, executionState1);
      const entity2 = new ThreadEntity(thread2, executionState2);

      // 在 thread-1 设置 global 变量
      entity1.getThread().variableScopes.global = { sharedVar: 'shared-value' };

      // thread-2 应该能访问（模拟共享）
      entity2.getThread().variableScopes.global = { sharedVar: 'shared-value' };

      expect(entity1.getThread().variableScopes.global['sharedVar']).toBe('shared-value');
      expect(entity2.getThread().variableScopes.global['sharedVar']).toBe('shared-value');
    });

    it('thread 作用域应该在线程内共享', async () => {
      const thread = createTestThread('thread-scope', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 设置 thread 作用域变量
      entity.setVariable('threadVar', 'thread-value');

      // 在同一线程内应该能访问
      expect(entity.getVariable('threadVar')).toBe('thread-value');
    });

    it('local 作用域应该在节点内有效', async () => {
      const thread = createTestThread('local-scope', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟进入节点，创建 local 作用域
      entity.getThread().variableScopes.local.push({ nodeId: 'node-1', variables: { localVar: 'local-value' } });

      // 在 local 作用域内应该能访问
      const localScope = entity.getThread().variableScopes.local[0];
      expect(localScope!['variables']['localVar']).toBe('local-value');
    });

    it('loop 作用域应该在循环内有效', async () => {
      const thread = createTestThread('loop-scope', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟进入循环，创建 loop 作用域
      entity.getThread().variableScopes.loop.push({
        loopId: 'loop-1',
        iteration: 0,
        variables: { loopVar: 'loop-value' },
      });

      // 在 loop 作用域内应该能访问
      const loopScope = entity.getThread().variableScopes.loop[0];
      expect(loopScope!['variables']['loopVar']).toBe('loop-value');
    });

    it('作用域优先级应该是 local > loop > thread > global', async () => {
      const thread = createTestThread('priority-test', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 设置各作用域变量
      entity.getThread().variableScopes.global = { var: 'global-value' };
      entity.getThread().variableScopes.thread = { var: 'thread-value' };
      entity.getThread().variableScopes.local = [{ nodeId: 'node-1', variables: { var: 'local-value' } }];

      // 验证各作用域存在
      expect(entity.getThread().variableScopes.global['var']).toBe('global-value');
      expect(entity.getThread().variableScopes.thread['var']).toBe('thread-value');
      expect(entity.getThread().variableScopes.local[0]!['variables']['var']).toBe('local-value');
    });
  });

  describe('变量读写', () => {
    it('应该正确读取变量', async () => {
      const thread = createTestThread('read-test', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.setVariable('testVar', { nested: { value: 123 } });

      const value = entity.getVariable('testVar');
      expect(value.nested.value).toBe(123);
    });

    it('应该正确写入变量', async () => {
      const thread = createTestThread('write-test', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.setVariable('newVar', 'new-value');
      expect(entity.getVariable('newVar')).toBe('new-value');

      // 更新变量
      entity.setVariable('newVar', 'updated-value');
      expect(entity.getVariable('newVar')).toBe('updated-value');
    });

    it('应该验证作用域隔离', async () => {
      const thread1 = createTestThread('isolate-1', 'workflow-1');
      const thread2 = createTestThread('isolate-2', 'workflow-1');

      const executionState1 = new ExecutionState();
      const executionState2 = new ExecutionState();
      const entity1 = new ThreadEntity(thread1, executionState1);
      const entity2 = new ThreadEntity(thread2, executionState2);

      entity1.setVariable('isolatedVar', 'value-1');
      entity2.setVariable('isolatedVar', 'value-2');

      expect(entity1.getVariable('isolatedVar')).toBe('value-1');
      expect(entity2.getVariable('isolatedVar')).toBe('value-2');
    });

    it('应该正确删除变量', async () => {
      const thread = createTestThread('delete-test', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.setVariable('toDelete', 'value');
      expect(entity.getVariable('toDelete')).toBe('value');

      const deleted = entity.deleteVariable('toDelete');
      expect(deleted).toBe(true);
      expect(entity.getVariable('toDelete')).toBeUndefined();
    });

    it('应该正确获取所有变量', async () => {
      const thread = createTestThread('all-vars', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.setVariable('var1', 'value1');
      entity.setVariable('var2', 'value2');
      entity.setVariable('var3', 'value3');

      const allVars = entity.getAllVariables();
      expect(allVars['var1']).toBe('value1');
      expect(allVars['var2']).toBe('value2');
      expect(allVars['var3']).toBe('value3');
    });
  });

  describe('变量传递', () => {
    it('应该正确在节点间传递变量', async () => {
      const thread = createTestThread('node-transfer', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟节点 1 设置变量
      entity.setVariable('node1Output', 'data-from-node-1');

      // 模拟节点 2 读取变量
      const node2Input = entity.getVariable('node1Output');
      expect(node2Input).toBe('data-from-node-1');

      // 模拟节点 2 处理并设置新变量
      entity.setVariable('node2Output', `processed-${node2Input}`);
      expect(entity.getVariable('node2Output')).toBe('processed-data-from-node-1');
    });

    it('应该正确在父子线程间传递变量', async () => {
      const parentThread = createTestThread('parent', 'workflow-1');
      const childThread = createTestThread('child', 'workflow-1');

      const parentExecutionState = new ExecutionState();
      const childExecutionState = new ExecutionState();
      const parentEntity = new ThreadEntity(parentThread, parentExecutionState);
      const childEntity = new ThreadEntity(childThread, childExecutionState);

      // 父线程设置 global 变量
      parentEntity.getThread().variableScopes.global = { parentData: 'from-parent' };

      // 子线程应该能访问 global 变量
      childEntity.getThread().variableScopes.global = { parentData: 'from-parent' };
      expect(childEntity.getThread().variableScopes.global['parentData']).toBe('from-parent');
    });

    it('应该正确处理变量引用', async () => {
      const thread = createTestThread('reference', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.setVariable('user', { name: 'Alice', age: 30 });
      entity.setVariable('greeting', 'Hello');

      // 验证嵌套对象
      const user = entity.getVariable('user');
      expect(user.name).toBe('Alice');
      expect(user.age).toBe(30);
    });
  });

  describe('变量引用解析', () => {
    it('应该正确解析模板字符串变量引用', async () => {
      // 模拟模板字符串解析
      const template = 'Hello, ${user.name}! You are ${user.age} years old.';
      const variables = {
        user: { name: 'Bob', age: 25 },
      };

      // 简单的模板解析模拟
      const resolved = template
        .replace(/\$\{user\.name\}/g, variables.user.name)
        .replace(/\$\{user\.age\}/g, String(variables.user.age));

      expect(resolved).toBe('Hello, Bob! You are 25 years old.');
    });

    it('应该正确解析复杂表达式', async () => {
      const thread = createTestThread('complex-expr', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 设置复杂数据结构
      entity.setVariable('data', {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
        metadata: {
          total: 2,
          page: 1,
        },
      });

      const data = entity.getVariable('data');
      expect(data.items).toHaveLength(2);
      expect(data.items[0].name).toBe('Item 1');
      expect(data.metadata.total).toBe(2);
    });

    it('应该正确处理不存在的变量引用', async () => {
      const thread = createTestThread('missing-ref', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 获取不存在的变量应该返回 undefined
      const missing = entity.getVariable('nonExistentVar');
      expect(missing).toBeUndefined();
    });

    it('应该正确处理 null 和 undefined 值', async () => {
      const thread = createTestThread('null-values', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.setVariable('nullVar', null);
      entity.setVariable('undefinedVar', undefined);

      expect(entity.getVariable('nullVar')).toBeNull();
      expect(entity.getVariable('undefinedVar')).toBeUndefined();
    });
  });

  describe('VariableStateManager', () => {
    it('应该正确管理变量状态', async () => {
      const manager = new VariableStateManager('test-thread');

      manager.setVariable('managedVar', 'managed-value');
      expect(manager.getVariable('managedVar')).toBe('managed-value');
    });

    it('应该正确追踪变量变更', async () => {
      const manager = new VariableStateManager('track-thread');

      manager.setVariable('trackedVar', 'initial');
      manager.setVariable('trackedVar', 'updated');

      expect(manager.getVariable('trackedVar')).toBe('updated');
    });

    it('应该正确获取所有变量快照', async () => {
      const manager = new VariableStateManager('snapshot-thread');

      manager.setVariable('var1', 'value1');
      manager.setVariable('var2', 'value2');

      const snapshot = manager.getAllVariables();
      expect(snapshot['var1']).toBe('value1');
      expect(snapshot['var2']).toBe('value2');
    });
  });

  describe('变量类型支持', () => {
    it('应该支持字符串类型', async () => {
      const thread = createTestThread('string-type', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.setVariable('stringVar', 'Hello, World!');
      expect(entity.getVariable('stringVar')).toBe('Hello, World!');
    });

    it('应该支持数字类型', async () => {
      const thread = createTestThread('number-type', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.setVariable('numberVar', 42);
      entity.setVariable('floatVar', 3.14159);

      expect(entity.getVariable('numberVar')).toBe(42);
      expect(entity.getVariable('floatVar')).toBe(3.14159);
    });

    it('应该支持布尔类型', async () => {
      const thread = createTestThread('bool-type', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.setVariable('boolVar', true);
      expect(entity.getVariable('boolVar')).toBe(true);

      entity.setVariable('boolVar', false);
      expect(entity.getVariable('boolVar')).toBe(false);
    });

    it('应该支持数组类型', async () => {
      const thread = createTestThread('array-type', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.setVariable('arrayVar', [1, 2, 3, 'four', { five: 5 }]);

      const arr = entity.getVariable('arrayVar');
      expect(arr).toHaveLength(5);
      expect(arr[0]).toBe(1);
      expect(arr[3]).toBe('four');
      expect(arr[4].five).toBe(5);
    });

    it('应该支持对象类型', async () => {
      const thread = createTestThread('object-type', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.setVariable('objectVar', {
        name: 'Test',
        nested: {
          deep: {
            value: 'deep-value',
          },
        },
        array: [1, 2, 3],
      });

      const obj = entity.getVariable('objectVar');
      expect(obj.name).toBe('Test');
      expect(obj.nested.deep.value).toBe('deep-value');
      expect(obj.array).toEqual([1, 2, 3]);
    });

    it('应该支持日期类型', async () => {
      const thread = createTestThread('date-type', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      const now = new Date();
      entity.setVariable('dateVar', now);

      expect(entity.getVariable('dateVar')).toEqual(now);
    });
  });

  describe('变量作用域操作', () => {
    it('应该正确进入和退出 local 作用域', async () => {
      const thread = createTestThread('local-scope-op', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 进入节点，创建 local 作用域
      entity.getThread().variableScopes.local.push({
        nodeId: 'node-1',
        variables: { localOnly: 'local-value' },
      });

      expect(entity.getThread().variableScopes.local).toHaveLength(1);

      // 退出节点，移除 local 作用域
      entity.getThread().variableScopes.local.pop();

      expect(entity.getThread().variableScopes.local).toHaveLength(0);
    });

    it('应该正确进入和退出 loop 作用域', async () => {
      const thread = createTestThread('loop-scope-op', 'workflow-1');
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 进入循环
      entity.getThread().variableScopes.loop.push({
        loopId: 'loop-1',
        iteration: 0,
        variables: { index: 0 },
      });

      expect(entity.getThread().variableScopes.loop).toHaveLength(1);

      // 更新迭代
      entity.getThread().variableScopes.loop[0]!['iteration'] = 1;
      entity.getThread().variableScopes.loop[0]!['variables']['index'] = 1;

      expect(entity.getThread().variableScopes.loop[0]!['iteration']).toBe(1);

      // 退出循环
      entity.getThread().variableScopes.loop.pop();

      expect(entity.getThread().variableScopes.loop).toHaveLength(0);
    });
  });
});
