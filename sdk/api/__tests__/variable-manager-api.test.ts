/**
 * VariableManagerAPI 单元测试
 */

import { VariableManagerAPI } from '../variable-manager-api';
import { ThreadRegistry } from '../../core/registry/thread-registry';
import type { ThreadVariable } from '../../types/thread';
import { ThreadStatus } from '../../types/thread';
import { NotFoundError, ValidationError } from '../../types/errors';

describe('VariableManagerAPI', () => {
  let api: VariableManagerAPI;
  let threadRegistry: ThreadRegistry;

  beforeEach(() => {
    threadRegistry = new ThreadRegistry();
    api = new VariableManagerAPI(threadRegistry);
  });

  describe('getVariable', () => {
    it('应该成功获取变量值', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'testVar',
          value: 'testValue',
          type: 'string',
          scope: 'local',
          readonly: false
        }
      ]);

      const value = await api.getVariable(threadId, 'testVar');

      expect(value).toBe('testValue');
    });

    it('应该在变量不存在时抛出错误', async () => {
      const threadId = await createTestThread(threadRegistry, []);

      await expect(api.getVariable(threadId, 'nonExistentVar')).rejects.toThrow(NotFoundError);
    });

    it('应该在线程不存在时抛出错误', async () => {
      await expect(api.getVariable('non-existent-thread', 'testVar')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getVariableDefinition', () => {
    it('应该成功获取变量定义', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'testVar',
          value: 'testValue',
          type: 'string',
          scope: 'local',
          readonly: false
        }
      ]);

      const variable = await api.getVariableDefinition(threadId, 'testVar');

      expect(variable).toBeDefined();
      expect(variable.name).toBe('testVar');
      expect(variable.type).toBe('string');
      expect(variable.scope).toBe('local');
      expect(variable.readonly).toBe(false);
    });

    it('应该在变量不存在时抛出错误', async () => {
      const threadId = await createTestThread(threadRegistry, []);

      await expect(api.getVariableDefinition(threadId, 'nonExistentVar')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getVariables', () => {
    it('应该成功获取所有变量值', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'var1',
          value: 'value1',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'var2',
          value: 42,
          type: 'number',
          scope: 'global',
          readonly: false
        }
      ]);

      const variables = await api.getVariables(threadId);

      expect(variables).toBeDefined();
      expect(variables.var1).toBe('value1');
      expect(variables.var2).toBe(42);
    });

    it('应该返回空对象当没有变量时', async () => {
      const threadId = await createTestThread(threadRegistry, []);

      const variables = await api.getVariables(threadId);

      expect(variables).toEqual({});
    });
  });

  describe('getVariableDefinitions', () => {
    it('应该成功获取所有变量定义', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'var1',
          value: 'value1',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'var2',
          value: 42,
          type: 'number',
          scope: 'global',
          readonly: true
        }
      ]);

      const variables = await api.getVariableDefinitions(threadId);

      expect(variables).toBeDefined();
      expect(variables.length).toBe(2);
      expect(variables[0].name).toBe('var1');
      expect(variables[1].name).toBe('var2');
    });

    it('应该支持按作用域过滤', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'localVar',
          value: 'local',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'globalVar',
          value: 'global',
          type: 'string',
          scope: 'global',
          readonly: false
        }
      ]);

      const localVariables = await api.getVariableDefinitions(threadId, { scope: 'local' });

      expect(localVariables).toBeDefined();
      expect(localVariables.length).toBe(1);
      expect(localVariables[0].name).toBe('localVar');
    });

    it('应该支持按类型过滤', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'stringVar',
          value: 'string',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'numberVar',
          value: 42,
          type: 'number',
          scope: 'local',
          readonly: false
        }
      ]);

      const stringVariables = await api.getVariableDefinitions(threadId, { type: 'string' });

      expect(stringVariables).toBeDefined();
      expect(stringVariables.length).toBe(1);
      expect(stringVariables[0].name).toBe('stringVar');
    });

    it('应该支持按只读属性过滤', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'readonlyVar',
          value: 'readonly',
          type: 'string',
          scope: 'local',
          readonly: true
        },
        {
          name: 'writableVar',
          value: 'writable',
          type: 'string',
          scope: 'local',
          readonly: false
        }
      ]);

      const readonlyVariables = await api.getVariableDefinitions(threadId, { readonly: true });

      expect(readonlyVariables).toBeDefined();
      expect(readonlyVariables.length).toBe(1);
      expect(readonlyVariables[0].name).toBe('readonlyVar');
    });
  });

  describe('updateVariable', () => {
    it('应该成功更新变量值', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'testVar',
          value: 'oldValue',
          type: 'string',
          scope: 'local',
          readonly: false
        }
      ]);

      await api.updateVariable(threadId, 'testVar', 'newValue');

      const value = await api.getVariable(threadId, 'testVar');
      expect(value).toBe('newValue');
    });

    it('应该在变量不存在时抛出错误', async () => {
      const threadId = await createTestThread(threadRegistry, []);

      await expect(api.updateVariable(threadId, 'nonExistentVar', 'value')).rejects.toThrow(NotFoundError);
    });

    it('应该在尝试更新只读变量时抛出错误', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'readonlyVar',
          value: 'readonly',
          type: 'string',
          scope: 'local',
          readonly: true
        }
      ]);

      await expect(api.updateVariable(threadId, 'readonlyVar', 'newValue')).rejects.toThrow(ValidationError);
    });

    it('应该在类型不匹配时抛出错误', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'numberVar',
          value: 42,
          type: 'number',
          scope: 'local',
          readonly: false
        }
      ]);

      await expect(api.updateVariable(threadId, 'numberVar', 'not a number')).rejects.toThrow(ValidationError);
    });

    it('应该允许在选项中禁用类型验证', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'numberVar',
          value: 42,
          type: 'number',
          scope: 'local',
          readonly: false
        }
      ]);

      await api.updateVariable(threadId, 'numberVar', 'not a number', { validateType: false });

      const value = await api.getVariable(threadId, 'numberVar');
      expect(value).toBe('not a number');
    });

    it('应该允许在选项中允许更新只读变量', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'readonlyVar',
          value: 'readonly',
          type: 'string',
          scope: 'local',
          readonly: true
        }
      ]);

      await api.updateVariable(threadId, 'readonlyVar', 'newValue', { allowReadonlyUpdate: true });

      const value = await api.getVariable(threadId, 'readonlyVar');
      expect(value).toBe('newValue');
    });
  });

  describe('updateVariables', () => {
    it('应该成功批量更新变量值', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'var1',
          value: 'old1',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'var2',
          value: 1,
          type: 'number',
          scope: 'local',
          readonly: false
        }
      ]);

      await api.updateVariables(threadId, {
        var1: 'new1',
        var2: 2
      });

      const var1 = await api.getVariable(threadId, 'var1');
      const var2 = await api.getVariable(threadId, 'var2');

      expect(var1).toBe('new1');
      expect(var2).toBe(2);
    });

    it('应该在某个变量不存在时抛出错误', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'var1',
          value: 'value1',
          type: 'string',
          scope: 'local',
          readonly: false
        }
      ]);

      await expect(
        api.updateVariables(threadId, {
          var1: 'new1',
          nonExistentVar: 'value'
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('应该在某个变量是只读时抛出错误', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'writableVar',
          value: 'writable',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'readonlyVar',
          value: 'readonly',
          type: 'string',
          scope: 'local',
          readonly: true
        }
      ]);

      await expect(
        api.updateVariables(threadId, {
          writableVar: 'newWritable',
          readonlyVar: 'newReadonly'
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('hasVariable', () => {
    it('应该返回true当变量存在', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'testVar',
          value: 'value',
          type: 'string',
          scope: 'local',
          readonly: false
        }
      ]);

      const hasVar = await api.hasVariable(threadId, 'testVar');

      expect(hasVar).toBe(true);
    });

    it('应该返回false当变量不存在', async () => {
      const threadId = await createTestThread(threadRegistry, []);

      const hasVar = await api.hasVariable(threadId, 'nonExistentVar');

      expect(hasVar).toBe(false);
    });
  });

  describe('getVariableCount', () => {
    it('应该返回正确的变量数量', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'var1',
          value: 'value1',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'var2',
          value: 'value2',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'var3',
          value: 'value3',
          type: 'string',
          scope: 'local',
          readonly: false
        }
      ]);

      const count = await api.getVariableCount(threadId);

      expect(count).toBe(3);
    });

    it('应该返回0当没有变量时', async () => {
      const threadId = await createTestThread(threadRegistry, []);

      const count = await api.getVariableCount(threadId);

      expect(count).toBe(0);
    });
  });

  describe('getVariablesByScope', () => {
    it('应该返回指定作用域的变量', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'localVar1',
          value: 'local1',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'localVar2',
          value: 'local2',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'globalVar',
          value: 'global',
          type: 'string',
          scope: 'global',
          readonly: false
        }
      ]);

      const localVariables = await api.getVariablesByScope(threadId, 'local');

      expect(localVariables).toBeDefined();
      expect(localVariables.length).toBe(2);
      expect(localVariables.every(v => v.scope === 'local')).toBe(true);
    });
  });

  describe('getVariablesByType', () => {
    it('应该返回指定类型的变量', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'stringVar1',
          value: 'string1',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'stringVar2',
          value: 'string2',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'numberVar',
          value: 42,
          type: 'number',
          scope: 'local',
          readonly: false
        }
      ]);

      const stringVariables = await api.getVariablesByType(threadId, 'string');

      expect(stringVariables).toBeDefined();
      expect(stringVariables.length).toBe(2);
      expect(stringVariables.every(v => v.type === 'string')).toBe(true);
    });
  });

  describe('getReadonlyVariables', () => {
    it('应该返回所有只读变量', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'readonlyVar1',
          value: 'readonly1',
          type: 'string',
          scope: 'local',
          readonly: true
        },
        {
          name: 'readonlyVar2',
          value: 'readonly2',
          type: 'string',
          scope: 'local',
          readonly: true
        },
        {
          name: 'writableVar',
          value: 'writable',
          type: 'string',
          scope: 'local',
          readonly: false
        }
      ]);

      const readonlyVariables = await api.getReadonlyVariables(threadId);

      expect(readonlyVariables).toBeDefined();
      expect(readonlyVariables.length).toBe(2);
      expect(readonlyVariables.every(v => v.readonly === true)).toBe(true);
    });
  });

  describe('getWritableVariables', () => {
    it('应该返回所有可写变量', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'readonlyVar',
          value: 'readonly',
          type: 'string',
          scope: 'local',
          readonly: true
        },
        {
          name: 'writableVar1',
          value: 'writable1',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'writableVar2',
          value: 'writable2',
          type: 'string',
          scope: 'local',
          readonly: false
        }
      ]);

      const writableVariables = await api.getWritableVariables(threadId);

      expect(writableVariables).toBeDefined();
      expect(writableVariables.length).toBe(2);
      expect(writableVariables.every(v => v.readonly === false)).toBe(true);
    });
  });

  describe('exportVariables', () => {
    it('应该成功导出变量', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'var1',
          value: 'value1',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'var2',
          value: 42,
          type: 'number',
          scope: 'global',
          readonly: true
        }
      ]);

      const exported = await api.exportVariables(threadId);

      expect(exported).toBeDefined();
      expect(exported.var1).toBeDefined();
      expect(exported.var1.value).toBe('value1');
      expect(exported.var1.type).toBe('string');
      expect(exported.var1.scope).toBe('local');
      expect(exported.var1.readonly).toBe(false);

      expect(exported.var2).toBeDefined();
      expect(exported.var2.value).toBe(42);
      expect(exported.var2.type).toBe('number');
      expect(exported.var2.scope).toBe('global');
      expect(exported.var2.readonly).toBe(true);
    });

    it('应该支持过滤导出', async () => {
      const threadId = await createTestThread(threadRegistry, [
        {
          name: 'localVar',
          value: 'local',
          type: 'string',
          scope: 'local',
          readonly: false
        },
        {
          name: 'globalVar',
          value: 'global',
          type: 'string',
          scope: 'global',
          readonly: false
        }
      ]);

      const exported = await api.exportVariables(threadId, { scope: 'local' });

      expect(exported).toBeDefined();
      expect(exported.localVar).toBeDefined();
      expect(exported.globalVar).toBeUndefined();
    });
  });
});

