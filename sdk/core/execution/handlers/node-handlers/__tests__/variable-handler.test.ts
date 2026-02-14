/**
 * Variable节点处理函数单元测试
 */

import { variableHandler } from '../variable-handler';
import type { Node, VariableNodeConfig } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import type { Thread } from '@modular-agent/types';
import { ThreadStatus } from '@modular-agent/types';
import { ValidationError } from '@modular-agent/types';

describe('variable-handler', () => {
  let mockThread: Thread;
  let mockNode: Node;

  beforeEach(() => {
    // 初始化mock thread
    mockThread = {
      id: 'thread-1',
      workflowId: 'workflow-1',
      workflowVersion: '1.0.0',
      status: ThreadStatus.RUNNING,
      currentNodeId: '',
      graph: {} as any,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      input: {},
      output: {},
      nodeResults: [],
      startTime: 0,
      errors: []
    };
  });

  describe('基本功能测试', () => {
    it('应该成功执行简单的表达式并更新变量', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'result',
          expression: '10 + 20',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result).toMatchObject({
        variableName: 'result',
        value: 30,
        type: 'number'
      });

      // 验证变量已更新到thread作用域
      expect(mockThread.variableScopes.thread?.['result']).toBe(30);

      // 验证变量已添加到variables数组
      expect(mockThread.variables).toHaveLength(1);
      expect(mockThread.variables[0]).toMatchObject({
        name: 'result',
        value: 30,
        type: 'number',
        scope: 'thread',
        readonly: false
      });

      // 验证执行历史已记录
      expect(mockThread.nodeResults).toHaveLength(1);
      expect(mockThread.nodeResults[0]).toMatchObject({
        step: 1,
        nodeId: 'variable-node-1',
        nodeType: NodeType.VARIABLE,
        status: 'COMPLETED',
        data: {
          variableName: 'result',
          value: 30,
          type: 'number'
        }
      });
    });

    it('应该更新已存在的变量', async () => {
      mockThread.variables = [
        {
          name: 'counter',
          value: 5,
          type: 'number',
          scope: 'thread',
          readonly: false
        }
      ];
      mockThread.variableScopes.thread = {
        counter: 5
      };

      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'counter',
          expression: 'counter + 1',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.value).toBe(6);
      expect(mockThread.variableScopes.thread?.['counter']).toBe(6);
      expect(mockThread.variables).toHaveLength(1); // 不应该添加新变量
    });
  });

  describe('变量引用解析测试', () => {
    it('应该正确解析thread作用域的变量引用', async () => {
      mockThread.variableScopes.thread = {
        baseValue: 10,
        multiplier: 2
      };

      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'result',
          expression: '{{baseValue}} * {{multiplier}}',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.value).toBe(20);
    });

    it('应该正确解析global作用域的变量引用', async () => {
      mockThread.variableScopes.global = {
        globalValue: 100
      };

      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'result',
          expression: '{{globalValue}} / 2',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.value).toBe(50);
    });

    it('应该优先使用thread作用域的变量', async () => {
      mockThread.variableScopes.thread = {
        value: 10
      };
      mockThread.variableScopes.global = {
        value: 100
      };

      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'result',
          expression: '{{value}}',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.value).toBe(10); // 应该使用thread作用域的值
    });

    it('应该正确处理嵌套对象属性', async () => {
      mockThread.variableScopes.thread = {
        user: {
          name: 'John',
          age: 30
        }
      };

      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'userName',
          expression: '{{user.name}}',
          variableType: 'string',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.value).toBe('John');
    });

    it('应该正确处理不存在的变量引用', async () => {
      mockThread.variableScopes.thread = {};

      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'result',
          expression: '{{nonExistentVar}} + 1',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      // undefined + 1 = NaN
      expect(result.value).toBeNaN();
    });
  });

  describe('类型转换测试', () => {
    it('应该正确转换为number类型', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'num',
          expression: '"42"',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.value).toBe(42);
      expect(typeof result.value).toBe('number');
    });

    it('应该在number转换失败时抛出错误', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'num',
          expression: '"not a number"',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(variableHandler(mockThread, mockNode))
        .rejects
        .toThrow(ValidationError);
    });

    it('应该正确转换为string类型', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'str',
          expression: '123',
          variableType: 'string',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.value).toBe('123');
      expect(typeof result.value).toBe('string');
    });

    it('应该正确转换为boolean类型', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'bool',
          expression: '1',
          variableType: 'boolean',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.value).toBe(true);
      expect(typeof result.value).toBe('boolean');
    });

    it('应该正确转换为array类型', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'arr',
          expression: '[1, 2, 3]',
          variableType: 'array',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.value).toEqual([1, 2, 3]);
      expect(Array.isArray(result.value)).toBe(true);
    });

    it('应该正确转换为object类型', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'obj',
          expression: '{ key: "value" }',
          variableType: 'object',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.value).toEqual({ key: 'value' });
      expect(typeof result.value).toBe('object');
    });

    it('应该在无效类型时抛出错误', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'invalid',
          expression: '42',
          variableType: 'invalid_type' as any,
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(variableHandler(mockThread, mockNode))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('作用域测试', () => {
    it('应该正确更新global作用域的变量', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'globalVar',
          expression: '100',
          variableType: 'number',
          scope: 'global'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await variableHandler(mockThread, mockNode);

      expect(mockThread.variableScopes.global?.['globalVar']).toBe(100);
      expect(mockThread.variableScopes.thread?.['globalVar']).toBeUndefined();
    });

    it('应该正确更新thread作用域的变量', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'threadVar',
          expression: '200',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await variableHandler(mockThread, mockNode);

      expect(mockThread.variableScopes.thread?.['threadVar']).toBe(200);
      expect(mockThread.variableScopes.global?.['threadVar']).toBeUndefined();
    });

    it('应该正确更新subgraph作用域的变量', async () => {
      mockThread.variableScopes.subgraph = [{}];

      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'subgraphVar',
          expression: '300',
          variableType: 'number',
          scope: 'subgraph'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await variableHandler(mockThread, mockNode);

      expect(mockThread.variableScopes.local[0]?.['localVar']).toBe(300);
    });

    it('应该正确更新loop作用域的变量', async () => {
      mockThread.variableScopes.loop = [{}];

      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'loopVar',
          expression: '400',
          variableType: 'number',
          scope: 'loop'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await variableHandler(mockThread, mockNode);

      expect(mockThread.variableScopes.loop[0]?.['loopVar']).toBe(400);
    });
  });

  describe('执行条件测试', () => {
    it('应该在非RUNNING状态下跳过执行', async () => {
      const nonRunningStates = [
        ThreadStatus.CREATED,
        ThreadStatus.PAUSED,
        ThreadStatus.COMPLETED,
        ThreadStatus.FAILED,
        ThreadStatus.CANCELLED,
        ThreadStatus.TIMEOUT
      ];

      for (const status of nonRunningStates) {
        mockThread.status = status;
        mockThread.nodeResults = [];

        mockNode = {
          id: 'variable-node-1',
          name: 'Variable Node',
          type: NodeType.VARIABLE,
          config: {
            variableName: 'result',
            expression: '10 + 20',
            variableType: 'number',
            scope: 'thread'
          } as VariableNodeConfig,
          incomingEdgeIds: [],
          outgoingEdgeIds: []
        };

        const result = await variableHandler(mockThread, mockNode);

        expect(result).toMatchObject({
          nodeId: 'variable-node-1',
          nodeType: 'VARIABLE',
          status: 'SKIPPED',
          step: 1,
          executionTime: 0
        });

        // 验证变量没有被更新
        expect(mockThread.variableScopes.thread?.['result']).toBeUndefined();
        expect(mockThread.nodeResults).toHaveLength(0);
      }
    });

    it('应该在变量为只读时跳过执行', async () => {
      mockThread.variables = [
        {
          name: 'readonlyVar',
          value: 100,
          type: 'number',
          scope: 'thread',
          readonly: true
        }
      ];

      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'readonlyVar',
          expression: '200',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.status).toBe('SKIPPED');
      expect(mockThread.variables[0]?.value).toBe(100); // 值不应该改变
    });
  });

  describe('表达式求值测试', () => {
    it('应该在表达式求值失败时抛出错误', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'result',
          expression: 'invalid syntax here',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(variableHandler(mockThread, mockNode))
        .rejects
        .toThrow(ValidationError);
    });

    it('应该正确处理复杂的表达式', async () => {
      mockThread.variableScopes.thread = {
        a: 10,
        b: 20
      };

      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'result',
          expression: '({{a}} + {{b}}) * 2 - 5',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.value).toBe(55); // (10 + 20) * 2 - 5 = 55
    });
  });

  describe('边界情况测试', () => {
    it('应该正确处理空字符串表达式', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'result',
          expression: '',
          variableType: 'string',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.value).toBe('');
    });

    it('应该正确处理null和undefined值', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'result',
          expression: 'null',
          variableType: 'object',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await variableHandler(mockThread, mockNode);

      expect(result.value).toBeNull();
    });

    it('应该正确处理readonly配置', async () => {
      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'readonlyVar',
          expression: '100',
          variableType: 'number',
          scope: 'thread',
          readonly: true
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await variableHandler(mockThread, mockNode);

      expect(mockThread.variables[0]?.readonly).toBe(true);
    });

    it('应该正确处理空的nodeResults数组', async () => {
      mockThread.nodeResults = [];

      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'result',
          expression: '10',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await variableHandler(mockThread, mockNode);

      expect(mockThread.nodeResults).toHaveLength(1);
      expect(mockThread.nodeResults[0]?.step).toBe(1);
    });

    it('应该正确处理非空的nodeResults数组', async () => {
      mockThread.nodeResults = [
        { step: 1, nodeId: 'prev-node', nodeType: 'START', status: 'COMPLETED', timestamp: 123456 }
      ];

      mockNode = {
        id: 'variable-node-1',
        name: 'Variable Node',
        type: NodeType.VARIABLE,
        config: {
          variableName: 'result',
          expression: '10',
          variableType: 'number',
          scope: 'thread'
        } as VariableNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await variableHandler(mockThread, mockNode);

      expect(mockThread.nodeResults).toHaveLength(2);
      expect(mockThread.nodeResults[1]?.step).toBe(2);
    });
  });
});