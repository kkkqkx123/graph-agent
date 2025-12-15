/**
 * 消息转换器集成测试
 * 
 * 测试统一消息转换器的功能
 */

import { MessageConverter, HumanMessage, AIMessage, SystemMessage, ToolMessage } from '../message-converter';
import { LLMMessage } from '../../../../../domain/llm/entities/llm-request';

describe('MessageConverter', () => {
  let converter: MessageConverter;

  beforeEach(() => {
    converter = new MessageConverter();
  });

  describe('toBaseMessage', () => {
    it('应该正确转换LLMMessage到HumanMessage', () => {
      const llmMessage: LLMMessage = {
        role: 'user',
        content: '你好，世界'
      };

      const result = converter.toBaseMessage(llmMessage);

      expect(result).toBeInstanceOf(HumanMessage);
      expect(result.content).toBe('你好，世界');
    });

    it('应该正确转换LLMMessage到AIMessage', () => {
      const llmMessage: LLMMessage = {
        role: 'assistant',
        content: '我是助手',
        tool_calls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'test_function',
              arguments: JSON.stringify({ param: 'value' })
            }
          }
        ]
      };

      const result = converter.toBaseMessage(llmMessage);

      expect(result).toBeInstanceOf(AIMessage);
      expect(result.content).toBe('我是助手');
      expect((result as AIMessage).toolCalls).toHaveLength(1);
    });

    it('应该正确转换LLMMessage到SystemMessage', () => {
      const llmMessage: LLMMessage = {
        role: 'system',
        content: '你是一个助手'
      };

      const result = converter.toBaseMessage(llmMessage);

      expect(result).toBeInstanceOf(SystemMessage);
      expect(result.content).toBe('你是一个助手');
    });

    it('应该正确转换LLMMessage到ToolMessage', () => {
      const llmMessage: LLMMessage = {
        role: 'tool',
        content: '工具执行结果',
        tool_call_id: 'call_123'
      };

      const result = converter.toBaseMessage(llmMessage);

      expect(result).toBeInstanceOf(ToolMessage);
      expect(result.content).toBe('工具执行结果');
      expect((result as ToolMessage).toolCallId).toBe('call_123');
    });

    it('应该正确转换字典格式到BaseMessage', () => {
      const messageDict = {
        role: 'user',
        content: '测试消息',
        name: 'test_user'
      };

      const result = converter.toBaseMessage(messageDict);

      expect(result).toBeInstanceOf(HumanMessage);
      expect(result.content).toBe('测试消息');
      expect(result.name).toBe('test_user');
    });

    it('应该处理字符串消息', () => {
      const message = '简单字符串消息';

      const result = converter.toBaseMessage(message);

      expect(result).toBeInstanceOf(HumanMessage);
      expect(result.content).toBe('简单字符串消息');
    });
  });

  describe('fromBaseMessage', () => {
    it('应该正确转换BaseMessage到LLMMessage', () => {
      const baseMessage = new HumanMessage('你好，世界', 'user');

      const result = converter.fromBaseMessage(baseMessage, 'llm');

      expect(result).toBeDefined();
      expect(result.role).toBe('user');
      expect(result.content).toBe('你好，世界');
      expect(result.name).toBe('user');
    });

    it('应该正确转换AIMessage到LLMMessage', () => {
      const toolCalls = [
        {
          id: 'call_123',
          type: 'function',
          function: {
            name: 'test_function',
            arguments: JSON.stringify({ param: 'value' })
          }
        }
      ];
      const baseMessage = new AIMessage('助手回复', 'assistant', toolCalls);

      const result = converter.fromBaseMessage(baseMessage, 'llm');

      expect(result.role).toBe('assistant');
      expect(result.content).toBe('助手回复');
      expect(result.tool_calls).toHaveLength(1);
    });

    it('应该正确转换到字典格式', () => {
      const baseMessage = new HumanMessage('测试消息', 'test_user', { extra: 'data' });

      const result = converter.fromBaseMessage(baseMessage, 'dict');

      expect(result.content).toBe('测试消息');
      expect(result.name).toBe('test_user');
      expect(result.type).toBe('human');
      expect(result.additionalKwargs).toEqual({ extra: 'data' });
    });
  });

  describe('批量转换', () => {
    it('应该正确转换消息列表', () => {
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: '你是一个助手'
        },
        {
          role: 'user',
          content: '你好'
        },
        {
          role: 'assistant',
          content: '我是助手'
        }
      ];

      const baseMessages = converter.convertMessageList(messages);

      expect(baseMessages).toHaveLength(3);
      expect(baseMessages[0]).toBeInstanceOf(SystemMessage);
      expect(baseMessages[1]).toBeInstanceOf(HumanMessage);
      expect(baseMessages[2]).toBeInstanceOf(AIMessage);
    });

    it('应该正确从基础消息列表转换', () => {
      const baseMessages = [
        new SystemMessage('你是一个助手'),
        new HumanMessage('你好'),
        new AIMessage('我是助手')
      ];

      const llmMessages = converter.convertFromBaseList(baseMessages, 'llm');

      expect(llmMessages).toHaveLength(3);
      expect(llmMessages[0].role).toBe('system');
      expect(llmMessages[1].role).toBe('user');
      expect(llmMessages[2].role).toBe('assistant');
    });
  });

  describe('便捷方法', () => {
    it('应该创建系统消息', () => {
      const message = converter.createSystemMessage('系统指令');

      expect(message.role).toBe('system');
      expect(message.content).toBe('系统指令');
    });

    it('应该创建用户消息', () => {
      const message = converter.createUserMessage('用户输入');

      expect(message.role).toBe('user');
      expect(message.content).toBe('用户输入');
    });

    it('应该创建助手消息', () => {
      const message = converter.createAssistantMessage('助手回复');

      expect(message.role).toBe('assistant');
      expect(message.content).toBe('助手回复');
    });

    it('应该创建工具消息', () => {
      const message = converter.createToolMessage('工具结果', 'call_123');

      expect(message.role).toBe('tool');
      expect(message.content).toBe('工具结果');
      expect(message.tool_call_id).toBe('call_123');
    });
  });

  describe('工具调用检测', () => {
    it('应该检测LLMMessage中的工具调用', () => {
      const message: LLMMessage = {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'test_function',
              arguments: '{}'
            }
          }
        ]
      };

      expect(converter.hasToolCalls(message)).toBe(true);
    });

    it('应该检测AIMessage中的工具调用', () => {
      const message = new AIMessage('', 'assistant', [
        {
          id: 'call_123',
          type: 'function',
          function: {
            name: 'test_function',
            arguments: '{}'
          }
        }
      ]);

      expect(converter.hasToolCalls(message)).toBe(true);
    });

    it('应该正确处理没有工具调用的情况', () => {
      const message: LLMMessage = {
        role: 'user',
        content: '普通消息'
      };

      expect(converter.hasToolCalls(message)).toBe(false);
    });
  });

  describe('提供商注册', () => {
    it('应该能够注册和注销提供商', () => {
      const mockProvider = {
        convertRequest: jest.fn()
      };

      converter.registerProvider('test', mockProvider);
      expect(() => converter.fromBaseMessage(new HumanMessage('test'), 'dict', 'test')).not.toThrow();

      converter.unregisterProvider('test');
      // 注销后应该回退到默认行为
      const result = converter.fromBaseMessage(new HumanMessage('test'), 'dict', 'test');
      expect(result.content).toBe('test');
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的消息格式', () => {
      const invalidMessage = null;

      const result = converter.toBaseMessage(invalidMessage);

      expect(result).toBeInstanceOf(HumanMessage);
      expect(result.content).toBe('null');
    });

    it('应该处理空对象', () => {
      const emptyObject = {};

      const result = converter.toBaseMessage(emptyObject);

      expect(result).toBeInstanceOf(HumanMessage);
      expect(result.content).toBe('');
    });
  });
});