/**
 * 辅助函数：创建测试线程
 */
async function createTestThread(
  threadRegistry: ThreadRegistry,
  variables: ThreadVariable[]
): Promise<string> {
  const { ThreadContext } = await import('../../core/execution/context/thread-context');
  const { WorkflowContext } = await import('../../core/execution/context/workflow-context');
  const { ConversationManager } = await import('../../core/execution/conversation');
  const { LLMExecutor } = await import('../../core/execution/llm-executor');
  const { generateId } = await import('../../utils');

  const workflow = {
    id: 'test-workflow',
    name: 'Test Workflow',
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [],
    edges: []
  };

  const workflowContext = new WorkflowContext(workflow);
  const conversationManager = new ConversationManager();
  const llmExecutor = new LLMExecutor(conversationManager);

  const variableValues: Record<string, any> = {};
  for (const variable of variables) {
    variableValues[variable.name] = variable.value;
  }

  const thread = {
    id: generateId(),
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    status: ThreadStatus.RUNNING,
    currentNodeId: '',
    variables: variables,
    variableValues: variableValues,
    input: {},
    output: {},
    nodeResults: [],
    startTime: Date.now(),
    errors: []
  };

  const threadContext = new ThreadContext(thread, workflowContext, llmExecutor);
  threadRegistry.register(threadContext);

  return thread.id;
}