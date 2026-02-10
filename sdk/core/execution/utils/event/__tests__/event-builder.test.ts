/**
 * event-builder.test.ts
 * EventBuilder的单元测试
 */

import * as eventBuilder from '../event-builder';
import { EventType } from '../../../../../types/events';
import type { Thread, ThreadResult } from '../../../../../types/thread';
import { ThreadStatus } from '../../../../../types/thread';

// Mock the 'now' function
jest.mock('../../../../../utils', () => ({
  now: jest.fn(() => 1234567890)
}));

describe('EventBuilder', () => {
  const mockThread: Thread = {
    id: 'thread-123',
    workflowId: 'workflow-123',
    workflowVersion: '1.0.0',
    input: { test: 'input' },
    status: ThreadStatus.RUNNING,
    graph: {
      nodes: new Map(),
      edges: new Map(),
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
      startNodeId: 'start',
      endNodeIds: new Set(),
      getNode: jest.fn(),
      getEdge: jest.fn(),
      getOutgoingNeighbors: jest.fn(),
      getIncomingNeighbors: jest.fn(),
      getOutgoingEdges: jest.fn(),
      getIncomingEdges: jest.fn(),
      getEdgeBetween: jest.fn(),
      hasNode: jest.fn(),
      hasEdge: jest.fn(),
      hasEdgeBetween: jest.fn(),
      getAllNodeIds: jest.fn(),
      getAllEdgeIds: jest.fn(),
      getNodeCount: jest.fn(),
      getEdgeCount: jest.fn(),
      getLoopNodeIds: jest.fn(),
      getForkNodeIds: jest.fn(),
      getJoinNodeIds: jest.fn(),
      getSubgraphNodeIds: jest.fn(),
      getTriggerNodeIds: jest.fn()
    } as any,
    variables: [],
    variableScopes: {
      global: {},
      thread: {},
      subgraph: [],
      loop: []
    },
    output: {},
    nodeResults: [],
    startTime: 1234567800,
    currentNodeId: 'node-1',
    errors: []
  };

  const mockThreadContext = {
    getThreadId: jest.fn(() => 'thread-123'),
    getWorkflowId: jest.fn(() => 'workflow-123')
  };

  const mockError = new Error('Test error message');

  describe('buildThreadStartedEvent', () => {
    it('应该创建正确的THREAD_STARTED事件', () => {
      const event = eventBuilder.buildThreadStartedEvent(mockThread);

      expect(event).toEqual({
        type: EventType.THREAD_STARTED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        input: { test: 'input' }
      });
    });

    it('应该处理空的input', () => {
      const threadWithNoInput: Thread = {
        ...mockThread,
        input: {}
      };

      const event = eventBuilder.buildThreadStartedEvent(threadWithNoInput);

      expect(event.input).toEqual({});
    });
  });

  describe('buildThreadCompletedEvent', () => {
    it('应该创建正确的THREAD_COMPLETED事件', () => {
      const result: ThreadResult = {
        threadId: 'thread-123',
        output: { result: 'success' },
        executionTime: 1500,
        nodeResults: [],
        metadata: {
          status: ThreadStatus.COMPLETED,
          startTime: 1234567890,
          endTime: 1234569390,
          executionTime: 1500,
          nodeCount: 0,
          errorCount: 0
        }
      };

      const event = eventBuilder.buildThreadCompletedEvent(mockThread, result);

      expect(event).toEqual({
        type: EventType.THREAD_COMPLETED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        output: { result: 'success' },
        executionTime: 1500
      });
    });

    it('应该处理不同的executionTime值', () => {
      const result: ThreadResult = {
        threadId: 'thread-123',
        output: {},
        executionTime: 5000,
        nodeResults: [],
        metadata: {
          status: ThreadStatus.COMPLETED,
          startTime: 1234567890,
          endTime: 1234572890,
          executionTime: 5000,
          nodeCount: 0,
          errorCount: 0
        }
      };

      const event = eventBuilder.buildThreadCompletedEvent(mockThread, result);

      expect(event.executionTime).toBe(5000);
    });
  });

  describe('buildThreadFailedEvent', () => {
    it('应该创建正确的THREAD_FAILED事件', () => {
      const event = eventBuilder.buildThreadFailedEvent(mockThread, mockError);

      expect(event).toEqual({
        type: EventType.THREAD_FAILED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        error: 'Test error message'
      });
    });

    it('应该从Error对象中提取消息', () => {
      const customError = new Error('Custom error');
      const event = eventBuilder.buildThreadFailedEvent(mockThread, customError);

      expect(event.error).toBe('Custom error');
    });
  });

  describe('buildThreadPausedEvent', () => {
    it('应该创建正确的THREAD_PAUSED事件', () => {
      const event = eventBuilder.buildThreadPausedEvent(mockThread);

      expect(event).toEqual({
        type: EventType.THREAD_PAUSED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123'
      });
    });
  });

  describe('buildThreadResumedEvent', () => {
    it('应该创建正确的THREAD_RESUMED事件', () => {
      const event = eventBuilder.buildThreadResumedEvent(mockThread);

      expect(event).toEqual({
        type: EventType.THREAD_RESUMED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123'
      });
    });
  });

  describe('buildThreadCancelledEvent', () => {
    it('应该创建包含reason的THREAD_CANCELLED事件', () => {
      const event = eventBuilder.buildThreadCancelledEvent(mockThread, 'User cancelled');

      expect(event).toEqual({
        type: EventType.THREAD_CANCELLED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        reason: 'User cancelled'
      });
    });

    it('应该创建不含reason的THREAD_CANCELLED事件', () => {
      const event = eventBuilder.buildThreadCancelledEvent(mockThread);

      expect(event).toEqual({
        type: EventType.THREAD_CANCELLED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        reason: undefined
      });
    });
  });

  describe('buildThreadStateChangedEvent', () => {
    it('应该创建正确的THREAD_STATE_CHANGED事件', () => {
      const event = eventBuilder.buildThreadStateChangedEvent(
        mockThread,
        'RUNNING',
        'PAUSED'
      );

      expect(event).toEqual({
        type: EventType.THREAD_STATE_CHANGED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        previousStatus: 'RUNNING',
        newStatus: 'PAUSED'
      });
    });
  });

  describe('buildNodeStartedEvent', () => {
    it('应该创建正确的NODE_STARTED事件', () => {
      const event = eventBuilder.buildNodeStartedEvent(
        mockThreadContext,
        'node-1',
        'LLM'
      );

      expect(event).toEqual({
        type: EventType.NODE_STARTED,
        threadId: 'thread-123',
        workflowId: 'workflow-123',
        nodeId: 'node-1',
        nodeType: 'LLM',
        timestamp: 1234567890
      });
    });
  });

  describe('buildNodeCompletedEvent', () => {
    it('应该创建正确的NODE_COMPLETED事件', () => {
      const event = eventBuilder.buildNodeCompletedEvent(
        mockThreadContext,
        'node-1',
        { result: 'completed' },
        2000
      );

      expect(event).toEqual({
        type: EventType.NODE_COMPLETED,
        threadId: 'thread-123',
        workflowId: 'workflow-123',
        nodeId: 'node-1',
        output: { result: 'completed' },
        executionTime: 2000,
        timestamp: 1234567890
      });
    });
  });

  describe('buildNodeFailedEvent', () => {
    it('应该创建正确的NODE_FAILED事件', () => {
      const event = eventBuilder.buildNodeFailedEvent(
        mockThreadContext,
        'node-1',
        mockError
      );

      expect(event).toEqual({
        type: EventType.NODE_FAILED,
        threadId: 'thread-123',
        workflowId: 'workflow-123',
        nodeId: 'node-1',
        error: 'Test error message',
        timestamp: 1234567890
      });
    });
  });

  describe('buildSubgraphStartedEvent', () => {
    it('应该创建正确的SUBGRAPH_STARTED事件', () => {
      const event = eventBuilder.buildSubgraphStartedEvent(
        mockThreadContext,
        'subgraph-1',
        'parent-workflow-1',
        { input: 'data' }
      );

      expect(event).toEqual({
        type: EventType.SUBGRAPH_STARTED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        subgraphId: 'subgraph-1',
        parentWorkflowId: 'parent-workflow-1',
        input: { input: 'data' }
      });
    });
  });

  describe('buildSubgraphCompletedEvent', () => {
    it('应该创建正确的SUBGRAPH_COMPLETED事件', () => {
      const event = eventBuilder.buildSubgraphCompletedEvent(
        mockThreadContext,
        'subgraph-1',
        { output: 'result' },
        3000
      );

      expect(event).toEqual({
        type: EventType.SUBGRAPH_COMPLETED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        subgraphId: 'subgraph-1',
        output: { output: 'result' },
        executionTime: 3000
      });
    });
  });

  describe('buildVariableChangedEvent', () => {
    it('应该创建正确的VARIABLE_CHANGED事件', () => {
      const event = eventBuilder.buildVariableChangedEvent(
        mockThreadContext,
        'var1',
        'value1',
        'global'
      );

      expect(event).toEqual({
        type: EventType.VARIABLE_CHANGED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        variableName: 'var1',
        variableValue: 'value1',
        variableScope: 'global'
      });
    });

    it('应该处理复杂的变量值', () => {
      const complexValue = { nested: { data: [1, 2, 3] } };
      const event = eventBuilder.buildVariableChangedEvent(
        mockThreadContext,
        'complexVar',
        complexValue,
        'node'
      );

      expect(event.variableValue).toEqual(complexValue);
    });
  });

  describe('buildConversationStateChangedEvent', () => {
    it('应该创建正确的CONVERSATION_STATE_CHANGED事件', () => {
      const event = eventBuilder.buildConversationStateChangedEvent(
        mockThreadContext,
        'node-1',
        5,
        1000
      );

      expect(event).toEqual({
        type: EventType.CONVERSATION_STATE_CHANGED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        nodeId: 'node-1',
        messageCount: 5,
        tokenUsage: 1000
      });
    });

    it('应该处理未定义的nodeId', () => {
      const event = eventBuilder.buildConversationStateChangedEvent(
        mockThreadContext,
        undefined,
        10,
        2000
      );

      expect(event.nodeId).toBeUndefined();
    });
  });

  describe('buildToolCallStartedEvent', () => {
    it('应该创建正确的TOOL_CALL_STARTED事件', () => {
      const event = eventBuilder.buildToolCallStartedEvent(
        mockThreadContext,
        'node-1',
        'weather-tool',
        '{"location":"beijing"}'
      );

      expect(event).toEqual({
        type: EventType.TOOL_CALL_STARTED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        nodeId: 'node-1',
        toolName: 'weather-tool',
        toolArguments: '{"location":"beijing"}'
      });
    });
  });

  describe('buildToolCallCompletedEvent', () => {
    it('应该创建正确的TOOL_CALL_COMPLETED事件', () => {
      const event = eventBuilder.buildToolCallCompletedEvent(
        mockThreadContext,
        'node-1',
        'weather-tool',
        { temperature: 25 },
        500
      );

      expect(event).toEqual({
        type: EventType.TOOL_CALL_COMPLETED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        nodeId: 'node-1',
        toolName: 'weather-tool',
        toolResult: { temperature: 25 },
        executionTime: 500
      });
    });
  });

  describe('buildToolCallFailedEvent', () => {
    it('应该创建正确的TOOL_CALL_FAILED事件', () => {
      const event = eventBuilder.buildToolCallFailedEvent(
        mockThreadContext,
        'node-1',
        'weather-tool',
        mockError
      );

      expect(event).toEqual({
        type: EventType.TOOL_CALL_FAILED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        nodeId: 'node-1',
        toolName: 'weather-tool',
        error: 'Test error message'
      });
    });
  });

  describe('buildThreadForkStartedEvent', () => {
    it('应该创建正确的THREAD_FORK_STARTED事件', () => {
      const forkConfig = { count: 3, strategy: 'parallel' };
      const event = eventBuilder.buildThreadForkStartedEvent(
        mockThreadContext,
        forkConfig
      );

      expect(event).toEqual({
        type: EventType.THREAD_FORK_STARTED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        parentThreadId: 'thread-123',
        forkConfig
      });
    });
  });

  describe('buildThreadForkCompletedEvent', () => {
    it('应该创建正确的THREAD_FORK_COMPLETED事件', () => {
      const childThreadIds = ['thread-child-1', 'thread-child-2'];
      const event = eventBuilder.buildThreadForkCompletedEvent(
        mockThreadContext,
        childThreadIds
      );

      expect(event).toEqual({
        type: EventType.THREAD_FORK_COMPLETED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        parentThreadId: 'thread-123',
        childThreadIds
      });
    });
  });

  describe('buildThreadJoinStartedEvent', () => {
    it('应该创建正确的THREAD_JOIN_STARTED事件', () => {
      const childThreadIds = ['thread-child-1', 'thread-child-2'];
      const event = eventBuilder.buildThreadJoinStartedEvent(
        mockThreadContext,
        childThreadIds,
        'wait-all'
      );

      expect(event).toEqual({
        type: EventType.THREAD_JOIN_STARTED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        parentThreadId: 'thread-123',
        childThreadIds,
        joinStrategy: 'wait-all'
      });
    });
  });

  describe('buildThreadJoinConditionMetEvent', () => {
    it('应该创建正确的THREAD_JOIN_CONDITION_MET事件', () => {
      const childThreadIds = ['thread-child-1', 'thread-child-2'];
      const event = eventBuilder.buildThreadJoinConditionMetEvent(
        mockThreadContext,
        childThreadIds,
        'all-completed'
      );

      expect(event).toEqual({
        type: EventType.THREAD_JOIN_CONDITION_MET,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        parentThreadId: 'thread-123',
        childThreadIds,
        condition: 'all-completed'
      });
    });
  });

  describe('buildThreadCopyStartedEvent', () => {
    it('应该创建正确的THREAD_COPY_STARTED事件', () => {
      const event = eventBuilder.buildThreadCopyStartedEvent(mockThreadContext);

      expect(event).toEqual({
        type: EventType.THREAD_COPY_STARTED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        sourceThreadId: 'thread-123'
      });
    });
  });

  describe('buildThreadCopyCompletedEvent', () => {
    it('应该创建正确的THREAD_COPY_COMPLETED事件', () => {
      const event = eventBuilder.buildThreadCopyCompletedEvent(
        mockThreadContext,
        'thread-copy-1'
      );

      expect(event).toEqual({
        type: EventType.THREAD_COPY_COMPLETED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        sourceThreadId: 'thread-123',
        copiedThreadId: 'thread-copy-1'
      });
    });
  });

  describe('buildTriggeredSubgraphStartedEvent', () => {
    it('应该创建正确的TRIGGERED_SUBGRAPH_STARTED事件', () => {
      const event = eventBuilder.buildTriggeredSubgraphStartedEvent(
        mockThreadContext,
        'subgraph-1',
        'trigger-1',
        { input: 'data' }
      );

      expect(event).toEqual({
        type: EventType.TRIGGERED_SUBGRAPH_STARTED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        subgraphId: 'subgraph-1',
        triggerId: 'trigger-1',
        input: { input: 'data' }
      });
    });
  });

  describe('buildTriggeredSubgraphCompletedEvent', () => {
    it('应该创建正确的TRIGGERED_SUBGRAPH_COMPLETED事件', () => {
      const event = eventBuilder.buildTriggeredSubgraphCompletedEvent(
        mockThreadContext,
        'subgraph-1',
        'trigger-1',
        { output: 'result' },
        5000
      );

      expect(event).toEqual({
        type: EventType.TRIGGERED_SUBGRAPH_COMPLETED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        subgraphId: 'subgraph-1',
        triggerId: 'trigger-1',
        output: { output: 'result' },
        executionTime: 5000
      });
    });

    it('应该处理未定义的output和executionTime', () => {
      const event = eventBuilder.buildTriggeredSubgraphCompletedEvent(
        mockThreadContext,
        'subgraph-1',
        'trigger-1',
        undefined,
        undefined
      );

      expect(event.output).toBeUndefined();
      expect(event.executionTime).toBeUndefined();
    });
  });

  describe('buildTriggeredSubgraphFailedEvent', () => {
    it('应该创建正确的TRIGGERED_SUBGRAPH_FAILED事件', () => {
      const event = eventBuilder.buildTriggeredSubgraphFailedEvent(
        mockThreadContext,
        'subgraph-1',
        'trigger-1',
        mockError
      );

      expect(event).toEqual({
        type: EventType.TRIGGERED_SUBGRAPH_FAILED,
        timestamp: 1234567890,
        workflowId: 'workflow-123',
        threadId: 'thread-123',
        subgraphId: 'subgraph-1',
        triggerId: 'trigger-1',
        error: 'Test error message'
      });
    });
  });
});
