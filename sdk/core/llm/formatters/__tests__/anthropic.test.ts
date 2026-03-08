/**
 * AnthropicFormatter 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnthropicFormatter } from '../anthropic.js';
import type { LLMRequest, LLMMessage, ToolSchema } from '@modular-agent/types';
import type { FormatterConfig } from '../types.js';

describe('AnthropicFormatter', () => {
  let formatter: AnthropicFormatter;
  let mockConfig: FormatterConfig;

  beforeEach(() => {
    formatter = new AnthropicFormatter();
    mockConfig = {
      profile: {
        id: 'test-profile-id',
        name: 'test-profile',
        provider: 'ANTHROPIC' as any,
        model: 'claude-3-5-sonnet-20241022',
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
      expect(formatter.getSupportedProvider()).toBe('ANTHROPIC');
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

      expect(result.httpRequest.url).toBe('/v1/messages');
      expect(result.httpRequest.method).toBe('POST');
      expect(result.httpRequest.headers).toHaveProperty('Content-Type');
      expect(result.httpRequest.headers['Content-Type']).toBe('application/json');
      expect(result.httpRequest.headers).toHaveProperty('anthropic-version');
      expect(result.httpRequest.headers['anthropic-version']).toBe('2023-06-01');
      expect(result.httpRequest.headers).toHaveProperty('anthropic-dangerous-direct-browser-access');
      expect(result.httpRequest.headers['anthropic-dangerous-direct-browser-access']).toBe('false');
      expect(result.httpRequest.body).toHaveProperty('model');
      expect(result.httpRequest.body.model).toBe('claude-3-5-sonnet-20241022');
      expect(result.httpRequest.body).toHaveProperty('messages');
      expect(result.httpRequest.body.messages).toHaveLength(1);
      expect(result.httpRequest.body).toHaveProperty('max_tokens');
      expect(result.httpRequest.body.max_tokens).toBe(2000);
      expect(result.httpRequest.body.stream).toBe(false);
    });

    it('应该包含 x-api-key 认证头', () => {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const result = formatter.buildRequest(request, mockConfig);

      expect(result.httpRequest.headers).toHaveProperty('x-api-key');
      expect(result.httpRequest.headers['x-api-key']).toBe('test-api-key');
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

      expect(result.httpRequest.body).toHaveProperty('system');
      expect(result.httpRequest.body.system).toBe('You are a helpful assistant.');
      expect(result.httpRequest.body.messages).toHaveLength(1);
      expect(result.httpRequest.body.messages[0].role).toBe('user');
    });

    it('应该使用最后一个系统消息', () => {
      const request: LLMRequest = {
        messages: [
          { role: 'system', content: 'First system' },
          { role: 'system', content: 'Second system' },
          { role: 'user', content: 'Hello' }
        ]
      };

      const result = formatter.buildRequest(request, mockConfig);

      expect(result.httpRequest.body.system).toBe('Second system');
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
      expect(result.httpRequest.body.tools[0]).toHaveProperty('name');
      expect(result.httpRequest.body.tools[0].name).toBe('test_tool');
      expect(result.httpRequest.body.tools[0]).toHaveProperty('input_schema');
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

    it('应该使用自定义 API 版本', () => {
      const config = {
        ...mockConfig,
        profile: {
          ...mockConfig.profile,
          metadata: {
            apiVersion: '2024-01-01'
          }
        }
      };
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const result = formatter.buildRequest(request, config);

      expect(result.httpRequest.headers['anthropic-version']).toBe('2024-01-01');
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

      expect(result.httpRequest.body.system).toBe('[{"type":"text","text":"System message"}]');
    });
  });

  describe('parseResponse', () => {
    it('应该解析基本的响应', () => {
      const data = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Hello there!'
          }
        ],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 20
        }
      };

      const result = formatter.parseResponse(data, mockConfig);

      expect(result.id).toBe('msg_123');
      expect(result.model).toBe('claude-3-5-sonnet-20241022');
      expect(result.content).toBe('Hello there!');
      expect(result.message.role).toBe('assistant');
      expect(result.message.content).toBe('Hello there!');
      expect(result.usage?.promptTokens).toBe(10);
      expect(result.usage?.completionTokens).toBe(20);
      expect(result.usage?.totalTokens).toBe(30);
      expect(result.finishReason).toBe('end_turn');
      expect(result.metadata?.type).toBe('message');
      expect(result.metadata?.stopReason).toBe('end_turn');
    });

    it('应该解析工具调用响应', () => {
      const data = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_123',
            name: 'test_tool',
            input: {
              param1: 'value1'
            }
          }
        ],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'tool_use',
        usage: {
          input_tokens: 10,
          output_tokens: 20
        }
      };

      const result = formatter.parseResponse(data, mockConfig);

      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls?.[0]?.id).toBe('toolu_123');
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
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'thinking',
            thinking: 'Thinking process...',
            signature: 'sig123'
          },
          {
            type: 'text',
            text: 'Final answer'
          }
        ],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 20
        }
      };

      const result = formatter.parseResponse(data, mockConfig);

      expect(result.reasoningContent).toBe('Thinking process...');
      expect(result.content).toBe('Final answer');
    });
  });

  describe('parseStreamChunk', () => {
    it('应该解析文本增量事件', () => {
      const data = {
        type: 'content_block_delta',
        index: 0,
        delta: {
          type: 'text_delta',
          text: 'Hello'
        }
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.delta).toBe('Hello');
      expect(result.chunk.done).toBe(false);
      expect(result.chunk.raw).toBe(data);
    });

    it('应该解析思考增量事件', () => {
      const data = {
        type: 'content_block_delta',
        index: 0,
        delta: {
          type: 'thinking_delta',
          thinking: 'Thinking...'
        }
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.reasoningDelta).toBe('Thinking...');
      expect(result.chunk.done).toBe(false);
    });

    it('应该解析工具调用开始事件', () => {
      const data = {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'tool_use',
          id: 'toolu_123',
          name: 'test_tool',
          input: {}
        }
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.raw?.toolCall).toBeDefined();
      expect(result.chunk.raw?.toolCall.id).toBe('toolu_123');
      expect(result.chunk.raw?.toolCall.function.name).toBe('test_tool');
    });

    it('应该解析思考块开始事件', () => {
      const data = {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'thinking',
          thinking: '',
          signature: ''
        }
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.raw).toBeDefined();
    });

    it('应该解析消息增量事件', () => {
      const data = {
        type: 'message_delta',
        delta: {
          stop_reason: 'end_turn',
          stop_sequence: null
        },
        usage: {
          output_tokens: 20
        }
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.done).toBe(true);
      expect(result.chunk.finishReason).toBe('end_turn');
      expect(result.chunk.usage?.completionTokens).toBe(20);
    });

    it('应该解析消息开始事件', () => {
      const data = {
        type: 'message_start',
        message: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [],
          model: 'claude-3-5-sonnet-20241022',
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: 10,
            output_tokens: 0
          }
        }
      };

      const result = formatter.parseStreamChunk(data, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.chunk.usage?.promptTokens).toBe(10);
      expect(result.chunk.usage?.completionTokens).toBe(0);
    });

    it('应该跳过未知事件类型', () => {
      const data = {
        type: 'unknown_type'
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
      expect(converted[0].content).toEqual([{ type: 'text', text: 'Hello' }]);
      expect(converted[1].role).toBe('assistant');
      expect(converted[1].content).toEqual([{ type: 'text', text: 'Hi there!' }]);
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
              id: 'toolu_123',
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

      expect(converted[0].role).toBe('assistant');
      expect(converted[0].content).toHaveLength(1);
      expect(converted[0].content[0].type).toBe('tool_use');
      expect(converted[0].content[0].id).toBe('toolu_123');
      expect(converted[0].content[0].name).toBe('test_tool');
      expect(converted[0].content[0].input).toEqual({ param1: 'value1' });
    });

    it('应该转换工具响应消息', () => {
      const messages: LLMMessage[] = [
        {
          role: 'tool',
          content: 'Tool result',
          toolCallId: 'toolu_123'
        }
      ];

      const converted = formatter.convertMessages(messages);

      expect(converted[0].role).toBe('user');
      expect(converted[0].content).toHaveLength(1);
      expect(converted[0].content[0].type).toBe('tool_result');
      expect(converted[0].content[0].tool_use_id).toBe('toolu_123');
      expect(converted[0].content[0].content).toBe('Tool result');
    });

    it('应该处理数组类型的内容', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'base64data' } }
          ]
        }
      ];

      const converted = formatter.convertMessages(messages);

      expect(converted[0].content).toEqual([
        { type: 'text', text: 'Hello' },
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'base64data' } }
      ]);
    });
  });

  describe('parseToolCalls', () => {
    it('应该解析工具调用', () => {
      const toolCalls = [
        {
          id: 'toolu_123',
          type: 'tool_use',
          name: 'test_tool',
          input: {
            param1: 'value1'
          }
        }
      ];

      const parsed = formatter.parseToolCalls(toolCalls);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('toolu_123');
      expect(parsed[0].type).toBe('function');
      expect(parsed[0].function.name).toBe('test_tool');
      expect(JSON.parse(parsed[0].function.arguments)).toEqual({ param1: 'value1' });
    });

    it('应该处理字符串类型的 input', () => {
      const toolCalls = [
        {
          id: 'toolu_123',
          type: 'tool_use',
          name: 'test_tool',
          input: '{"param1":"value1"}'
        }
      ];

      const parsed = formatter.parseToolCalls(toolCalls);

      expect(parsed[0].function.arguments).toBe('{"param1":"value1"}');
    });

    it('应该处理空 input', () => {
      const toolCalls = [
        {
          id: 'toolu_123',
          type: 'tool_use',
          name: 'test_tool',
          input: {}
        }
      ];

      const parsed = formatter.parseToolCalls(toolCalls);

      expect(JSON.parse(parsed[0].function.arguments)).toEqual({});
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
