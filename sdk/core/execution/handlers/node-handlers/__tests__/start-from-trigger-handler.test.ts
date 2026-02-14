/**
 * StartFromTrigger节点处理函数单元测试
 */

import { startFromTriggerHandler } from '../start-from-trigger-handler';
import type { Node, StartFromTriggerNodeConfig } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import type { Thread } from '@modular-agent/types';
import { ThreadStatus } from '@modular-agent/types';

describe('start-from-trigger-handler', () => {
  let mockThread: Thread;
  let mockNode: Node;
  let mockContext: any;

  beforeEach(() => {
    // 初始化mock thread
    mockThread = {
      id: 'thread-1',
      workflowId: 'workflow-1',
      workflowVersion: '1.0.0',
      status: ThreadStatus.CREATED,
      currentNodeId: '',
      graph: {} as any,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        local: [],
        loop: []
      },
      input: {},
      output: {},
      nodeResults: [],
      startTime: 0,
      errors: []
    };

    // 初始化mock node
    mockNode = {
      id: 'start-from-trigger-node-1',
      name: 'Start From Trigger Node',
      type: NodeType.START_FROM_TRIGGER,
      config: {} as StartFromTriggerNodeConfig,
      incomingEdgeIds: [],
      outgoingEdgeIds: []
    };

    // 初始化mock context
    mockContext = {
      triggerInput: {},
      conversationManager: {
        addMessages: jest.fn()
      }
    };
  });

  describe('基本功能测试', () => {
    it('应该成功初始化Thread并返回启动消息', async () => {
      const result = await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result).toMatchObject({
        message: 'Triggered subgraph started',
        input: {}
      });

      // 验证Thread状态已更新
      expect(mockThread.status).toBe(ThreadStatus.RUNNING);
      expect(mockThread.currentNodeId).toBe('start-from-trigger-node-1');
      expect(mockThread.startTime).toBeGreaterThan(0);

      // 验证Thread的变量和结果已初始化
      expect(mockThread.variables).toHaveLength(0);
      expect(mockThread.nodeResults).toHaveLength(1);
      expect(mockThread.errors).toHaveLength(0);
      expect(mockThread.input).toEqual({});

      // 验证执行历史已记录
      expect(mockThread.nodeResults).toHaveLength(1);
      const executionResult = mockThread.nodeResults[0]!;
      expect(executionResult).toMatchObject({
        step: 1,
        nodeId: 'start-from-trigger-node-1',
        nodeType: NodeType.START_FROM_TRIGGER,
        status: 'COMPLETED'
      });
      expect(executionResult.timestamp).toBeDefined();
    });

    it('应该从context中获取triggerInput并设置到thread.input', async () => {
      mockContext.triggerInput = {
        userId: 'user-123',
        action: 'create',
        data: { name: 'test' }
      };

      const result = await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result.input).toEqual({
        userId: 'user-123',
        action: 'create',
        data: { name: 'test' }
      });
      expect(mockThread.input).toEqual({
        userId: 'user-123',
        action: 'create',
        data: { name: 'test' }
      });
    });

    it('应该合并现有的input和triggerInput', async () => {
      mockThread.input = { existingKey: 'existingValue' };
      mockContext.triggerInput = {
        newKey: 'newValue',
        userId: 'user-123'
      };

      const result = await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result.input).toEqual({
        existingKey: 'existingValue',
        newKey: 'newValue',
        userId: 'user-123'
      });
      expect(mockThread.input).toEqual({
        existingKey: 'existingValue',
        newKey: 'newValue',
        userId: 'user-123'
      });
    });

    it('应该正确设置startTime', async () => {
      const originalStartTime = mockThread.startTime;
      const result = await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockThread.startTime).toBeGreaterThan(originalStartTime);
    });
  });

  describe('变量初始化测试', () => {
    it('应该从triggerInput中初始化variables', async () => {
      const mockVariables = [
        { name: 'var1', value: 'value1', type: 'string', scope: 'thread', readonly: false },
        { name: 'var2', value: 42, type: 'number', scope: 'thread', readonly: false }
      ];

      mockContext.triggerInput = {
        variables: mockVariables
      };

      await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockThread.variables).toEqual(mockVariables);
    });

    it('应该初始化空的variables数组', async () => {
      mockThread.variables = undefined as any;

      await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockThread.variables).toEqual([]);
    });

    it('应该初始化并填充nodeResults数组', async () => {
      mockThread.nodeResults = undefined as any;

      await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockThread.nodeResults).toHaveLength(1);
      const executionResult = mockThread.nodeResults[0]!;
      expect(executionResult).toMatchObject({
        nodeId: 'start-from-trigger-node-1',
        nodeType: NodeType.START_FROM_TRIGGER,
        status: 'COMPLETED',
        step: 1
      });
      expect(executionResult.timestamp).toBeDefined();
    });

    it('应该初始化空的errors数组', async () => {
      mockThread.errors = undefined as any;

      await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockThread.errors).toEqual([]);
    });

    it('应该初始化空的input对象', async () => {
      mockThread.input = undefined as any;

      await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockThread.input).toEqual({});
    });
  });

  describe('对话历史初始化测试', () => {
    it('应该从triggerInput中初始化conversationHistory', async () => {
      const mockMessages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      mockContext.triggerInput = {
        conversationHistory: mockMessages
      };

      await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockContext.conversationManager.addMessages).toHaveBeenCalledWith(mockMessages);
    });

    it('应该在没有conversationManager时不调用addMessages', async () => {
      mockContext.triggerInput = {
        conversationHistory: [{ role: 'user', content: 'Hello' }]
      };
      mockContext.conversationManager = undefined;

      await startFromTriggerHandler(mockThread, mockNode, mockContext);

      // 不应该抛出错误
      expect(mockThread.status).toBe(ThreadStatus.RUNNING);
    });

    it('应该在没有conversationHistory时不调用addMessages', async () => {
      mockContext.triggerInput = {};

      await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(mockContext.conversationManager.addMessages).not.toHaveBeenCalled();
    });
  });

  describe('执行条件测试', () => {
    it('应该在CREATED状态下正常执行', async () => {
      mockThread.status = ThreadStatus.CREATED;

      const result = await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result.message).toBe('Triggered subgraph started');
      expect(mockThread.status).toBe(ThreadStatus.RUNNING);
    });

    it('应该在RUNNING状态下正常执行（如果尚未执行过）', async () => {
      mockThread.status = ThreadStatus.RUNNING;
      mockThread.nodeResults = []; // 确保没有执行过

      const result = await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result.message).toBe('Triggered subgraph started');
      expect(mockThread.status).toBe(ThreadStatus.RUNNING); // 状态保持不变
    });

    it('应该在非CREATED/RUNNING状态下跳过执行', async () => {
      const nonRunnableStates = [
        ThreadStatus.PAUSED,
        ThreadStatus.COMPLETED,
        ThreadStatus.FAILED,
        ThreadStatus.CANCELLED,
        ThreadStatus.TIMEOUT
      ];

      for (const status of nonRunnableStates) {
        mockThread.status = status;
        mockThread.nodeResults = []; // 确保没有执行过

        const result = await startFromTriggerHandler(mockThread, mockNode, mockContext);

        expect(result).toMatchObject({
          nodeId: 'start-from-trigger-node-1',
          nodeType: 'START_FROM_TRIGGER',
          status: 'SKIPPED',
          step: 1,
          executionTime: 0
        });

        // 验证Thread状态未改变
        expect(mockThread.status).toBe(status);
        expect(mockThread.nodeResults).toHaveLength(0);
      }
    });

    it('应该在已经执行过的情况下跳过执行', async () => {
      // 先执行一次
      await startFromTriggerHandler(mockThread, mockNode, mockContext);

      // 再次执行应该被跳过
      const result = await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result).toMatchObject({
        nodeId: 'start-from-trigger-node-1',
        nodeType: 'START_FROM_TRIGGER',
        status: 'SKIPPED',
        step: 2, // step应该是2，因为已经有1个结果
        executionTime: 0
      });

      // 验证Thread状态未改变（除了step计数）
      expect(mockThread.nodeResults).toHaveLength(1); // 结果数组长度应该仍然是1
    });
  });

  describe('边界情况测试', () => {
    it('应该处理没有context的情况', async () => {
      const result = await startFromTriggerHandler(mockThread, mockNode);

      expect(result.message).toBe('Triggered subgraph started');
      expect(mockThread.status).toBe(ThreadStatus.RUNNING);
      expect(mockThread.input).toEqual({});
    });

    it('应该处理context中没有triggerInput的情况', async () => {
      mockContext = {};

      const result = await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result.message).toBe('Triggered subgraph started');
      expect(mockThread.input).toEqual({});
    });

    it('应该处理triggerInput为空对象的情况', async () => {
      mockContext.triggerInput = {};

      const result = await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result.message).toBe('Triggered subgraph started');
      expect(mockThread.input).toEqual({});
    });

    it('应该处理带有contextData的Thread', async () => {
      mockThread.contextData = { conversationId: 'conv-123' };

      const result = await startFromTriggerHandler(mockThread, mockNode, mockContext);

      expect(result.message).toBe('Triggered subgraph started');
      expect(mockThread.contextData).toEqual({ conversationId: 'conv-123' });
    });
  });

  describe('综合场景测试', () => {
    it('应该完整处理包含所有字段的triggerInput', async () => {
      const mockVariables = [
        { name: 'userId', value: 'user-123', type: 'string', scope: 'thread', readonly: false },
        { name: 'count', value: 5, type: 'number', scope: 'thread', readonly: false }
      ];

      const mockMessages = [
        { role: 'user', content: 'Start conversation' },
        { role: 'assistant', content: 'Conversation started' }
      ];

      mockContext.triggerInput = {
        userId: 'user-123',
        action: 'process',
        data: { items: [1, 2, 3] },
        variables: mockVariables,
        conversationHistory: mockMessages
      };

      const result = await startFromTriggerHandler(mockThread, mockNode, mockContext);

      // 验证返回结果
      expect(result).toMatchObject({
        message: 'Triggered subgraph started',
        input: {
          userId: 'user-123',
          action: 'process',
          data: { items: [1, 2, 3] }
        }
      });

      // 验证Thread状态
      expect(mockThread.status).toBe(ThreadStatus.RUNNING);
      expect(mockThread.currentNodeId).toBe('start-from-trigger-node-1');
      expect(mockThread.input).toEqual({
        userId: 'user-123',
        action: 'process',
        data: { items: [1, 2, 3] },
        variables: mockVariables,
        conversationHistory: mockMessages
      });

      // 验证变量已初始化
      expect(mockThread.variables).toEqual(mockVariables);

      // 验证对话历史已添加
      expect(mockContext.conversationManager.addMessages).toHaveBeenCalledWith(mockMessages);

      // 验证执行历史已记录
      expect(mockThread.nodeResults).toHaveLength(1);
      expect(mockThread.nodeResults[0]).toMatchObject({
        step: 1,
        nodeId: 'start-from-trigger-node-1',
        nodeType: NodeType.START_FROM_TRIGGER,
        status: 'COMPLETED'
      });
    });
  });
});