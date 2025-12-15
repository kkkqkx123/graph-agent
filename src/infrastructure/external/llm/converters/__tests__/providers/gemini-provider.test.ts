/**
 * Gemini提供商转换器测试
 */

import { GeminiProvider } from '../../providers/gemini-provider';
import { LLMMessage } from '../../../../../../domain/llm/entities/llm-request';

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    provider = new GeminiProvider();
  });

  describe('基础功能', () => {
    it('应该返回正确的提供商名称', () => {
      expect(provider.getName()).toBe('gemini');
    });

    it('应该返回默认模型', () => {
      expect(provider.getDefaultModel()).toBe('gemini-1.5-pro');
    });

    it('应该返回支持的模型列表', () => {
      const models = provider.getSupportedModels();
      expect(models).toContain('gemini-1.5-pro');
      expect(models).toContain('gemini-1.5-flash');
      expect(models).toContain('gemini-1.0-pro');
    });
  });

  describe('请求转换', () => {
    it('应该正确转换基本消息', () => {
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: '你是一个助手'
        },
        {
          role: 'user',
          content: '你好'
        }
      ];

      const parameters = {
        model: 'gemini-1.5-pro'
      };

      const result = provider.convertRequest(messages, parameters);

      expect(result).toBeDefined();
      expect(result['contents']).toBeDefined();
      expect(result['contents']).toHaveLength(2);
      // Gemini将系统消息转换为用户消息
      expect(result['contents'][0]['role']).toBe('user');
      expect(result['contents'][1]['role']).toBe('user');
    });

    it('应该处理工具调用消息', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: '获取天气信息'
        },
        {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: JSON.stringify({ city: '北京' })
              }
            }
          ]
        }
      ];

      const parameters = {
        model: 'gemini-1.5-pro'
      };

      const result = provider.convertRequest(messages, parameters);

      expect(result['contents'][1]['role']).toBe('model');
      expect(result['contents'][1]['parts']).toBeDefined();
    });

    it('应该处理可选参数', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: '测试消息'
        }
      ];

      const parameters = {
        model: 'gemini-1.5-pro',
        temperature: 0.8,
        top_p: 0.9,
        top_k: 40,
        max_tokens: 100
      };

      const result = provider.convertRequest(messages, parameters);

      expect(result['generationConfig']).toBeDefined();
      expect(result['generationConfig']['temperature']).toBe(0.8);
      expect(result['generationConfig']['topP']).toBe(0.9);
      expect(result['generationConfig']['topK']).toBe(40);
      expect(result['generationConfig']['maxOutputTokens']).toBe(100);
    });

    it('应该处理工具配置', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: '使用工具'
        }
      ];

      const parameters = {
        model: 'gemini-1.5-pro',
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
      expect(result['tool_config']).toEqual({ mode: 'AUTO' });
    });

    it('应该处理多模态内容', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: JSON.stringify([
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
          ])
        }
      ];

      const parameters = {
        model: 'gemini-1.5-pro'
      };

      const result = provider.convertRequest(messages, parameters);

      expect(result['contents'][0]['parts']).toBeDefined();
      expect(result['contents'][0]['parts'].length).toBe(2);
      expect(result['contents'][0]['parts'][0]['text']).toBe('描述这张图片');
      expect(result['contents'][0]['parts'][1]['inline_data']).toBeDefined();
    });
  });

  describe('响应转换', () => {
    it('应该正确转换基本响应', () => {
      const response = {
        candidates: [
          {
            content: {
              parts: [
                { text: '你好，我是Gemini' }
              ]
            }
          }
        ]
      };

      const result = provider.convertResponse(response);

      expect(result).toBeDefined();
      expect(result.role).toBe('assistant');
      expect(result.content).toBe('你好，我是Gemini');
    });

    it('应该处理工具调用响应', () => {
      const response = {
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'test_function',
                    args: { param: 'value' }
                  }
                }
              ]
            }
          }
        ]
      };

      const result = provider.convertResponse(response);

      expect(result.tool_calls).toBeDefined();
      expect(result.tool_calls).toHaveLength(1);
      expect(result.tool_calls[0].function.name).toBe('test_function');
    });

    it('应该处理流式响应', () => {
      const events = [
        {
          candidates: [
            {
              content: {
                parts: [
                  { text: '你好' }
                ]
              }
            }
          ]
        },
        {
          candidates: [
            {
              content: {
                parts: [
                  { text: '，世界' }
                ]
              }
            }
          ]
        }
      ];

      const result = provider.convertStreamResponse(events);

      expect(result).toBeDefined();
      expect(result.candidates).toBeDefined();
      expect(result.candidates[0].content.parts[0].text).toBe('你好，世界');
    });

    it('应该处理流式工具调用', () => {
      const events = [
        {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'test_function',
                      args: { param: 'value' }
                    }
                  }
                ]
              }
            }
          ]
        }
      ];

      const result = provider.convertStreamResponse(events);

      expect(result.candidates[0].content.parts[0].functionCall).toBeDefined();
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
        model: 'gemini-1.5-pro'
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
        candidates: []
      };

      expect(() => {
        provider.convertResponse(response);
      }).toThrow('响应中没有candidates字段');
    });
  });
});