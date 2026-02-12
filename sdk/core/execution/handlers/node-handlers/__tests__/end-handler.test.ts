/**
 * End节点处理函数单元测试
 */

import { endHandler } from '../end-handler';
import type { Node, EndNodeConfig } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import type { Thread } from '@modular-agent/types/thread';
import { ThreadStatus } from '@modular-agent/types/thread';

// Mock utils functions
jest.mock('../../../../../utils', () => ({
  now: jest.fn().mockReturnValue(1000),
  diffTimestamp: jest.fn().mockImplementation((start, end) => end - start)
}));

describe('end-handler', () => {
  let mockThread: Thread;
  let mockNode: Node;

  beforeEach(() => {
    // 初始化mock thread
    mockThread = {
      id: 'thread-1',
      workflowId: 'workflow-1',
      workflowVersion: '1.0.0',
      status: ThreadStatus.RUNNING,
      currentNodeId: 'current-node',
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
      startTime: 500, // 设置开始时间为500
      errors: []
    };

    // 初始化mock node
    mockNode = {
      id: 'end-node-1',
      name: 'End Node',
      type: NodeType.END,
      config: {} as EndNodeConfig,
      incomingEdgeIds: [],
      outgoingEdgeIds: []
    };
  });

  describe('基本功能测试', () => {
    it('应该成功结束工作流并返回完成消息', async () => {
      const result = await endHandler(mockThread, mockNode);

      expect(result).toMatchObject({
        message: 'Workflow completed',
        executionTime: 500 // 1000 - 500 = 500
      });

      // 验证Thread输出已设置
      expect(mockThread.output).toEqual({});

      // 验证执行历史已记录
      expect(mockThread.nodeResults).toHaveLength(1);
      const executionResult = mockThread.nodeResults[0]!;
      expect(executionResult).toMatchObject({
        step: 1,
        nodeId: 'end-node-1',
        nodeType: NodeType.END,
        status: 'COMPLETED'
      });
      expect(executionResult.timestamp).toBe(1000);
    });

    it('应该优先使用Thread的output作为最终输出', async () => {
      mockThread.output = { finalResult: 'success', data: { count: 42 } };

      const result = await endHandler(mockThread, mockNode);

      expect(result.output).toEqual({ finalResult: 'success', data: { count: 42 } });
      expect(mockThread.output).toEqual({ finalResult: 'success', data: { count: 42 } });
    });

    it('应该在Thread output为undefined时使用最后一个节点的数据', async () => {
      mockThread.output = undefined as any;
      mockThread.nodeResults = [
        {
          step: 1,
          nodeId: 'previous-node',
          nodeType: 'VARIABLE',
          status: 'COMPLETED',
          timestamp: 800
        }
      ];

      const result = await endHandler(mockThread, mockNode);

      expect(result.output).toEqual({ result: 'from-last-node', value: 123 });
      expect(mockThread.output).toEqual({ result: 'from-last-node', value: 123 });
    });

    it('应该在没有Thread output和节点数据时返回空对象', async () => {
      mockThread.output = {};
      mockThread.nodeResults = [];

      const result = await endHandler(mockThread, mockNode);

      expect(result.output).toEqual({});
      expect(mockThread.output).toEqual({});
    });
  });

  describe('执行条件测试', () => {
    it('应该在RUNNING状态下正常执行', async () => {
      mockThread.status = ThreadStatus.RUNNING;

      const result = await endHandler(mockThread, mockNode);

      expect(result.message).toBe('Workflow completed');
    });

    it('应该在非RUNNING状态下跳过执行', async () => {
      const nonRunnableStates = [
        ThreadStatus.CREATED,
        ThreadStatus.PAUSED,
        ThreadStatus.COMPLETED,
        ThreadStatus.FAILED,
        ThreadStatus.CANCELLED,
        ThreadStatus.TIMEOUT
      ];

      for (const status of nonRunnableStates) {
        mockThread.status = status;
        mockThread.nodeResults = []; // 确保没有执行过

        const result = await endHandler(mockThread, mockNode);

        expect(result).toMatchObject({
          nodeId: 'end-node-1',
          nodeType: 'END',
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
      await endHandler(mockThread, mockNode);

      // 再次执行应该被跳过
      const result = await endHandler(mockThread, mockNode);

      expect(result).toMatchObject({
        nodeId: 'end-node-1',
        nodeType: 'END',
        status: 'SKIPPED',
        step: 2, // step应该是2，因为已经有1个结果
        executionTime: 0
      });

      // 验证Thread状态未改变（除了step计数）
      expect(mockThread.nodeResults).toHaveLength(1); // 结果数组长度应该仍然是1
    });
  });

  describe('输出优先级测试', () => {
    it('应该优先级1：使用Thread的output（即使为空对象）', async () => {
      mockThread.output = {}; // 空对象但存在
      mockThread.nodeResults = [
        {
          step: 1,
          nodeId: 'previous-node',
          nodeType: 'VARIABLE',
          status: 'COMPLETED',
          timestamp: 800
        }
      ];

      const result = await endHandler(mockThread, mockNode);

      expect(result.output).toEqual({}); // 应该使用空的output，而不是节点数据
      expect(mockThread.output).toEqual({});
    });

    it('应该优先级2：当Thread output不存在或为空时使用最后一个节点数据', async () => {
      mockThread.output = undefined as any; // output不存在
      mockThread.nodeResults = [
        {
          step: 1,
          nodeId: 'previous-node',
          nodeType: 'VARIABLE',
          status: 'COMPLETED',
          timestamp: 800
        }
      ];

      const result = await endHandler(mockThread, mockNode);

      expect(result.output).toEqual({ lastNodeData: 'used' });
    });

    it('应该处理Thread output为null的情况', async () => {
      mockThread.output = null as any; // output为null
      mockThread.nodeResults = [
        {
          step: 1,
          nodeId: 'previous-node',
          nodeType: 'VARIABLE',
          status: 'COMPLETED',
          timestamp: 800
        }
      ];

      const result = await endHandler(mockThread, mockNode);

      expect(result.output).toEqual({ lastNodeData: 'used' });
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空的nodeResults数组', async () => {
      mockThread.nodeResults = [];
      mockThread.output = {};

      const result = await endHandler(mockThread, mockNode);

      expect(result.output).toEqual({});
    });

    it('应该处理nodeResults中没有data的情况', async () => {
      mockThread.output = {};
      mockThread.nodeResults = [
        {
          step: 1,
          nodeId: 'previous-node',
          nodeType: 'VARIABLE',
          status: 'COMPLETED',
          timestamp: 800
          // 没有data字段
        }
      ];

      const result = await endHandler(mockThread, mockNode);

      expect(result.output).toEqual({});
    });

    it('应该正确计算executionTime', async () => {
      mockThread.startTime = 200;
      (require('../../../../../utils').now as jest.Mock).mockReturnValue(1500);

      const result = await endHandler(mockThread, mockNode);

      expect(result.executionTime).toBe(1300); // 1500 - 200 = 1300
    });
  });
});