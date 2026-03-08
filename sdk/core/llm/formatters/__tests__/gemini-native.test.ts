/**
 * GeminiNativeFormatter 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GeminiNativeFormatter } from '../gemini-native.js';
import type { LLMRequest, LLMMessage, ToolSchema } from '@modular-agent/types';
import type { FormatterConfig } from '../types.js';

describe('GeminiNativeFormatter', () => {
  let formatter: GeminiNativeFormatter;
  let mockConfig: FormatterConfig;

  beforeEach(() => {
    formatter = new GeminiNativeFormatter();
    mockConfig = {
      profile: {
        id: 'test-profile-id',
        name: 'test-profile',
        provider: 'GEMINI_NATIVE' as any,
        model: 'gemini-2.5-pro-preview-03-25',
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
      expect(formatter.getSupportedProvider()).toBe('GEMINI_NATIVE');
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

      expect(result.httpRequest.url).toBe('/models/gemini-2.5-pro-preview-03-25:generateContent');
      expect(result.httpRequest.method).toBe('POST');
      expect(result.httpRequest.headers).toHaveProperty('Content-Type');
      expect(result.httpRequest.headers['Content-Type']).toBe('application/json');
      expect(result.httpRequest.body).toHaveProperty('contents');
      expect(result.httpRequest.body.contents).toHaveLength(1);
      expect(result.httpRequest.body).toHaveProperty('generationConfig');
      expect(result.httpRequest.body.generationConfig.temperature).toBe(0.7);
      expect(result.httpRequest.query?.key).toBe('test-api-key');
    });

    it('应该包含 x-goog-api-key 认证头', () => {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const result = formatter.buildRequest(request, mockConfig);

      expect(result.httpRequest.headers).toHaveProperty('x-goog-api-key');
      expect(result.httpRequest.headers['x-goog-api-key']).toBe('test-api-key');
    });

    it('应该使用 Bearer 认证头', () => {
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

    it('应该处理系统消息', () => {
      const request: LLMRequest = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello' }
        ]
      };

      const result = formatter.buildRequest(request, mockConfig);

      expect(result.httpRequest.body).toHaveProperty('systemInstruction');
      expect(result.httpRequest.body.systemInstruction).toEqual({
        parts: [{ text: 'You are a helpful assistant.' }]
      });
      expect(result.httpRequest.body.contents).toHaveLength(1);
      expect(result.httpRequest.body.contents[0].role).toBe('user');
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

      expect(result.httpRequest.body.generationConfig.temperature).toBe(0.8);
      expect(result.httpRequest.body.generationConfig.maxOutputTokens).toBe(2000);
      expect(result.httpRequest.body.generationConfig.topP).toBe(0.9);
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
      expect(result.httpRequest.body.tools[0]).toHaveProperty('functionDeclarations');
      expect(result.httpRequest.body.tools[0].functionDeclarations).toHaveLength(1);
      expect(result.httpRequest.body.tools[0].functionDeclarations[0].name).toBe('test_tool');
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

      expect(result.httpRequest.url).toContain('streamGenerateContent');
      expect(result.httpRequest.query?.alt).toBe('sse');
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

    it('应该合并查询参数', () => {
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

      expect(result.httpRequest.query?.key1).toBe('value1');
      expect(result.httpRequest.query?.key2).toBe('value2');
      expect(result.httpRequest.query?.key).toBe('test-api-key');
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

    it('应该处理对象类型的系统消息', () => {
      const request: LLMRequest = {
        messages: [
          {
            role: 'system',
            content: [
              {
                type: 'text',
                text: 'System message'
              }
            ]
          },
          { role: 'user', content: 'Hello' }
        ]
      };

      const result = formatter.buildRequest(request, mockConfig);

      expect(result.httpRequest.body.systemInstruction).toEqual({
        parts: [{ text: '[{"type":"text","text":"System message"}]' }]
      });
    });
  });

  describe('parseResponse', () => {
    it('应该解析基本的响应', () => {
      const data = {
        id: 'resp_123',
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
      expect(result.model).toBe('gemini-2.5-pro-preview-03-25');
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

    it('应该解析思考内容', () => {
      const data = {
        id: 'resp_123',
        candidates: [
          {
            content: {
              parts: [
                {
                  thought: true,
                  text: 'Thinking process...'
                },
                {
                  text: 'Final answer'
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

      expect(result.reasoningContent).toBe('Thinking process...');
      expect(result.content).toBe('Thinking process...Final answer');
    });

    it('应该处理没有候选的响应', () => {
      const data = {
        id: 'resp_123',
        candidates: []
      };

      expect(() => formatter.parseResponse(data, mockConfig)).toThrow('No candidate in response');
    });
  });

  describe('parseStreamLine', () => {
    it('应该跳过空行', () => {
      const result = formatter.parseStreamLine('', mockConfig);
      expect(result.valid).toBe(false);
      expect(result.chunk.done).toBe(false);
    });

    it('应该解析 JSON 行', () => {
      const line = '{"candidates":[{"finishReason":"STOP","content":{"parts":[{"text":"Hello"}]}}]}';
      const result = formatter.parseStreamLine(line, mockConfig);
      expect(result.valid).toBe(true);
      expect(result.chunk.delta).toBe('Hello');
    });

    it('应该跳过无效的 JSON', () => {
      const line = '{invalid json}';
      const result = formatter.parseStreamLine(line, mockConfig);
      expect(result.valid).toBe(false);
    });
  });

  describe('parseStreamChunk', () => {
    it('应该解析文本增量', () => {
      const data = {
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

    it('应该解析思考内容增量', () => {
      const data = {
        candidates: [
          {
            content: {
              parts: [
                {
                  thought: true,
                  text: 'Thinking...'
                }
              ]
            },
            finishReason: 'STOP'
          }
        ]
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.reasoningDelta).toBe('Thinking...');
    });

    it('应该解析 usage', () => {
      const data = {
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
      expect(converted[0].parts).toEqual([{ text: 'Hello' }]);
      expect(converted[1].role).toBe('model');
      expect(converted[1].parts).toEqual([{ text: 'Hi there!' }]);
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
      expect(converted[0].parts).toHaveLength(1);
      expect(converted[0].parts[0].functionCall).toEqual({
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
      expect(converted[0].parts).toHaveLength(1);
      expect(converted[0].parts[0].functionResponse).toEqual({
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

      expect(converted[0].parts).toEqual([
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
