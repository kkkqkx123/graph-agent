/**
 * OpenAIResponseFormatter 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIResponseFormatter } from '../openai-response.js';
import type { LLMRequest, LLMMessage, ToolSchema } from '@modular-agent/types';
import type { FormatterConfig } from '../types.js';

describe('OpenAIResponseFormatter', () => {
  let formatter: OpenAIResponseFormatter;
  let mockConfig: FormatterConfig;

  beforeEach(() => {
    formatter = new OpenAIResponseFormatter();
    mockConfig = {
      profile: {
        id: 'test-profile-id',
        name: 'test-profile',
        provider: 'OPENAI_RESPONSE' as any,
        model: 'gpt-4o',
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
      expect(formatter.getSupportedProvider()).toBe('OPENAI_RESPONSE');
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

      expect(result.httpRequest.url).toBe('/responses');
      expect(result.httpRequest.method).toBe('POST');
      expect(result.httpRequest.headers).toHaveProperty('Content-Type');
      expect(result.httpRequest.headers['Content-Type']).toBe('application/json');
      expect(result.httpRequest.body).toHaveProperty('model');
      expect(result.httpRequest.body.model).toBe('gpt-4o');
      expect(result.httpRequest.body).toHaveProperty('input');
      expect(result.httpRequest.body.input).toHaveLength(1);
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
        object: 'response',
        created_at: 1677652288,
        model: 'gpt-4o',
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: 'Hello there!'
              }
            ]
          }
        ],
        status: 'completed',
        usage: {
          input_tokens: 9,
          output_tokens: 12,
          total_tokens: 21
        }
      };

      const result = formatter.parseResponse(data, mockConfig);

      expect(result.id).toBe('resp_123');
      expect(result.model).toBe('gpt-4o');
      expect(result.content).toBe('Hello there!');
      expect(result.message.role).toBe('assistant');
      expect(result.message.content).toBe('Hello there!');
      expect(result.usage?.promptTokens).toBe(9);
      expect(result.usage?.completionTokens).toBe(12);
      expect(result.usage?.totalTokens).toBe(21);
      expect(result.finishReason).toBe('completed');
      expect(result.metadata?.status).toBe('completed');
      expect(result.metadata?.created).toBe(1677652288);
    });

    it('应该解析工具调用响应', () => {
      const data = {
        id: 'resp_123',
        model: 'gpt-4o',
        output: [
          {
            content: [],
            tool_calls: [
              {
                id: 'call_abc123',
                type: 'function',
                name: 'test_tool',
                arguments: '{"param1": "value1"}'
              }
            ]
          }
        ],
        status: 'completed'
      };

      const result = formatter.parseResponse(data, mockConfig);

      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls?.[0]?.id).toBe('call_abc123');
      expect(result.toolCalls?.[0]?.type).toBe('function');
      expect(result.toolCalls?.[0]?.function.name).toBe('test_tool');
      expect(result.toolCalls?.[0]?.function.arguments).toBe('{"param1": "value1"}');
      expect(result.message.toolCalls).toBeDefined();
      expect(result.message.toolCalls).toHaveLength(1);
    });

    it('应该处理包含 previous_response_id 的响应', () => {
      const data = {
        id: 'resp_123',
        model: 'gpt-4o',
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: 'Response'
              }
            ]
          }
        ],
        status: 'completed',
        previous_response_id: 'resp_456'
      };

      const result = formatter.parseResponse(data, mockConfig);

      expect(result.metadata?.previousResponseId).toBe('resp_456');
    });

    it('应该处理空输出', () => {
      const data = {
        id: 'resp_123',
        model: 'gpt-4o',
        output: [],
        status: 'completed'
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
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: 'Hello'
              }
            ]
          }
        ],
        status: 'in_progress'
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.delta).toBe('Hello');
      expect(result.chunk.done).toBe(false);
      expect(result.chunk.raw).toBe(data);
    });

    it('应该解析流式结束', () => {
      const data = {
        id: 'resp_123',
        output: [],
        status: 'completed'
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.done).toBe(true);
      expect(result.chunk.finishReason).toBe('completed');
    });

    it('应该解析流式工具调用', () => {
      const data = {
        id: 'resp_123',
        output: [
          {
            content: [],
            tool_calls: [
              {
                id: 'call_abc123',
                type: 'function',
                name: 'test_tool',
                arguments: ''
              }
            ]
          }
        ],
        status: 'in_progress'
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.raw).toBeDefined();
      expect(result.chunk.raw).toEqual(data);
    });

    it('应该解析流式 usage', () => {
      const data = {
        id: 'resp_123',
        output: [],
        status: 'completed',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          total_tokens: 30
        }
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.usage?.promptTokens).toBe(10);
      expect(result.chunk.usage?.completionTokens).toBe(20);
      expect(result.chunk.usage?.totalTokens).toBe(30);
    });

    it('应该处理空输出', () => {
      const data = {
        id: 'resp_123',
        output: [],
        status: 'in_progress'
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.delta).toBe('');
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
      expect(converted[0]).toEqual({ role: 'user', content: 'Hello' });
      expect(converted[1]).toEqual({ role: 'assistant', content: 'Hi there!' });
    });

    it('应该转换工具调用消息', () => {
      const messages: LLMMessage[] = [
        {
          role: 'assistant',
          content: null,
          toolCalls: [
            {
              id: 'call_abc123',
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

      expect(converted[0]).toHaveProperty('tool_calls');
      expect(converted[0].tool_calls).toHaveLength(1);
      expect(converted[0].tool_calls[0].id).toBe('call_abc123');
      expect(converted[0].tool_calls[0].function.name).toBe('test_tool');
    });

    it('应该转换工具响应消息', () => {
      const messages: LLMMessage[] = [
        {
          role: 'tool',
          content: 'Tool result',
          toolCallId: 'call_abc123'
        }
      ];

      const converted = formatter.convertMessages(messages);

      expect(converted[0]).toHaveProperty('tool_call_id');
      expect(converted[0].tool_call_id).toBe('call_abc123');
    });
  });

  describe('parseToolCalls', () => {
    it('应该解析工具调用', () => {
      const toolCalls = [
        {
          id: 'call_abc123',
          type: 'function',
          function: {
            name: 'test_tool',
            arguments: '{"param1": "value1"}'
          }
        }
      ];

      const parsed = formatter.parseToolCalls(toolCalls);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('call_abc123');
      expect(parsed[0].type).toBe('function');
      expect(parsed[0].function.name).toBe('test_tool');
      expect(parsed[0].function.arguments).toBe('{"param1": "value1"}');
    });

    it('应该处理对象类型的 arguments', () => {
      const toolCalls = [
        {
          id: 'call_abc123',
          type: 'function',
          function: {
            name: 'test_tool',
            arguments: { param1: 'value1' }
          }
        }
      ];

      const parsed = formatter.parseToolCalls(toolCalls);

      expect(parsed[0].function.arguments).toBe('{"param1":"value1"}');
    });

    it('应该默认 type 为 function', () => {
      const toolCalls = [
        {
          id: 'call_abc123',
          function: {
            name: 'test_tool',
            arguments: '{}'
          }
        }
      ];

      const parsed = formatter.parseToolCalls(toolCalls);

      expect(parsed[0].type).toBe('function');
    });
  });
});
