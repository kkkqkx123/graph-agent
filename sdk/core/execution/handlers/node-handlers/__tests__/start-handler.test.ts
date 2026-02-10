/**
 * Start节点处理函数单元测试
 */

import { startHandler } from '../start-handler';
import type { Node, StartNodeConfig } from '../../../../../types/node';
import { NodeType } from '../../../../../types/node';
import type { Thread } from '../../../../../types/thread';
import { ThreadStatus, ErrorHandlingStrategy } from '../../../../../types/thread';

describe('start-handler', () => {
  let mockThread: Thread;
  let mockNode: Node;

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
        subgraph: [],
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
      id: 'start-node-1',
      name: 'Start Node',
      type: NodeType.START,
      config: {} as StartNodeConfig,
      incomingEdgeIds: [],
      outgoingEdgeIds: []
    };
  });

  describe('基本功能测试', () => {
    it('应该成功初始化Thread并返回启动消息', async () => {
      const result = await startHandler(mockThread, mockNode);

      expect(result).toMatchObject({
        message: 'Workflow started',
        input: {}
      });

      // 验证Thread状态已更新
      expect(mockThread.status).toBe(ThreadStatus.RUNNING);
      expect(mockThread.currentNodeId).toBe('start-node-1');
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
        nodeId: 'start-node-1',
        nodeType: NodeType.START,
        status: 'COMPLETED'
      });
      expect(executionResult.timestamp).toBeDefined();
    });

    it('应该保留现有的input数据', async () => {
      mockThread.input = { existingKey: 'existingValue' };

      const result = await startHandler(mockThread, mockNode);

      expect(result.input).toEqual({ existingKey: 'existingValue' });
      expect(mockThread.input).toEqual({ existingKey: 'existingValue' });
    });

    it('应该正确设置startTime', async () => {
      const originalStartTime = mockThread.startTime;
      const result = await startHandler(mockThread, mockNode);

      expect(mockThread.startTime).toBeGreaterThan(originalStartTime);
    });
  });

  describe('执行条件测试', () => {
    it('应该在CREATED状态下正常执行', async () => {
      mockThread.status = ThreadStatus.CREATED;
      
      const result = await startHandler(mockThread, mockNode);
      
      expect(result.message).toBe('Workflow started');
      expect(mockThread.status).toBe(ThreadStatus.RUNNING);
    });

    it('应该在RUNNING状态下正常执行（如果尚未执行过）', async () => {
      mockThread.status = ThreadStatus.RUNNING;
      mockThread.nodeResults = []; // 确保没有执行过
      
      const result = await startHandler(mockThread, mockNode);
      
      expect(result.message).toBe('Workflow started');
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
        
        const result = await startHandler(mockThread, mockNode);
        
        expect(result).toMatchObject({
          nodeId: 'start-node-1',
          nodeType: 'START',
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
      await startHandler(mockThread, mockNode);
      
      // 再次执行应该被跳过
      const result = await startHandler(mockThread, mockNode);
      
      expect(result).toMatchObject({
        nodeId: 'start-node-1',
        nodeType: 'START',
        status: 'SKIPPED',
        step: 2, // step应该是2，因为已经有1个结果
        executionTime: 0
      });
      
      // 验证Thread状态未改变（除了step计数）
      expect(mockThread.nodeResults).toHaveLength(1); // 结果数组长度应该仍然是1
    });
  });

  describe('初始化测试', () => {
    it('应该初始化空的variables数组', async () => {
      mockThread.variables = undefined as any;
      
      await startHandler(mockThread, mockNode);
      
      expect(mockThread.variables).toEqual([]);
    });

    it('应该初始化并填充nodeResults数组', async () => {
      mockThread.nodeResults = undefined as any;
      
      await startHandler(mockThread, mockNode);
      
      expect(mockThread.nodeResults).toHaveLength(1);
      const executionResult = mockThread.nodeResults[0]!;
      expect(executionResult).toMatchObject({
        nodeId: 'start-node-1',
        nodeType: NodeType.START,
        status: 'COMPLETED',
        step: 1
      });
      expect(executionResult.timestamp).toBeDefined();
    });

    it('应该初始化空的errors数组', async () => {
      mockThread.errors = undefined as any;
      
      await startHandler(mockThread, mockNode);
      
      expect(mockThread.errors).toEqual([]);
    });

    it('应该初始化空的input对象', async () => {
      mockThread.input = undefined as any;
      
      await startHandler(mockThread, mockNode);
      
      expect(mockThread.input).toEqual({});
    });
  });

  describe('边界情况测试', () => {
    it('应该处理带有errorHandling的Thread', async () => {
      mockThread.errorHandling = {
        strategy: ErrorHandlingStrategy.STOP_ON_ERROR
      };
      
      const result = await startHandler(mockThread, mockNode);
      
      expect(result.message).toBe('Workflow started');
      // start-handler不应该修改errorHandling，应该保留原有的errorHandling
      expect(mockThread.errorHandling).toEqual({
        strategy: ErrorHandlingStrategy.STOP_ON_ERROR
      });
    });

    it('应该处理带有contextData的Thread', async () => {
      mockThread.contextData = { conversationId: 'conv-123' };
      
      const result = await startHandler(mockThread, mockNode);
      
      expect(result.message).toBe('Workflow started');
      expect(mockThread.contextData).toEqual({ conversationId: 'conv-123' });
    });
  });
});