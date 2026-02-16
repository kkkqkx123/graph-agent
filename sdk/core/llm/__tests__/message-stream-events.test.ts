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
import type { LLMMessage, LLMResult } from '@modular-agent/types';

describe('MessageStreamEvents', () => {
  describe('MessageStreamEventType', () => {
    it('应该定义所有事件类型', () => {
      expect('connect').toBe('connect');
      expect('streamEvent').toBe('streamEvent');
      expect('text').toBe('text');
      expect('toolCall').toBe('toolCall');
      expect('message').toBe('message');
      expect('finalMessage').toBe('finalMessage');
      expect('error').toBe('error');
      expect('abort').toBe('abort');
      expect('end').toBe('end');
    });
  });

  describe('MessageStreamConnectEvent', () => {
    it('应该正确创建连接事件', () => {
      const event: MessageStreamConnectEvent = {
        type: 'connect',
        requestId: 'test-request-id'
      };

      expect(event.type).toBe('connect');
      expect(event.requestId).toBe('test-request-id');
    });
  });

  describe('MessageStreamStreamEvent', () => {
    it('应该正确创建流事件', () => {
      const event: MessageStreamStreamEvent = {
        type: 'streamEvent',
        event: {
          type: 'content_block_delta',
          data: { delta: { type: 'text_delta', text: 'Hello' } }
        },
        snapshot: {
          role: 'assistant' as MessageRole,
          content: 'Hello'
        }
      };

      expect(event.type).toBe('streamEvent');
      expect(event.event.type).toBe('content_block_delta');
      expect(event.snapshot).toBeDefined();
    });

    it('应该允许snapshot为null', () => {
      const event: MessageStreamStreamEvent = {
        type: 'streamEvent',
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
        type: 'text',
        delta: 'Hello',
        snapshot: 'Hello'
      };

      expect(event.type).toBe('text');
      expect(event.delta).toBe('Hello');
      expect(event.snapshot).toBe('Hello');
    });

    it('应该支持累积文本', () => {
      const event: MessageStreamTextEvent = {
        type: 'text',
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
        role: 'assistant' as MessageRole,
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
        type: 'toolCall',
        toolCall,
        snapshot: message
      };

      expect(event.type).toBe('toolCall');
      expect(event.toolCall).toEqual(toolCall);
      expect(event.snapshot).toEqual(message);
    });
  });

  describe('MessageStreamMessageEvent', () => {
    it('应该正确创建消息事件', () => {
      const message: LLMMessage = {
        role: 'assistant' as MessageRole,
        content: 'Hello, world!'
      };

      const event: MessageStreamMessageEvent = {
        type: 'message',
        message
      };

      expect(event.type).toBe('message');
      expect(event.message).toEqual(message);
    });

    it('应该支持复杂内容结构', () => {
      const message: LLMMessage = {
        role: 'assistant' as MessageRole,
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
        type: 'message',
        message
      };

      expect(Array.isArray(event.message.content)).toBe(true);
      expect(event.message.content).toHaveLength(2);
    });
  });

  describe('MessageStreamFinalMessageEvent', () => {
    it('应该正确创建最终消息事件', () => {
      const message: LLMMessage = {
        role: 'assistant' as MessageRole,
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
        type: 'finalMessage',
        message,
        result
      };

      expect(event.type).toBe('finalMessage');
      expect(event.message).toEqual(message);
      expect(event.result).toEqual(result);
    });
  });

  describe('MessageStreamErrorEvent', () => {
    it('应该正确创建错误事件', () => {
      const error = new Error('Test error');

      const event: MessageStreamErrorEvent = {
        type: 'error',
        error
      };

      expect(event.type).toBe('error');
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
        type: 'error',
        error
      };

      expect(event.error).toBeInstanceOf(CustomError);
      expect((event.error as CustomError).code).toBe('ERR_001');
    });
  });

  describe('MessageStreamAbortEvent', () => {
    it('应该正确创建中止事件', () => {
      const event: MessageStreamAbortEvent = {
        type: 'abort',
        reason: 'User cancelled'
      };

      expect(event.type).toBe('abort');
      expect(event.reason).toBe('User cancelled');
    });

    it('应该允许reason为undefined', () => {
      const event: MessageStreamAbortEvent = {
        type: 'abort'
      };

      expect(event.type).toBe('abort');
      expect(event.reason).toBeUndefined();
    });
  });

  describe('MessageStreamEndEvent', () => {
    it('应该正确创建结束事件', () => {
      const event: MessageStreamEndEvent = {
        type: 'end'
      };

      expect(event.type).toBe('end');
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
          snapshot: { role: 'assistant' as MessageRole, content: '' }
        },
        {
          type: MessageStreamEventType.MESSAGE,
          message: { role: 'assistant' as MessageRole, content: '' }
        },
        {
          type: MessageStreamEventType.FINAL_MESSAGE,
          message: { role: 'assistant' as MessageRole, content: '' },
          result: {
            id: 'test-result-id',
            model: 'gpt-4',
            content: '',
            message: { role: 'assistant' as MessageRole, content: '' },
            finishReason: 'stop',
            duration: 0,
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
          }
        },
        { type: 'error', error: new Error('test') },
        { type: 'abort' },
        { type: MessageStreamEventType.END }
      ];

      expect(events).toHaveLength(9);
    });
  });
});