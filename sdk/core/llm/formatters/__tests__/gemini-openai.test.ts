/**
 * GeminiOpenAIFormatter 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GeminiOpenAIFormatter } from '../gemini-openai.js';
import type { LLMRequest, LLMMessage, ToolSchema } from '@modular-agent/types';
import type { FormatterConfig } from '../types.js';

describe('GeminiOpenAIFormatter', () => {
  let formatter: GeminiOpenAIFormatter;
  let mockConfig: FormatterConfig;

  beforeEach(() => {
    formatter = new GeminiOpenAIFormatter();
    mockConfig = {
      profile: {
        id: 'test-profile-id',
        name: 'test-profile',
        provider: 'GEMINI_OPENAI' as any,
        model: 'gemini-2.5-pro',
        apiKey: 'test-api-key',
        parameters: {
          temperature: 0.7,
          max_tokens: 2000
        }
      }
    };
  });

  describe('getSupportedProvider', () => {
    it('应该返回正确的提供商类型', () => {
      expect(formatter.getSupportedProvider()).toBe('GEMINI_OPENAI');
    });
  });

  describe('buildRequest', () => {
    it('应该构建基本的请求', () => {
      const request: LLMRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const result = formatter.buildRequest(request, mockConfig);

      expect(result.httpRequest.url).toBe('/chat/completions');
      expect(result.httpRequest.method).toBe('POST');
      expect(result.httpRequest.headers).toHaveProperty('Content-Type');
      expect(result.httpRequest.headers['Content-Type']).toBe('application/json');
      expect(result.httpRequest.body).toHaveProperty('model');
      expect(result.httpRequest.body.model).toBe('gemini-2.5-pro');
      expect(result.httpRequest.body).toHaveProperty('messages');
      expect(result.httpRequest.body.messages).toHaveLength(1);
      expect(result.httpRequest.body.stream).toBe(false);
    });

    it('应该包含 Bearer 认证头', () => {
      const config = {
        ...mockConfig,
        authType: 'bearer' as const
      };
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const result = formatter.buildRequest(request, config);

      expect(result.httpRequest.headers).toHaveProperty('Authorization');
      expect(result.httpRequest.headers['Authorization']).toBe('Bearer test-api-key');
    });

    it('应该使用原生认证头', () => {
      const config = {
        ...mockConfig,
        authType: 'native' as const
      };
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const result = formatter.buildRequest(request, config);

      expect(result.httpRequest.headers).toHaveProperty('Authorization');
      expect(result.httpRequest.headers['Authorization']).toBe('test-api-key');
    });

    it('应该合并 profile 和 request 的参数', () => {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        parameters: {
          temperature: 0.8,
          top_p: 0.9
        }
      };

      const result = formatter.buildRequest(request, mockConfig);

      expect(result.httpRequest.body.temperature).toBe(0.8);
      expect(result.httpRequest.body.max_tokens).toBe(2000);
      expect(result.httpRequest.body.top_p).toBe(0.9);
    });

    it('应该添加工具定义', () => {
      const tools: ToolSchema[] = [
        {
          id: 'test_tool',
          description: 'Test tool',
          parameters: {
            type: 'object',
            properties: {
              param1: { type: 'string' }
            }
          }
        }
      ];

      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        tools
      };

      const result = formatter.buildRequest(request, mockConfig);

      expect(result.httpRequest.body).toHaveProperty('tools');
      expect(result.httpRequest.body.tools).toHaveLength(1);
      expect(result.httpRequest.body.tools[0]).toHaveProperty('type');
      expect(result.httpRequest.body.tools[0].type).toBe('function');
      expect(result.httpRequest.body.tools[0].function).toHaveProperty('name');
      expect(result.httpRequest.body.tools[0].function.name).toBe('test_tool');
    });

    it('应该处理流式请求', () => {
      const config = {
        ...mockConfig,
        stream: true
      };
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const result = formatter.buildRequest(request, config);

      expect(result.httpRequest.body.stream).toBe(true);
    });

    it('应该添加自定义请求头', () => {
      const config = {
        ...mockConfig,
        customHeaders: {
          'X-Custom-Header': 'custom-value'
        }
      };
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const result = formatter.buildRequest(request, config);

      expect(result.httpRequest.headers).toHaveProperty('X-Custom-Header');
      expect(result.httpRequest.headers['X-Custom-Header']).toBe('custom-value');
    });

    it('应该添加自定义请求体', () => {
      const config = {
        ...mockConfig,
        customBody: {
          custom_param: 'custom_value'
        }
      };
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const result = formatter.buildRequest(request, config);

      expect(result.httpRequest.body).toHaveProperty('custom_param');
      expect(result.httpRequest.body.custom_param).toBe('custom_value');
    });

    it('应该添加查询参数', () => {
      const config = {
        ...mockConfig,
        queryParams: {
          key1: 'value1',
          key2: 'value2'
        }
      };
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const result = formatter.buildRequest(request, config);

      expect(result.httpRequest.url).toContain('?key1=value1&key2=value2');
    });

    it('应该处理超时设置', () => {
      const config = {
        ...mockConfig,
        timeout: 30000
      };
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const result = formatter.buildRequest(request, config);

      expect(result.httpRequest.timeout).toBe(30000);
    });

    it('应该合并 profile headers', () => {
      const config = {
        ...mockConfig,
        profile: {
          ...mockConfig.profile,
          headers: {
            'X-Profile-Header': 'profile-value'
          }
        }
      };
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const result = formatter.buildRequest(request, config);

      expect(result.httpRequest.headers).toHaveProperty('X-Profile-Header');
      expect(result.httpRequest.headers['X-Profile-Header']).toBe('profile-value');
    });
  });

  describe('parseResponse', () => {
    it('应该解析基本的响应', () => {
      const data = {
        id: 'resp_123',
        model: 'gemini-2.5-pro',
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Hello there!'
                }
              ],
              role: 'model'
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: [
              {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                probability: 'NEGLIGIBLE'
              }
            ]
          }
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30
        }
      };

      const result = formatter.parseResponse(data, mockConfig);

      expect(result.id).toBe('resp_123');
      expect(result.model).toBe('gemini-2.5-pro');
      expect(result.content).toBe('Hello there!');
      expect(result.message.role).toBe('assistant');
      expect(result.message.content).toBe('Hello there!');
      expect(result.usage?.promptTokens).toBe(10);
      expect(result.usage?.completionTokens).toBe(20);
      expect(result.usage?.totalTokens).toBe(30);
      expect(result.finishReason).toBe('STOP');
      expect(result.metadata?.finishReason).toBe('STOP');
      expect(result.metadata?.safetyRatings).toBeDefined();
    });

    it('应该解析工具调用响应', () => {
      const data = {
        id: 'resp_123',
        model: 'gemini-2.5-pro',
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'test_tool',
                    args: {
                      param1: 'value1'
                    }
                  }
                }
              ],
              role: 'model'
            },
            finishReason: 'STOP',
            index: 0
          }
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30
        }
      };

      const result = formatter.parseResponse(data, mockConfig);

      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls?.[0]?.type).toBe('function');
      expect(result.toolCalls?.[0]?.function.name).toBe('test_tool');
      expect(JSON.parse(result.toolCalls![0]!.function.arguments)).toEqual({
        param1: 'value1'
      });
      expect(result.message.toolCalls).toBeDefined();
      expect(result.message.toolCalls).toHaveLength(1);
    });

    it('应该处理没有候选的响应', () => {
      const data = {
        id: 'resp_123',
        model: 'gemini-2.5-pro',
        candidates: []
      };

      expect(() => formatter.parseResponse(data, mockConfig)).toThrow('No candidate in response');
    });

    it('应该处理空输出', () => {
      const data = {
        id: 'resp_123',
        model: 'gemini-2.5-pro',
        candidates: [
          {
            content: {
              parts: [],
              role: 'model'
            },
            finishReason: 'STOP',
            index: 0
          }
        ]
      };

      const result = formatter.parseResponse(data, mockConfig);

      expect(result.content).toBe('');
      expect(result.message.content).toBe('');
    });
  });

  describe('parseStreamChunk', () => {
    it('应该解析文本增量', () => {
      const data = {
        id: 'resp_123',
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Hello'
                }
              ]
            },
            finishReason: 'STOP'
          }
        ]
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.delta).toBe('Hello');
      expect(result.chunk.done).toBe(true);
      expect(result.chunk.raw).toBe(data);
    });

    it('应该解析工具调用增量', () => {
      const data = {
        id: 'resp_123',
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'test_tool',
                    args: {}
                  }
                }
              ]
            },
            finishReason: 'STOP'
          }
        ]
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.raw).toBeDefined();
      expect(result.chunk.raw).toEqual(data);
    });

    it('应该解析 usage', () => {
      const data = {
        id: 'resp_123',
        candidates: [
          {
            content: {
              parts: []
            },
            finishReason: 'STOP'
          }
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30
        }
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.usage?.promptTokens).toBe(10);
      expect(result.chunk.usage?.completionTokens).toBe(20);
      expect(result.chunk.usage?.totalTokens).toBe(30);
    });

    it('应该处理没有候选的流式块', () => {
      const data = {
        id: 'resp_123',
        candidates: []
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.chunk.done).toBe(false);
    });
  });

  describe('convertMessages', () => {
    it('应该转换基本消息', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];

      const converted = formatter.convertMessages(messages);

      expect(converted).toHaveLength(2);
      expect(converted[0].role).toBe('user');
      expect(converted[0].content).toEqual([{ text: 'Hello' }]);
      expect(converted[1].role).toBe('model');
      expect(converted[1].content).toEqual([{ text: 'Hi there!' }]);
    });

    it('应该过滤系统消息', () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'Hello' }
      ];

      const converted = formatter.convertMessages(messages);

      expect(converted).toHaveLength(1);
      expect(converted[0].role).toBe('user');
    });

    it('应该转换工具调用消息', () => {
      const messages: LLMMessage[] = [
        {
          role: 'assistant',
          content: null,
          toolCalls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'test_tool',
                arguments: '{"param1": "value1"}'
              }
            }
          ]
        }
      ];

      const converted = formatter.convertMessages(messages);

      expect(converted[0].role).toBe('model');
      expect(converted[0].content).toHaveLength(1);
      expect(converted[0].content[0].functionCall).toEqual({
        name: 'test_tool',
        args: { param1: 'value1' }
      });
    });

    it('应该转换工具响应消息', () => {
      const messages: LLMMessage[] = [
        {
          role: 'tool',
          content: 'Tool result',
          toolCallId: 'call_123'
        }
      ];

      const converted = formatter.convertMessages(messages);

      expect(converted[0].role).toBe('user');
      expect(converted[0].content).toHaveLength(1);
      expect(converted[0].content[0].functionResponse).toEqual({
        name: 'call_123',
        response: {
          result: 'Tool result'
        }
      });
    });

    it('应该处理数组类型的内容', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: [
            { text: 'Hello' },
            { inlineData: { mimeType: 'image/png', data: 'base64data' } }
          ]
        }
      ];

      const converted = formatter.convertMessages(messages);

      expect(converted[0].content).toEqual([
        { text: 'Hello' },
        { inlineData: { mimeType: 'image/png', data: 'base64data' } }
      ]);
    });
  });

  describe('parseToolCalls', () => {
    it('应该解析工具调用', () => {
      const toolCalls = [
        {
          id: 'call_123',
          functionCall: {
            name: 'test_tool',
            args: {
              param1: 'value1'
            }
          }
        }
      ];

      const parsed = formatter.parseToolCalls(toolCalls);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe('function');
      expect(parsed[0].function.name).toBe('test_tool');
      expect(JSON.parse(parsed[0].function.arguments)).toEqual({ param1: 'value1' });
    });

    it('应该处理字符串类型的 args', () => {
      const toolCalls = [
        {
          id: 'call_123',
          functionCall: {
            name: 'test_tool',
            args: { param1: 'value1' }
          }
        }
      ];

      const parsed = formatter.parseToolCalls(toolCalls);

      expect(parsed[0].function.arguments).toBe('{"param1":"value1"}');
    });

    it('应该处理没有 functionCall 的工具调用', () => {
      const toolCalls = [
        {
          id: 'call_123',
          name: 'test_tool',
          args: {}
        }
      ];

      const parsed = formatter.parseToolCalls(toolCalls);

      expect(parsed[0].function.name).toBe('test_tool');
    });

    it('应该处理没有 id 的工具调用', () => {
      const toolCalls = [
        {
          functionCall: {
            name: 'test_tool',
            args: {}
          }
        }
      ];

      const parsed = formatter.parseToolCalls(toolCalls);

      expect(parsed[0].id).toBeDefined();
      expect(parsed[0].function.name).toBe('test_tool');
    });

    it('应该处理 null 输入', () => {
      const parsed = formatter.parseToolCalls(null);

      expect(parsed).toEqual([]);
    });

    it('应该处理空数组', () => {
      const parsed = formatter.parseToolCalls([]);

      expect(parsed).toEqual([]);
    });
  });
});
