/**
 * Anthropic提供商转换器测试
 */

import { AnthropicProvider } from '../../providers/anthropic-provider';
import { LLMMessage, LLMMessageRole } from '../../../../../domain/llm/value-objects/llm-message';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
  });

  describe('基础功能', () => {
    it('应该返回正确的提供商名称', () => {
      expect(provider.getName()).toBe('anthropic');
    });

    it('应该返回默认模型', () => {
      expect(provider.getDefaultModel()).toBe('claude-3-sonnet-20240229');
    });

    it('应该返回支持的模型列表', () => {
      const models = provider.getSupportedModels();
      expect(models).toContain('claude-3-opus-20240229');
      expect(models).toContain('claude-3-sonnet-20240229');
      expect(models).toContain('claude-3-haiku-20240307');
    });
  });

  describe('请求转换', () => {
    it('应该正确转换基本消息', () => {
      const messages: LLMMessage[] = [
        LLMMessage.createSystem('你是一个助手'),
        LLMMessage.createUser('你好')
      ];

      const parameters = {
        model: 'claude-3-sonnet-20240229'
      };

      const result = provider.convertRequest(messages, parameters);

      expect(result).toBeDefined();
      expect(result['model']).toBe('claude-3-sonnet-20240229');
      expect(result['messages']).toHaveLength(2);
      // Anthropic将系统消息转换为用户消息
      expect(result['messages'][0]['role']).toBe('user');
      expect(result['messages'][1]['role']).toBe('user');
    });

    it('应该处理工具调用消息', () => {
      const messages: LLMMessage[] = [
        LLMMessage.createUser('获取天气信息'),
        LLMMessage.fromInterface({
          role: LLMMessageRole.ASSISTANT,
          content: '',
          toolCalls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: JSON.stringify({ city: '北京' })
              }
            }
          ]
        })
      ];

      const parameters = {
        model: 'claude-3-sonnet-20240229'
      };

      const result = provider.convertRequest(messages, parameters);

      expect(result['messages'][1]['role']).toBe('assistant');
      expect(result['messages'][1]['content']).toBeDefined();
    });

    it('应该处理可选参数', () => {
      const messages: LLMMessage[] = [
        LLMMessage.createUser('测试消息')
      ];

      const parameters = {
        model: 'claude-3-sonnet-20240229',
        temperature: 0.8,
        max_tokens: 100,
        top_p: 0.9
      };

      const result = provider.convertRequest(messages, parameters);

      expect(result['temperature']).toBe(0.8);
      expect(result['max_tokens']).toBe(100);
      expect(result['top_p']).toBe(0.9);
    });

    it('应该处理工具配置', () => {
      const messages: LLMMessage[] = [
        LLMMessage.createUser('使用工具')
      ];

      const parameters = {
        model: 'claude-3-sonnet-20240229',
        tools: [
          {
            type: 'function',
            function: {
              name: 'test_tool',
              description: '测试工具',
              parameters: {
                type: 'object',
                properties: {
                  param: { type: 'string' }
                }
              }
            }
          }
        ],
        tool_choice: 'auto'
      };

      const result = provider.convertRequest(messages, parameters);

      expect(result['tools']).toBeDefined();
      expect(result['tools']).toHaveLength(1);
      expect(result['tool_choice']).toEqual({ type: 'auto' });
    });

    it('应该处理多模态内容', () => {
      const messages: LLMMessage[] = [
        LLMMessage.createUser(JSON.stringify([
          {
            type: 'text',
            text: '描述这张图片'
          },
          {
            type: 'image',
            source: {
              media_type: 'image/jpeg',
              data: 'base64encodedimagedata'
            }
          }
        ]))
      ];

      const parameters = {
        model: 'claude-3-sonnet-20240229'
      };

      const result = provider.convertRequest(messages, parameters);

      expect(result['messages'][0]['content']).toBeDefined();
      expect(Array.isArray(result['messages'][0]['content'])).toBe(true);
      expect(result['messages'][0]['content'].length).toBe(2);
    });
  });

  describe('响应转换', () => {
    it('应该正确转换基本响应', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '你好，我是Claude'
          }
        ]
      };

      const result = provider.convertResponse(response);

      expect(result).toBeDefined();
      expect(result.getRole()).toBe('assistant');
      expect(result.getContent()).toBe('你好，我是Claude');
    });

    it('应该处理工具调用响应', () => {
      const response = {
        content: [
          {
            type: 'tool_use',
            id: 'call_123',
            name: 'test_function',
            input: { param: 'value' }
          }
        ]
      };

      const result = provider.convertResponse(response);

      expect(result.getToolCalls()).toBeDefined();
      expect(result.getToolCalls()).toHaveLength(1);
      expect(result.getToolCalls()[0].function.name).toBe('test_function');
    });

    it('应该处理流式响应', () => {
      const events = [
        {
          delta: {
            text: '你好'
          }
        },
        {
          delta: {
            text: '，世界'
          }
        }
      ];

      const result = provider.convertStreamResponse(events);

      expect(result).toBeDefined();
      expect(result.getContent()).toBe('你好，世界');
    });

    it('应该处理流式工具调用', () => {
      const events = [
        {
          delta: {
            tool_use: {
              id: 'call_123',
              name: 'test_function',
              input: { param: 'value' }
            }
          }
        }
      ];

      const result = provider.convertStreamResponse(events);

      expect(result.getToolCalls()).toBeDefined();
      expect(result.getToolCalls()).toHaveLength(1);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的消息格式', () => {
      const messages = [
        {
          role: 'invalid',
          content: '测试消息'
        }
      ] as any;

      const parameters = {
        model: 'claude-3-sonnet-20240229'
      };

      expect(() => {
        provider.convertRequest(messages, parameters);
      }).toThrow();
    });

    it('应该处理无效的响应格式', () => {
      const response = {
        invalid: 'format'
      };

      expect(() => {
        provider.convertResponse(response);
      }).toThrow();
    });

    it('应该处理空响应', () => {
      const response = {
        content: []
      };

      expect(() => {
        provider.convertResponse(response);
      }).toThrow();
    });
  });
});