/**
 * OpenAI提供商转换器测试
 */

import { OpenAIProvider } from '../../providers/openai-provider';
import { LLMMessage, LLMMessageRole } from '../../../../../domain/llm/value-objects/llm-message';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider();
  });

  describe('基础功能', () => {
    it('应该返回正确的提供商名称', () => {
      expect(provider.getName()).toBe('openai');
    });

    it('应该返回默认模型', () => {
      expect(provider.getDefaultModel()).toBe('gpt-3.5-turbo');
    });

    it('应该返回支持的模型列表', () => {
      const models = provider.getSupportedModels();
      expect(models).toContain('gpt-3.5-turbo');
      expect(models).toContain('gpt-4');
      expect(models).toContain('gpt-4o');
    });
  });

  describe('请求转换', () => {
    it('应该正确转换基本消息', () => {
      const messages: LLMMessage[] = [
        LLMMessage.createSystem('你是一个助手'),
        LLMMessage.createUser('你好')
      ];

      const parameters = {
        model: 'gpt-3.5-turbo'
      };

      const result = provider.convertRequest(messages, parameters);

      expect(result).toBeDefined();
      expect(result['model']).toBe('gpt-3.5-turbo');
      expect(result['messages']).toHaveLength(2);
      expect(result['messages'][0]['role']).toBe('system');
      expect(result['messages'][0]['content']).toBe('你是一个助手');
      expect(result['messages'][1]['role']).toBe('user');
      expect(result['messages'][1]['content']).toBe('你好');
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
        model: 'gpt-3.5-turbo'
      };

      const result = provider.convertRequest(messages, parameters);

      expect(result['messages'][1]['tool_calls']).toBeDefined();
      expect(result['messages'][1]['tool_calls']).toHaveLength(1);
      expect(result['messages'][1]['tool_calls'][0]['function']['name']).toBe('get_weather');
    });

    it('应该处理可选参数', () => {
      const messages: LLMMessage[] = [
        LLMMessage.createUser('测试消息')
      ];

      const parameters = {
        model: 'gpt-3.5-turbo',
        temperature: 0.8,
        max_tokens: 100,
        top_p: 0.9
      };

      const result = provider.convertRequest(messages, parameters);

      expect(result['temperature']).toBe(0.8);
      expect(result['max_tokens']).toBe(100);
      expect(result['top_p']).toBe(0.9);
    });

    it('应该处理特殊参数', () => {
      const messages: LLMMessage[] = [
        LLMMessage.createUser('测试消息')
      ];

      const parameters = {
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        reasoning_effort: 'high'
      };

      const result = provider.convertRequest(messages, parameters);

      expect(result['response_format']).toEqual({ type: 'json_object' });
      expect(result['reasoning_effort']).toBe('high');
    });

    it('应该处理工具配置', () => {
      const messages: LLMMessage[] = [
        LLMMessage.createUser('使用工具')
      ];

      const parameters = {
        model: 'gpt-3.5-turbo',
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
      expect(result['tool_choice']).toBe('auto');
    });
  });

  describe('响应转换', () => {
    it('应该正确转换基本响应', () => {
      const response = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: '你好，我是助手'
            }
          }
        ]
      };

      const result = provider.convertResponse(response);

      expect(result).toBeDefined();
      expect(result.getRole()).toBe('assistant');
      expect(result.getContent()).toBe('你好，我是助手');
    });

    it('应该处理工具调用响应', () => {
      const response = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: '',
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
            }
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
          choices: [
            {
              delta: {
                content: '你好'
              }
            }
          ]
        },
        {
          choices: [
            {
              delta: {
                content: '，世界'
              }
            }
          ]
        }
      ];

      const result = provider.convertStreamResponse(events);

      expect(result).toBeDefined();
      expect(result.getContent()).toBe('你好，世界');
    });

    it('应该处理流式工具调用', () => {
      const events = [
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_123',
                    function: {
                      name: 'test_function',
                      arguments: JSON.stringify({ param: 'value' })
                    }
                  }
                ]
              }
            }
          ]
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
        model: 'gpt-3.5-turbo'
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
        choices: []
      };

      expect(() => {
        provider.convertResponse(response);
      }).toThrow('响应中没有choices字段');
    });
  });
});