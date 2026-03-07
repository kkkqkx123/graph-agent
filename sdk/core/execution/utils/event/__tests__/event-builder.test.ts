/**
 * EventBuilder 单元测试
 * 测试事件构建工具函数的各种功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Thread, ThreadResult, ID } from '@modular-agent/types';
import {
  buildThreadStartedEvent,
  buildThreadCompletedEvent,
  buildThreadFailedEvent,
  buildThreadPausedEvent,
  buildThreadResumedEvent,
  buildThreadCancelledEvent,
  buildThreadStateChangedEvent,
  buildNodeStartedEvent,
  buildNodeCompletedEvent,
  buildNodeFailedEvent,
  buildSubgraphStartedEvent,
  buildSubgraphCompletedEvent,
  buildVariableChangedEvent,
  buildMessageAddedEvent,
  buildTokenUsageWarningEvent,
  buildConversationStateChangedEvent,
  buildToolCallStartedEvent,
  buildToolCallCompletedEvent,
  buildToolCallFailedEvent,
  buildThreadForkStartedEvent,
  buildThreadForkCompletedEvent,
  buildThreadJoinStartedEvent,
  buildThreadJoinConditionMetEvent,
  buildThreadCopyStartedEvent,
  buildThreadCopyCompletedEvent,
  buildTriggeredSubgraphStartedEvent,
  buildTriggeredSubgraphCompletedEvent,
  buildTriggeredSubgraphFailedEvent
} from '../event-builder.js';

describe('EventBuilder', () => {
  let mockThread: Thread;
  let mockThreadResult: ThreadResult;
  let mockThreadContext: any;
  let mockError: Error;

  beforeEach(() => {
    // 设置测试用的 mock 数据
    mockThread = {
      id: 'thread-1' as ID,
      workflowId: 'workflow-1' as ID,
      workflowVersion: '1.0.0',
      status: 'RUNNING',
      currentNodeId: 'node-1' as ID,
      graph: { nodes: [], edges: [] } as any,
      variables: [],
      variableScopes: { global: {}, thread: {}, local: [], loop: [] },
      input: { key: 'value' },
      output: {},
      nodeResults: [],
      startTime: Date.now(),
      errors: []
    };

    mockThreadResult = {
      threadId: 'thread-1' as ID,
      output: { result: 'success' },
      executionTime: 1000,
      nodeResults: [],
      metadata: {
        status: 'COMPLETED',
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        executionTime: 1000,
        nodeCount: 0,
        errorCount: 0
      }
    };

    mockThreadContext = {
      getThreadId: vi.fn(() => 'thread-1'),
      getWorkflowId: vi.fn(() => 'workflow-1')
    };

    mockError = new Error('Test error');
  });

  describe('线程事件构建函数', () => {
    describe('buildThreadStartedEvent', () => {
      it('应该正确构建线程开始事件', () => {
        const event = buildThreadStartedEvent(mockThread);

        expect(event.type).toBe('THREAD_STARTED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.input).toEqual({ key: 'value' });
        expect(event.timestamp).toBeDefined();
        expect(typeof event.timestamp).toBe('number');
      });
    });

    describe('buildThreadCompletedEvent', () => {
      it('应该正确构建线程完成事件', () => {
        const event = buildThreadCompletedEvent(mockThread, mockThreadResult);

        expect(event.type).toBe('THREAD_COMPLETED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.output).toEqual({ result: 'success' });
        expect(event.executionTime).toBe(1000);
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildThreadFailedEvent', () => {
      it('应该正确构建线程失败事件', () => {
        const event = buildThreadFailedEvent(mockThread, mockError);

        expect(event.type).toBe('THREAD_FAILED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.error).toBe('Test error');
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildThreadPausedEvent', () => {
      it('应该正确构建线程暂停事件', () => {
        const event = buildThreadPausedEvent(mockThread);

        expect(event.type).toBe('THREAD_PAUSED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildThreadResumedEvent', () => {
      it('应该正确构建线程恢复事件', () => {
        const event = buildThreadResumedEvent(mockThread);

        expect(event.type).toBe('THREAD_RESUMED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildThreadCancelledEvent', () => {
      it('应该正确构建线程取消事件（带原因）', () => {
        const event = buildThreadCancelledEvent(mockThread, 'User cancelled');

        expect(event.type).toBe('THREAD_CANCELLED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.reason).toBe('User cancelled');
        expect(event.timestamp).toBeDefined();
      });

      it('应该正确构建线程取消事件（无原因）', () => {
        const event = buildThreadCancelledEvent(mockThread);

        expect(event.type).toBe('THREAD_CANCELLED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.reason).toBeUndefined();
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildThreadStateChangedEvent', () => {
      it('应该正确构建线程状态变更事件', () => {
        const event = buildThreadStateChangedEvent(mockThread, 'RUNNING', 'PAUSED');

        expect(event.type).toBe('THREAD_STATE_CHANGED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.previousStatus).toBe('RUNNING');
        expect(event.newStatus).toBe('PAUSED');
        expect(event.timestamp).toBeDefined();
      });
    });
  });

  describe('节点事件构建函数', () => {
    describe('buildNodeStartedEvent', () => {
      it('应该正确构建节点开始事件', () => {
        const event = buildNodeStartedEvent(mockThreadContext, 'node-1', 'LLM');

        expect(event.type).toBe('NODE_STARTED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.nodeId).toBe('node-1');
        expect(event.nodeType).toBe('LLM');
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildNodeCompletedEvent', () => {
      it('应该正确构建节点完成事件', () => {
        const output = { result: 'node output' };
        const event = buildNodeCompletedEvent(mockThreadContext, 'node-1', output, 500);

        expect(event.type).toBe('NODE_COMPLETED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.nodeId).toBe('node-1');
        expect(event.output).toEqual(output);
        expect(event.executionTime).toBe(500);
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildNodeFailedEvent', () => {
      it('应该正确构建节点失败事件', () => {
        const event = buildNodeFailedEvent(mockThreadContext, 'node-1', mockError);

        expect(event.type).toBe('NODE_FAILED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.nodeId).toBe('node-1');
        expect(event.error).toBe('Test error');
        expect(event.timestamp).toBeDefined();
      });
    });
  });

  describe('子图事件构建函数', () => {
    describe('buildSubgraphStartedEvent', () => {
      it('应该正确构建子图开始事件', () => {
        const input = { data: 'test' };
        const event = buildSubgraphStartedEvent(mockThreadContext, 'subgraph-1', 'parent-workflow-1', input);

        expect(event.type).toBe('SUBGRAPH_STARTED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.subgraphId).toBe('subgraph-1');
        expect(event.parentWorkflowId).toBe('parent-workflow-1');
        expect(event.input).toEqual(input);
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildSubgraphCompletedEvent', () => {
      it('应该正确构建子图完成事件', () => {
        const output = { result: 'subgraph output' };
        const event = buildSubgraphCompletedEvent(mockThreadContext, 'subgraph-1', output, 800);

        expect(event.type).toBe('SUBGRAPH_COMPLETED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.subgraphId).toBe('subgraph-1');
        expect(event.output).toEqual(output);
        expect(event.executionTime).toBe(800);
        expect(event.timestamp).toBeDefined();
      });
    });
  });

  describe('变量和消息事件构建函数', () => {
    describe('buildVariableChangedEvent', () => {
      it('应该正确构建变量变更事件', () => {
        const event = buildVariableChangedEvent(mockThreadContext, 'var1', 'value1', 'global');

        expect(event.type).toBe('VARIABLE_CHANGED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.variableName).toBe('var1');
        expect(event.variableValue).toBe('value1');
        expect(event.variableScope).toBe('global');
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildMessageAddedEvent', () => {
      it('应该正确构建消息添加事件（带节点ID）', () => {
        const event = buildMessageAddedEvent('thread-1', 'user', 'Hello', 'node-1', 'workflow-1');

        expect(event.type).toBe('MESSAGE_ADDED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.nodeId).toBe('node-1');
        expect(event.role).toBe('user');
        expect(event.content).toBe('Hello');
        expect(event.timestamp).toBeDefined();
      });

      it('应该正确构建消息添加事件（无节点ID）', () => {
        const event = buildMessageAddedEvent('thread-1', 'assistant', 'Hi there');

        expect(event.type).toBe('MESSAGE_ADDED');
        expect(event.threadId).toBe('thread-1');
        expect(event.nodeId).toBeUndefined();
        expect(event.role).toBe('assistant');
        expect(event.content).toBe('Hi there');
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildTokenUsageWarningEvent', () => {
      it('应该正确构建Token使用警告事件', () => {
        const event = buildTokenUsageWarningEvent('thread-1', 9000, 10000, 90, 'workflow-1');

        expect(event.type).toBe('TOKEN_USAGE_WARNING');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.tokensUsed).toBe(9000);
        expect(event.tokenLimit).toBe(10000);
        expect(event.usagePercentage).toBe(90);
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildConversationStateChangedEvent', () => {
      it('应该正确构建对话状态变更事件', () => {
        const event = buildConversationStateChangedEvent('thread-1', 10, 5000, 'node-1');

        expect(event.type).toBe('CONVERSATION_STATE_CHANGED');
        expect(event.threadId).toBe('thread-1');
        expect(event.nodeId).toBe('node-1');
        expect(event.messageCount).toBe(10);
        expect(event.tokenUsage).toBe(5000);
        expect(event.timestamp).toBeDefined();
      });
    });
  });

  describe('工具调用事件构建函数', () => {
    describe('buildToolCallStartedEvent', () => {
      it('应该正确构建工具调用开始事件（完整参数）', () => {
        const event = buildToolCallStartedEvent({
          threadId: 'thread-1',
          nodeId: 'node-1',
          toolId: 'tool-1' as ID,
          taskId: 'task-1',
          batchId: 'batch-1',
          toolName: 'search',
          toolArguments: '{"query":"test"}',
          workflowId: 'workflow-1'
        });

        expect(event.type).toBe('TOOL_CALL_STARTED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.nodeId).toBe('node-1');
        expect(event.toolId).toBe('tool-1');
        expect(event.toolName).toBe('search');
        expect(event.toolArguments).toBe('{"query":"test"}');
        expect(event.taskId).toBe('task-1');
        expect(event.batchId).toBe('batch-1');
        expect(event.timestamp).toBeDefined();
      });

      it('应该正确构建工具调用开始事件（最小参数）', () => {
        const event = buildToolCallStartedEvent({
          threadId: 'thread-1',
          nodeId: 'node-1',
          toolId: 'tool-1' as ID,
          taskId: 'task-1',
          batchId: 'batch-1',
          toolName: '',
          toolArguments: ''
        });

        expect(event.type).toBe('TOOL_CALL_STARTED');
        expect(event.threadId).toBe('thread-1');
        expect(event.nodeId).toBe('node-1');
        expect(event.toolId).toBe('tool-1');
        expect(event.toolName).toBe('');
        expect(event.toolArguments).toBe('');
        expect(event.taskId).toBe('task-1');
        expect(event.batchId).toBe('batch-1');
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildToolCallCompletedEvent', () => {
      it('应该正确构建工具调用完成事件（完整参数）', () => {
        const result = { data: 'tool result' };
        const event = buildToolCallCompletedEvent({
          threadId: 'thread-1',
          nodeId: 'node-1',
          toolId: 'tool-1' as ID,
          taskId: 'task-1',
          batchId: 'batch-1',
          toolName: 'search',
          toolResult: result,
          executionTime: 200,
          workflowId: 'workflow-1'
        });

        expect(event.type).toBe('TOOL_CALL_COMPLETED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.nodeId).toBe('node-1');
        expect(event.toolId).toBe('tool-1');
        expect(event.toolName).toBe('search');
        expect(event.toolResult).toEqual(result);
        expect(event.executionTime).toBe(200);
        expect(event.taskId).toBe('task-1');
        expect(event.batchId).toBe('batch-1');
        expect(event.timestamp).toBeDefined();
      });

      it('应该正确构建工具调用完成事件（最小参数）', () => {
        const event = buildToolCallCompletedEvent({
          threadId: 'thread-1',
          nodeId: 'node-1',
          toolId: 'tool-1' as ID,
          taskId: 'task-1',
          batchId: 'batch-1',
          toolName: '',
          toolResult: undefined,
          executionTime: 0
        });

        expect(event.type).toBe('TOOL_CALL_COMPLETED');
        expect(event.threadId).toBe('thread-1');
        expect(event.nodeId).toBe('node-1');
        expect(event.toolId).toBe('tool-1');
        expect(event.toolName).toBe('');
        expect(event.toolResult).toBeUndefined();
        expect(event.executionTime).toBe(0);
        expect(event.taskId).toBe('task-1');
        expect(event.batchId).toBe('batch-1');
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildToolCallFailedEvent', () => {
      it('应该正确构建工具调用失败事件（带错误）', () => {
        const event = buildToolCallFailedEvent({
          threadId: 'thread-1',
          nodeId: 'node-1',
          toolId: 'tool-1' as ID,
          taskId: 'task-1',
          batchId: 'batch-1',
          toolName: 'search',
          error: mockError,
          workflowId: 'workflow-1'
        });

        expect(event.type).toBe('TOOL_CALL_FAILED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.nodeId).toBe('node-1');
        expect(event.toolId).toBe('tool-1');
        expect(event.toolName).toBe('search');
        expect(event.error).toBe('Test error');
        expect(event.taskId).toBe('task-1');
        expect(event.batchId).toBe('batch-1');
        expect(event.timestamp).toBeDefined();
      });

      it('应该正确构建工具调用失败事件（无错误）', () => {
        const event = buildToolCallFailedEvent({
          threadId: 'thread-1',
          nodeId: 'node-1',
          toolId: 'tool-1' as ID,
          taskId: 'task-1',
          batchId: 'batch-1',
          toolName: '',
          error: new Error('Unknown error')
        });

        expect(event.type).toBe('TOOL_CALL_FAILED');
        expect(event.threadId).toBe('thread-1');
        expect(event.nodeId).toBe('node-1');
        expect(event.toolId).toBe('tool-1');
        expect(event.toolName).toBe('');
        expect(event.error).toBe('Unknown error');
        expect(event.taskId).toBe('task-1');
        expect(event.batchId).toBe('batch-1');
        expect(event.timestamp).toBeDefined();
      });
    });
  });

  describe('Fork/Join/Copy事件构建函数', () => {
    describe('buildThreadForkStartedEvent', () => {
      it('应该正确构建线程Fork开始事件', () => {
        const forkConfig = { branchCount: 3 };
        const event = buildThreadForkStartedEvent(mockThreadContext, forkConfig);

        expect(event.type).toBe('THREAD_FORK_STARTED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.parentThreadId).toBe('thread-1');
        expect(event.forkConfig).toEqual(forkConfig);
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildThreadForkCompletedEvent', () => {
      it('应该正确构建线程Fork完成事件', () => {
        const childThreadIds = ['thread-2', 'thread-3', 'thread-4'];
        const event = buildThreadForkCompletedEvent(mockThreadContext, childThreadIds);

        expect(event.type).toBe('THREAD_FORK_COMPLETED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.parentThreadId).toBe('thread-1');
        expect(event.childThreadIds).toEqual(childThreadIds);
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildThreadJoinStartedEvent', () => {
      it('应该正确构建线程Join开始事件', () => {
        const childThreadIds = ['thread-2', 'thread-3'];
        const event = buildThreadJoinStartedEvent(mockThreadContext, childThreadIds, 'ALL');

        expect(event.type).toBe('THREAD_JOIN_STARTED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.parentThreadId).toBe('thread-1');
        expect(event.childThreadIds).toEqual(childThreadIds);
        expect(event.joinStrategy).toBe('ALL');
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildThreadJoinConditionMetEvent', () => {
      it('应该正确构建线程Join条件满足事件', () => {
        const childThreadIds = ['thread-2', 'thread-3'];
        const event = buildThreadJoinConditionMetEvent(mockThreadContext, childThreadIds, 'ALL_COMPLETED');

        expect(event.type).toBe('THREAD_JOIN_CONDITION_MET');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.parentThreadId).toBe('thread-1');
        expect(event.childThreadIds).toEqual(childThreadIds);
        expect(event.condition).toBe('ALL_COMPLETED');
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildThreadCopyStartedEvent', () => {
      it('应该正确构建线程Copy开始事件', () => {
        const event = buildThreadCopyStartedEvent(mockThreadContext);

        expect(event.type).toBe('THREAD_COPY_STARTED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.sourceThreadId).toBe('thread-1');
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildThreadCopyCompletedEvent', () => {
      it('应该正确构建线程Copy完成事件', () => {
        const event = buildThreadCopyCompletedEvent(mockThreadContext, 'thread-2');

        expect(event.type).toBe('THREAD_COPY_COMPLETED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.sourceThreadId).toBe('thread-1');
        expect(event.copiedThreadId).toBe('thread-2');
        expect(event.timestamp).toBeDefined();
      });
    });
  });

  describe('触发子图事件构建函数', () => {
    describe('buildTriggeredSubgraphStartedEvent', () => {
      it('应该正确构建触发子图开始事件', () => {
        const input = { triggerData: 'test' };
        const event = buildTriggeredSubgraphStartedEvent(
          mockThreadContext,
          'subgraph-1',
          'trigger-1',
          input
        );

        expect(event.type).toBe('TRIGGERED_SUBGRAPH_STARTED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.subgraphId).toBe('subgraph-1');
        expect(event.triggerId).toBe('trigger-1');
        expect(event.input).toEqual(input);
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildTriggeredSubgraphCompletedEvent', () => {
      it('应该正确构建触发子图完成事件（完整参数）', () => {
        const output = { result: 'triggered output' };
        const event = buildTriggeredSubgraphCompletedEvent(
          mockThreadContext,
          'subgraph-1',
          'trigger-1',
          output,
          600
        );

        expect(event.type).toBe('TRIGGERED_SUBGRAPH_COMPLETED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.subgraphId).toBe('subgraph-1');
        expect(event.triggerId).toBe('trigger-1');
        expect(event.output).toEqual(output);
        expect(event.executionTime).toBe(600);
        expect(event.timestamp).toBeDefined();
      });

      it('应该正确构建触发子图完成事件（最小参数）', () => {
        const event = buildTriggeredSubgraphCompletedEvent(
          mockThreadContext,
          'subgraph-1',
          'trigger-1',
          undefined,
          undefined
        );

        expect(event.type).toBe('TRIGGERED_SUBGRAPH_COMPLETED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.subgraphId).toBe('subgraph-1');
        expect(event.triggerId).toBe('trigger-1');
        expect(event.output).toBeUndefined();
        expect(event.executionTime).toBeUndefined();
        expect(event.timestamp).toBeDefined();
      });
    });

    describe('buildTriggeredSubgraphFailedEvent', () => {
      it('应该正确构建触发子图失败事件', () => {
        const event = buildTriggeredSubgraphFailedEvent(
          mockThreadContext,
          'subgraph-1',
          'trigger-1',
          mockError
        );

        expect(event.type).toBe('TRIGGERED_SUBGRAPH_FAILED');
        expect(event.threadId).toBe('thread-1');
        expect(event.workflowId).toBe('workflow-1');
        expect(event.subgraphId).toBe('subgraph-1');
        expect(event.triggerId).toBe('trigger-1');
        expect(event.error).toBe('Test error');
        expect(event.timestamp).toBeDefined();
      });
    });
  });
});