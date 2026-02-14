/**
 * event-emitter 单元测试
 */

import { emitHookEvent } from '../event-emitter';
import type { HookExecutionContext } from '../../index';
import { EventType } from '@modular-agent/types';

describe('event-emitter', () => {
  describe('emitHookEvent', () => {
    it('应该成功触发自定义事件', async () => {
      // 准备测试数据
      const mockThread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        variableValues: {}
      } as any;

      const mockNode = {
        id: 'node-1',
        type: 'LLM_NODE',
        config: {},
        metadata: {
          description: 'Test node'
        }
      } as any;

      const context: HookExecutionContext = {
        thread: mockThread,
        node: mockNode
      };

      const eventName = 'custom.event';
      const eventData = {
        message: 'Test event data',
        value: 42
      };

      const mockEmitEvent = jest.fn().mockResolvedValue(undefined);

      // 执行函数
      await emitHookEvent(context, eventName, eventData, mockEmitEvent);

      // 验证 emitEvent 被调用
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);

      // 验证事件对象的结构
      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent).toEqual({
        type: EventType.NODE_CUSTOM_EVENT,
        timestamp: expect.any(Number),
        workflowId: mockThread.workflowId,
        threadId: mockThread.id,
        nodeId: mockNode.id,
        nodeType: mockNode.type,
        eventName,
        eventData,
        metadata: mockNode.metadata
      });

      // 验证时间戳是合理的
      expect(emittedEvent.timestamp).toBeLessThanOrEqual(Date.now());
      expect(emittedEvent.timestamp).toBeGreaterThan(Date.now() - 1000);
    });

    it('应该处理事件发射失败的情况', async () => {
      const mockThread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        variableValues: {}
      } as any;

      const mockNode = {
        id: 'node-1',
        type: 'LLM_NODE',
        config: {}
      } as any;

      const context: HookExecutionContext = {
        thread: mockThread,
        node: mockNode
      };

      const eventName = 'failed.event';
      const eventData = { test: 'data' };

      const mockError = new Error('Event emission failed');
      const mockEmitEvent = jest.fn().mockRejectedValue(mockError);

      // 捕获 console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // 执行函数 - 不应该抛出异常
      await expect(
        emitHookEvent(context, eventName, eventData, mockEmitEvent)
      ).resolves.not.toThrow();

      // 验证 emitEvent 被调用
      expect(mockEmitEvent).toHaveBeenCalledTimes(1);

      // 验证错误被记录
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Failed to emit custom event "${eventName}" for node "${mockNode.id}":`,
        mockError
      );

      // 恢复 console.error
      consoleErrorSpy.mockRestore();
    });

    it('应该正确处理空的事件数据', async () => {
      const mockThread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        variableValues: {}
      } as any;

      const mockNode = {
        id: 'node-1',
        type: 'LLM_NODE',
        config: {}
      } as any;

      const context: HookExecutionContext = {
        thread: mockThread,
        node: mockNode
      };

      const eventName = 'empty.event';
      const eventData = {};

      const mockEmitEvent = jest.fn().mockResolvedValue(undefined);

      await emitHookEvent(context, eventName, eventData, mockEmitEvent);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.eventData).toEqual({});
    });

    it('应该正确处理复杂的事件数据', async () => {
      const mockThread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        variableValues: {}
      } as any;

      const mockNode = {
        id: 'node-1',
        type: 'LLM_NODE',
        config: {}
      } as any;

      const context: HookExecutionContext = {
        thread: mockThread,
        node: mockNode
      };

      const complexEventData = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' }
        },
        primitive: 'text',
        number: 42,
        boolean: true,
        nullValue: null
      };

      const mockEmitEvent = jest.fn().mockResolvedValue(undefined);

      await emitHookEvent(context, 'complex.event', complexEventData, mockEmitEvent);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.eventData).toEqual(complexEventData);
    });

    it('应该正确处理没有metadata的节点', async () => {
      const mockThread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        variableValues: {}
      } as any;

      const mockNode = {
        id: 'node-1',
        type: 'LLM_NODE',
        config: {}
        // 没有 metadata
      } as any;

      const context: HookExecutionContext = {
        thread: mockThread,
        node: mockNode
      };

      const mockEmitEvent = jest.fn().mockResolvedValue(undefined);

      await emitHookEvent(context, 'test.event', {}, mockEmitEvent);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.metadata).toBeUndefined();
    });

    it('应该正确处理包含特殊字符的事件名称', async () => {
      const mockThread = {
        id: 'thread-1',
        workflowId: 'workflow-1',
        variableValues: {}
      } as any;

      const mockNode = {
        id: 'node-1',
        type: 'LLM_NODE',
        config: {}
      } as any;

      const context: HookExecutionContext = {
        thread: mockThread,
        node: mockNode
      };

      const specialEventName = 'event.with.dots-and_underscores';
      const mockEmitEvent = jest.fn().mockResolvedValue(undefined);

      await emitHookEvent(context, specialEventName, {}, mockEmitEvent);

      const emittedEvent = mockEmitEvent.mock.calls[0][0];
      expect(emittedEvent.eventName).toBe(specialEventName);
    });
  });
});