/**
 * Router 变量访问测试
 * 测试 Router 的变量访问功能
 */

import { Router } from '../router';
import { EdgeType, ConditionType } from '../../../types/edge';
import { NodeType } from '../../../types/node';
import type { Thread } from '../../../types/thread';
import { ThreadStatus } from '../../../types/thread';

describe('Router 变量访问测试', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  describe('基础变量访问', () => {
    it('应该能够访问 variableValues 中的变量', () => {
      const thread: Thread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
        currentNodeId: 'node-1',
        variables: [],
        variableValues: {
          score: 85,
          name: 'test',
          active: true
        },
        input: {},
        output: {},
        nodeResults: new Map(),
        executionHistory: [],
        startTime: Date.now(),
        errors: []
      };

      const node = {
        id: 'node-1',
        type: NodeType.CODE,
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: ['edge-1'],
        incomingEdgeIds: []
      };

      const edge = {
        id: 'edge-1',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        type: EdgeType.CONDITIONAL,
        condition: {
          type: ConditionType.GREATER_THAN,
          variablePath: 'score',
          value: 80
        }
      };

      const result = router.evaluateEdgeCondition(edge, thread);
      expect(result).toBe(true);
    });

    it('应该能够访问 input 中的变量', () => {
      const thread: Thread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
        currentNodeId: 'node-1',
        variables: [],
        variableValues: {},
        input: {
          userId: '123',
          userName: 'test-user'
        },
        output: {},
        nodeResults: new Map(),
        executionHistory: [],
        startTime: Date.now(),
        errors: []
      };

      const node = {
        id: 'node-1',
        type: NodeType.CODE,
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: ['edge-1'],
        incomingEdgeIds: []
      };

      const edge = {
        id: 'edge-1',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        type: EdgeType.CONDITIONAL,
        condition: {
          type: ConditionType.EQUALS,
          variablePath: 'input.userId',
          value: '123'
        }
      };

      const result = router.evaluateEdgeCondition(edge, thread);
      expect(result).toBe(true);
    });

    it('应该能够访问 output 中的变量', () => {
      const thread: Thread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
        currentNodeId: 'node-1',
        variables: [],
        variableValues: {},
        input: {},
        output: {
          status: 'success',
          count: 10
        },
        nodeResults: new Map(),
        executionHistory: [],
        startTime: Date.now(),
        errors: []
      };

      const node = {
        id: 'node-1',
        type: NodeType.CODE,
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: ['edge-1'],
        incomingEdgeIds: []
      };

      const edge = {
        id: 'edge-1',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        type: EdgeType.CONDITIONAL,
        condition: {
          type: ConditionType.EQUALS,
          variablePath: 'output.status',
          value: 'success'
        }
      };

      const result = router.evaluateEdgeCondition(edge, thread);
      expect(result).toBe(true);
    });
  });

  describe('嵌套路径访问', () => {
    it('应该能够访问嵌套对象属性', () => {
      const thread: Thread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
        currentNodeId: 'node-1',
        variables: [],
        variableValues: {
          user: {
            profile: {
              age: 25,
              name: 'John'
            }
          }
        },
        input: {},
        output: {},
        nodeResults: new Map(),
        executionHistory: [],
        startTime: Date.now(),
        errors: []
      };

      const node = {
        id: 'node-1',
        type: NodeType.CODE,
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: ['edge-1'],
        incomingEdgeIds: []
      };

      const edge = {
        id: 'edge-1',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        type: EdgeType.CONDITIONAL,
        condition: {
          type: ConditionType.GREATER_THAN,
          variablePath: 'user.profile.age',
          value: 20
        }
      };

      const result = router.evaluateEdgeCondition(edge, thread);
      expect(result).toBe(true);
    });
  });

  describe('数组索引访问', () => {
    it('应该能够访问数组元素', () => {
      const thread: Thread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
        currentNodeId: 'node-1',
        variables: [],
        variableValues: {
          items: [
            { id: 1, name: 'item1' },
            { id: 2, name: 'item2' },
            { id: 3, name: 'item3' }
          ]
        },
        input: {},
        output: {},
        nodeResults: new Map(),
        executionHistory: [],
        startTime: Date.now(),
        errors: []
      };

      const node = {
        id: 'node-1',
        type: NodeType.CODE,
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: ['edge-1'],
        incomingEdgeIds: []
      };

      const edge = {
        id: 'edge-1',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        type: EdgeType.CONDITIONAL,
        condition: {
          type: ConditionType.EQUALS,
          variablePath: 'items[0].name',
          value: 'item1'
        }
      };

      const result = router.evaluateEdgeCondition(edge, thread);
      expect(result).toBe(true);
    });

    it('应该能够访问嵌套数组元素', () => {
      const thread: Thread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
        currentNodeId: 'node-1',
        variables: [],
        variableValues: {
          data: {
            items: [
              { id: 1, value: 100 },
              { id: 2, value: 200 }
            ]
          }
        },
        input: {},
        output: {},
        nodeResults: new Map(),
        executionHistory: [],
        startTime: Date.now(),
        errors: []
      };

      const node = {
        id: 'node-1',
        type: NodeType.CODE,
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: ['edge-1'],
        incomingEdgeIds: []
      };

      const edge = {
        id: 'edge-1',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        type: EdgeType.CONDITIONAL,
        condition: {
          type: ConditionType.GREATER_THAN,
          variablePath: 'data.items[1].value',
          value: 150
        }
      };

      const result = router.evaluateEdgeCondition(edge, thread);
      expect(result).toBe(true);
    });
  });

  describe('自定义表达式评估', () => {
    it('应该能够评估自定义表达式', () => {
      const thread: Thread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
        currentNodeId: 'node-1',
        variables: [],
        variableValues: {
          score: 85,
          threshold: 80
        },
        input: {},
        output: {},
        nodeResults: new Map(),
        executionHistory: [],
        startTime: Date.now(),
        errors: []
      };

      const node = {
        id: 'node-1',
        type: NodeType.CODE,
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: ['edge-1'],
        incomingEdgeIds: []
      };

      const edge = {
        id: 'edge-1',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        type: EdgeType.CONDITIONAL,
        condition: {
          type: ConditionType.CUSTOM,
          variablePath: '',
          customExpression: '{{score}} > {{threshold}}'
        }
      };

      const result = router.evaluateEdgeCondition(edge, thread);
      expect(result).toBe(true);
    });

    it('应该能够评估复杂的自定义表达式', () => {
      const thread: Thread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
        currentNodeId: 'node-1',
        variables: [],
        variableValues: {
          score: 85,
          threshold: 80,
          bonus: 10
        },
        input: {},
        output: {},
        nodeResults: new Map(),
        executionHistory: [],
        startTime: Date.now(),
        errors: []
      };

      const node = {
        id: 'node-1',
        type: NodeType.CODE,
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: ['edge-1'],
        incomingEdgeIds: []
      };

      const edge = {
        id: 'edge-1',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        type: EdgeType.CONDITIONAL,
        condition: {
          type: ConditionType.CUSTOM,
          variablePath: '',
          customExpression: '{{score}} + {{bonus}} > {{threshold}} * 2'
        }
      };

      const result = router.evaluateEdgeCondition(edge, thread);
      expect(result).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('变量不存在时应该返回 undefined', () => {
      const thread: Thread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
        currentNodeId: 'node-1',
        variables: [],
        variableValues: {},
        input: {},
        output: {},
        nodeResults: new Map(),
        executionHistory: [],
        startTime: Date.now(),
        errors: []
      };

      const node = {
        id: 'node-1',
        type: NodeType.CODE,
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: ['edge-1'],
        incomingEdgeIds: []
      };

      const edge = {
        id: 'edge-1',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        type: EdgeType.CONDITIONAL,
        condition: {
          type: ConditionType.EQUALS,
          variablePath: 'nonExistentVariable',
          value: 'test'
        }
      };

      const result = router.evaluateEdgeCondition(edge, thread);
      expect(result).toBe(false);
    });

    it('路径中间值为 null 时应该返回 undefined', () => {
      const thread: Thread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
        currentNodeId: 'node-1',
        variables: [],
        variableValues: {
          user: null
        },
        input: {},
        output: {},
        nodeResults: new Map(),
        executionHistory: [],
        startTime: Date.now(),
        errors: []
      };

      const node = {
        id: 'node-1',
        type: NodeType.CODE,
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: ['edge-1'],
        incomingEdgeIds: []
      };

      const edge = {
        id: 'edge-1',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        type: EdgeType.CONDITIONAL,
        condition: {
          type: ConditionType.EQUALS,
          variablePath: 'user.name',
          value: 'test'
        }
      };

      const result = router.evaluateEdgeCondition(edge, thread);
      expect(result).toBe(false);
    });

    it('数组索引越界时应该返回 undefined', () => {
      const thread: Thread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        workflowVersion: '1.0.0',
        status: ThreadStatus.RUNNING,
        currentNodeId: 'node-1',
        variables: [],
        variableValues: {
          items: [1, 2, 3]
        },
        input: {},
        output: {},
        nodeResults: new Map(),
        executionHistory: [],
        startTime: Date.now(),
        errors: []
      };

      const node = {
        id: 'node-1',
        type: NodeType.CODE,
        name: 'Test Node',
        config: {},
        outgoingEdgeIds: ['edge-1'],
        incomingEdgeIds: []
      };

      const edge = {
        id: 'edge-1',
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        type: EdgeType.CONDITIONAL,
        condition: {
          type: ConditionType.EQUALS,
          variablePath: 'items[10]',
          value: 1
        }
      };

      const result = router.evaluateEdgeCondition(edge, thread);
      expect(result).toBe(false);
    });
  });
});