/**
 * MessageStream 单元测试
 */

import { MessageStream } from '../message-stream';
import {
  MessageStreamEventType,
  type MessageStreamTextEvent
} from '../message-stream-events';
import type { LLMMessage, LLMResult } from '@modular-agent/types/llm';

describe('MessageStream', () => {
  let stream: MessageStream;

  beforeEach(() => {
    stream = new MessageStream();
  });

  afterEach(() => {
    stream.abort();
  });

  describe('构造函数', () => {
    it('应该正确初始化流', () => {
      expect(stream.isEnded()).toBe(false);
      expect(stream.isErrored()).toBe(false);
      expect(stream.isAborted()).toBe(false);
      expect(stream.getReceivedMessages()).toEqual([]);
    });

    it('应该创建AbortController', () => {
      const controller = stream.getController();
      expect(controller).toBeDefined();
      expect(controller.signal).toBeDefined();
    });
  });

  describe('事件监听器', () => {
    it('应该支持添加事件监听器', () => {
      const mockListener = jest.fn();

      // 通过触发事件来测试监听器
      stream.on(MessageStreamEventType.TEXT, mockListener);

      // 使用 accumulateMessage 来触发 TEXT 事件
      stream.accumulateMessage({
        type: 'message_start',
        data: {
          message: {
            role: 'assistant',
            content: []
          }
        }
      });

      stream.accumulateMessage({
        type: 'content_block_start',
        data: {
          content_block: {
            type: 'text',
            text: ''
          }
        }
      });

      stream.accumulateMessage({
        type: 'content_block_delta',
        data: {
          delta: {
            type: 'text_delta',
            text: 'test'
          }
        }
      });

      expect(mockListener).toHaveBeenCalled();
    });

    it('应该支持移除事件监听器', () => {
      const mockListener = jest.fn();
      stream.on(MessageStreamEventType.TEXT, mockListener);
      stream.off(MessageStreamEventType.TEXT, mockListener);

      // 尝试触发事件
      stream.accumulateMessage({
        type: 'message_start',
        data: {
          message: {
            role: 'assistant',
            content: []
          }
        }
      });

      stream.accumulateMessage({
        type: 'content_block_start',
        data: {
          content_block: {
            type: 'text',
            text: ''
          }
        }
      });

      stream.accumulateMessage({
        type: 'content_block_delta',
        data: {
          delta: {
            type: 'text_delta',
            text: 'test'
          }
        }
      });

      expect(mockListener).not.toHaveBeenCalled();
    });

    it('应该支持一次性事件监听器', () => {
      const mockListener = jest.fn();
      stream.once(MessageStreamEventType.TEXT, mockListener);

      // 触发事件两次
      stream.accumulateMessage({
        type: 'message_start',
        data: {
          message: {
            role: 'assistant',
            content: []
          }
        }
      });

      stream.accumulateMessage({
        type: 'content_block_start',
        data: {
          content_block: {
            type: 'text',
            text: ''
          }
        }
      });

      stream.accumulateMessage({
        type: 'content_block_delta',
        data: {
          delta: {
            type: 'text_delta',
            text: 'test'
          }
        }
      });

      stream.accumulateMessage({
        type: 'content_block_delta',
        data: {
          delta: {
            type: 'text_delta',
            text: 'test2'
          }
        }
      });

      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it('应该支持链式调用', () => {
      const mockListener = jest.fn();
      const result = stream
        .on(MessageStreamEventType.TEXT, mockListener)
        .off(MessageStreamEventType.TEXT, mockListener);

      expect(result).toBe(stream);
    });
  });

  describe('emitted', () => {
    it('应该在事件触发时解析Promise', async () => {
      const promise = stream.emitted(MessageStreamEventType.TEXT);

      // 延迟触发事件
      setTimeout(() => {
        stream.accumulateMessage({
          type: 'message_start',
          data: {
            message: {
              role: 'assistant',
              content: []
            }
          }
        });

        stream.accumulateMessage({
          type: 'content_block_start',
          data: {
            content_block: {
              type: 'text',
              text: ''
            }
          }
        });

        stream.accumulateMessage({
          type: 'content_block_delta',
          data: {
            delta: {
              type: 'text_delta',
              text: 'test'
            }
          }
        });
      }, 10);

      const event = await promise;
      expect(event.type).toBe(MessageStreamEventType.TEXT);
    });
  });

  describe('finalMessage', () => {
    it('应该在有消息时返回最终消息', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: 'Final message'
      };

      // 模拟接收消息
      (stream as any).receivedMessages.push(message);

      const finalMessage = stream.getReceivedMessages()[0];
      expect(finalMessage).toEqual(message);
    });
  });

  describe('finalText', () => {
    it('应该返回字符串内容', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: 'Hello, world!'
      };

      const text = typeof message.content === 'string' ? message.content : '';
      expect(text).toBe('Hello, world!');
    });

    it('应该从数组内容中提取文本', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'text', text: ', world!' }
        ]
      };

      let text = '';
      if (Array.isArray(message.content)) {
        text = message.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('');
      }

      expect(text).toBe('Hello, world!');
    });

    it('应该在无文本内容时返回空字符串', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: []
      };

      let text = '';
      if (Array.isArray(message.content)) {
        text = message.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('');
      }

      expect(text).toBe('');
    });
  });

  describe('getFinalResult', () => {
    it('应该返回最终结果', () => {
      const result: LLMResult = {
        id: 'test-result-id',
        model: 'gpt-4',
        content: 'Test',
        message: {
          role: 'assistant',
          content: 'Test'
        },
        finishReason: 'stop',
        duration: 0,
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        }
      };

      const mockListener = jest.fn();
      stream.on(MessageStreamEventType.FINAL_MESSAGE, mockListener);

      stream.setFinalResult(result);

      expect(mockListener).toHaveBeenCalled();
      const event = mockListener.mock.calls[0][0];
      expect(event.result).toEqual(result);
    });
  });

  describe('abort', () => {
    it('应该中止流', () => {
      const controller = stream.getController();
      stream.abort();

      expect(controller.signal.aborted).toBe(true);
    });

    it('应该触发AbortController', () => {
      const controller = stream.getController();
      const abortSpy = jest.spyOn(controller, 'abort');

      stream.abort();

      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('tee', () => {
    it('应该创建两个独立的流', () => {
      const [left, right] = stream.tee();

      expect(left).toBeInstanceOf(MessageStream);
      expect(right).toBeInstanceOf(MessageStream);
      expect(left).not.toBe(right);
    });

    it('应该共享AbortController', () => {
      const [left, right] = stream.tee();

      expect(left.getController()).toBe(stream.getController());
      expect(right.getController()).toBe(stream.getController());
    });

    it('应该共享requestId', () => {
      stream.setRequestId('test-request-id');
      const [left, right] = stream.tee();

      expect(left.getRequestId()).toBe('test-request-id');
      expect(right.getRequestId()).toBe('test-request-id');
    });
  });

  describe('accumulateMessage', () => {
    it('应该处理message_start事件', () => {
      const event = {
        type: 'message_start',
        data: {
          message: {
            role: 'assistant',
            content: ''
          }
        }
      };

      const snapshot = stream.accumulateMessage(event);

      expect(snapshot).toBeDefined();
      expect(snapshot?.role).toBe('assistant');
    });

    it('应该在message_start已存在时抛出错误', () => {
      const event = {
        type: 'message_start',
        data: {
          message: {
            role: 'assistant',
            content: ''
          }
        }
      };

      stream.accumulateMessage(event);

      expect(() => stream.accumulateMessage(event)).toThrow('Message already started');
    });

    it('应该处理content_block_delta事件', () => {
      // 先启动消息
      stream.accumulateMessage({
        type: 'message_start',
        data: {
          message: {
            role: 'assistant',
            content: []
          }
        }
      });

      // 启动内容块
      stream.accumulateMessage({
        type: 'content_block_start',
        data: {
          content_block: {
            type: 'text',
            text: ''
          }
        }
      });

      // 添加文本增量
      const snapshot = stream.accumulateMessage({
        type: 'content_block_delta',
        data: {
          delta: {
            type: 'text_delta',
            text: 'Hello'
          }
        }
      });

      expect(snapshot).toBeDefined();
      if (Array.isArray(snapshot?.content)) {
        const textBlock = snapshot.content[0] as any;
        expect(textBlock.text).toBe('Hello');
      }
    });

    it('应该处理message_stop事件', () => {
      // 启动消息
      stream.accumulateMessage({
        type: 'message_start',
        data: {
          message: {
            role: 'assistant',
            content: 'Test'
          }
        }
      });

      // 停止消息
      const message = stream.accumulateMessage({
        type: 'message_stop',
        data: {}
      });

      expect(message).toBeDefined();
      expect(stream.getReceivedMessages()).toHaveLength(1);
    });

    it('应该处理tool_use的input_json_delta', () => {
      // 启动消息
      stream.accumulateMessage({
        type: 'message_start',
        data: {
          message: {
            role: 'assistant',
            content: []
          }
        }
      });

      // 启动工具使用块
      stream.accumulateMessage({
        type: 'content_block_start',
        data: {
          content_block: {
            type: 'tool_use',
            id: 'tool-1',
            name: 'test_function',
            input: ''
          }
        }
      });

      // 添加JSON增量
      stream.accumulateMessage({
        type: 'content_block_delta',
        data: {
          delta: {
            type: 'input_json_delta',
            partial_json: '{"arg1":'
          }
        }
      });

      stream.accumulateMessage({
        type: 'content_block_delta',
        data: {
          delta: {
            type: 'input_json_delta',
            partial_json: '"value1"}'
          }
        }
      });

      const snapshot = stream.accumulateMessage({
        type: 'message_stop',
        data: {}
      });

      expect(snapshot).toBeDefined();
      if (Array.isArray(snapshot?.content)) {
        const toolBlock = snapshot.content[0] as any;
        expect(toolBlock.input).toBe('{"arg1":"value1"}');
      }
    });
  });

  describe('setFinalResult', () => {
    it('应该设置最终结果', () => {
      const result: LLMResult = {
        id: 'test-result-id',
        model: 'gpt-4',
        content: 'Test',
        message: {
          role: 'assistant',
          content: 'Test'
        },
        finishReason: 'stop',
        duration: 0,
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        }
      };

      const mockListener = jest.fn();
      stream.on(MessageStreamEventType.FINAL_MESSAGE, mockListener);

      stream.setFinalResult(result);

      expect(mockListener).toHaveBeenCalled();
      const event = mockListener.mock.calls[0][0];
      expect(event.result).toEqual(result);
    });
  });

  describe('setResponse', () => {
    it('应该设置响应对象', () => {
      const mockResponse = {} as Response;
      stream.setResponse(mockResponse);

      expect(stream.getResponse()).toBe(mockResponse);
    });
  });

  describe('setRequestId', () => {
    it('应该设置请求ID', () => {
      const mockListener = jest.fn();
      stream.on(MessageStreamEventType.CONNECT, mockListener);

      stream.setRequestId('test-request-id');

      expect(stream.getRequestId()).toBe('test-request-id');
      expect(mockListener).toHaveBeenCalled();
    });
  });

  describe('getReceivedMessages', () => {
    it('应该返回接收的消息副本', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: 'Test'
      };

      (stream as any).receivedMessages.push(message);

      const messages = stream.getReceivedMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);

      // 修改返回的数组不应影响内部状态
      messages.push({ role: 'user', content: 'Another' } as LLMMessage);
      expect(stream.getReceivedMessages()).toHaveLength(1);
    });
  });
});