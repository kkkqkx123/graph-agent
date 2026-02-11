/**
 * MessageStreamEvents 单元测试
 */

import {
  MessageStreamEventType,
  type MessageStreamEvent,
  type MessageStreamConnectEvent,
  type MessageStreamStreamEvent,
  type MessageStreamTextEvent,
  type MessageStreamToolCallEvent,
  type MessageStreamMessageEvent,
  type MessageStreamFinalMessageEvent,
  type MessageStreamErrorEvent,
  type MessageStreamAbortEvent,
  type MessageStreamEndEvent
} from '../message-stream-events';
import type { LLMMessage, LLMResult } from '@modular-agent/types/llm';

describe('MessageStreamEvents', () => {
  describe('MessageStreamEventType', () => {
    it('应该定义所有事件类型', () => {
      expect(MessageStreamEventType.CONNECT).toBe('connect');
      expect(MessageStreamEventType.STREAM_EVENT).toBe('streamEvent');
      expect(MessageStreamEventType.TEXT).toBe('text');
      expect(MessageStreamEventType.TOOL_CALL).toBe('toolCall');
      expect(MessageStreamEventType.MESSAGE).toBe('message');
      expect(MessageStreamEventType.FINAL_MESSAGE).toBe('finalMessage');
      expect(MessageStreamEventType.ERROR).toBe('error');
      expect(MessageStreamEventType.ABORT).toBe('abort');
      expect(MessageStreamEventType.END).toBe('end');
    });
  });

  describe('MessageStreamConnectEvent', () => {
    it('应该正确创建连接事件', () => {
      const event: MessageStreamConnectEvent = {
        type: MessageStreamEventType.CONNECT,
        requestId: 'test-request-id'
      };

      expect(event.type).toBe(MessageStreamEventType.CONNECT);
      expect(event.requestId).toBe('test-request-id');
    });
  });

  describe('MessageStreamStreamEvent', () => {
    it('应该正确创建流事件', () => {
      const event: MessageStreamStreamEvent = {
        type: MessageStreamEventType.STREAM_EVENT,
        event: {
          type: 'content_block_delta',
          data: { delta: { type: 'text_delta', text: 'Hello' } }
        },
        snapshot: {
          role: 'assistant',
          content: 'Hello'
        }
      };

      expect(event.type).toBe(MessageStreamEventType.STREAM_EVENT);
      expect(event.event.type).toBe('content_block_delta');
      expect(event.snapshot).toBeDefined();
    });

    it('应该允许snapshot为null', () => {
      const event: MessageStreamStreamEvent = {
        type: MessageStreamEventType.STREAM_EVENT,
        event: {
          type: 'test',
          data: {}
        },
        snapshot: null
      };

      expect(event.snapshot).toBeNull();
    });
  });

  describe('MessageStreamTextEvent', () => {
    it('应该正确创建文本增量事件', () => {
      const event: MessageStreamTextEvent = {
        type: MessageStreamEventType.TEXT,
        delta: 'Hello',
        snapshot: 'Hello'
      };

      expect(event.type).toBe(MessageStreamEventType.TEXT);
      expect(event.delta).toBe('Hello');
      expect(event.snapshot).toBe('Hello');
    });

    it('应该支持累积文本', () => {
      const event: MessageStreamTextEvent = {
        type: MessageStreamEventType.TEXT,
        delta: ' World',
        snapshot: 'Hello World'
      };

      expect(event.delta).toBe(' World');
      expect(event.snapshot).toBe('Hello World');
    });
  });

  describe('MessageStreamToolCallEvent', () => {
    it('应该正确创建工具调用事件', () => {
      const toolCall = {
        id: 'tool-1',
        type: 'function',
        function: {
          name: 'test_function',
          arguments: '{"arg1":"value1"}'
        }
      };

      const message: LLMMessage = {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'test_function',
            input: { arg1: 'value1' }
          }
        ]
      };

      const event: MessageStreamToolCallEvent = {
        type: MessageStreamEventType.TOOL_CALL,
        toolCall,
        snapshot: message
      };

      expect(event.type).toBe(MessageStreamEventType.TOOL_CALL);
      expect(event.toolCall).toEqual(toolCall);
      expect(event.snapshot).toEqual(message);
    });
  });

  describe('MessageStreamMessageEvent', () => {
    it('应该正确创建消息事件', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: 'Hello, world!'
      };

      const event: MessageStreamMessageEvent = {
        type: MessageStreamEventType.MESSAGE,
        message
      };

      expect(event.type).toBe(MessageStreamEventType.MESSAGE);
      expect(event.message).toEqual(message);
    });

    it('应该支持复杂内容结构', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello' },
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'test',
            input: {}
          }
        ]
      };

      const event: MessageStreamMessageEvent = {
        type: MessageStreamEventType.MESSAGE,
        message
      };

      expect(Array.isArray(event.message.content)).toBe(true);
      expect(event.message.content).toHaveLength(2);
    });
  });

  describe('MessageStreamFinalMessageEvent', () => {
    it('应该正确创建最终消息事件', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: 'Final response'
      };

      const result: LLMResult = {
        id: 'test-result-id',
        model: 'gpt-4',
        content: 'Final response',
        message,
        finishReason: 'stop',
        duration: 0,
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        }
      };

      const event: MessageStreamFinalMessageEvent = {
        type: MessageStreamEventType.FINAL_MESSAGE,
        message,
        result
      };

      expect(event.type).toBe(MessageStreamEventType.FINAL_MESSAGE);
      expect(event.message).toEqual(message);
      expect(event.result).toEqual(result);
    });
  });

  describe('MessageStreamErrorEvent', () => {
    it('应该正确创建错误事件', () => {
      const error = new Error('Test error');

      const event: MessageStreamErrorEvent = {
        type: MessageStreamEventType.ERROR,
        error
      };

      expect(event.type).toBe(MessageStreamEventType.ERROR);
      expect(event.error).toBe(error);
      expect(event.error.message).toBe('Test error');
    });

    it('应该支持自定义错误', () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error', 'ERR_001');

      const event: MessageStreamErrorEvent = {
        type: MessageStreamEventType.ERROR,
        error
      };

      expect(event.error).toBeInstanceOf(CustomError);
      expect((event.error as CustomError).code).toBe('ERR_001');
    });
  });

  describe('MessageStreamAbortEvent', () => {
    it('应该正确创建中止事件', () => {
      const event: MessageStreamAbortEvent = {
        type: MessageStreamEventType.ABORT,
        reason: 'User cancelled'
      };

      expect(event.type).toBe(MessageStreamEventType.ABORT);
      expect(event.reason).toBe('User cancelled');
    });

    it('应该允许reason为undefined', () => {
      const event: MessageStreamAbortEvent = {
        type: MessageStreamEventType.ABORT
      };

      expect(event.type).toBe(MessageStreamEventType.ABORT);
      expect(event.reason).toBeUndefined();
    });
  });

  describe('MessageStreamEndEvent', () => {
    it('应该正确创建结束事件', () => {
      const event: MessageStreamEndEvent = {
        type: MessageStreamEventType.END
      };

      expect(event.type).toBe(MessageStreamEventType.END);
    });
  });

  describe('MessageStreamEvent联合类型', () => {
    it('应该支持所有事件类型', () => {
      const events: MessageStreamEvent[] = [
        { type: MessageStreamEventType.CONNECT, requestId: '1' },
        {
          type: MessageStreamEventType.STREAM_EVENT,
          event: { type: 'test', data: {} },
          snapshot: null
        },
        { type: MessageStreamEventType.TEXT, delta: 'test', snapshot: 'test' },
        {
          type: MessageStreamEventType.TOOL_CALL,
          toolCall: {},
          snapshot: { role: 'assistant', content: '' }
        },
        {
          type: MessageStreamEventType.MESSAGE,
          message: { role: 'assistant', content: '' }
        },
        {
          type: MessageStreamEventType.FINAL_MESSAGE,
          message: { role: 'assistant', content: '' },
          result: {
            id: 'test-result-id',
            model: 'gpt-4',
            content: '',
            message: { role: 'assistant', content: '' },
            finishReason: 'stop',
            duration: 0,
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
          }
        },
        { type: MessageStreamEventType.ERROR, error: new Error('test') },
        { type: MessageStreamEventType.ABORT },
        { type: MessageStreamEventType.END }
      ];

      expect(events).toHaveLength(9);
    });
  });
});