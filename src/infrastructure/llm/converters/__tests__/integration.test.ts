/**
 * 转换器系统集成测试
 * 
 * 验证转换器系统与新架构LLM基础设施的集成
 */

import { ConverterFactory } from '../converter-factory';
import { MessageConverter, HumanMessage } from '../message-converter';
import { LLMMessage } from '../../../../../domain/llm/entities/llm-request';

describe('转换器系统集成测试', () => {
  let converterFactory: ConverterFactory;
  let messageConverter: MessageConverter;

  beforeEach(() => {
    converterFactory = ConverterFactory.getInstance();
    messageConverter = new MessageConverter();
  });

  describe('完整工作流测试', () => {
    test('应该能够完成OpenAI提供商的完整转换流程', () => {
      // 创建测试消息
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: '你是一个有用的助手'
        },
        {
          role: 'user',
          content: '你好，请介绍一下你自己'
        }
      ];

      const parameters = {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 1000
      };

      // 获取OpenAI提供商
      const provider = converterFactory.createProvider('openai');
      expect(provider).toBeDefined();
      expect(provider!.getName()).toBe('openai');

      // 转换请求
      const request = provider!.convertRequest(messages, parameters);
      expect(request).toBeDefined();
      expect(request['model']).toBe('gpt-4');
      expect(request['temperature']).toBe(0.7);
      expect(request['max_tokens']).toBe(1000);
      expect(Array.isArray(request['messages'])).toBe(true);
      expect(request['messages'].length).toBe(2);

      // 模拟响应
      const mockResponse = {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '你好！我是一个AI助手，很高兴为您服务。'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 15,
          total_tokens: 35
        }
      };

      // 转换响应
      const response = provider!.convertResponse(mockResponse);
      expect(response).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.content).toBe('你好！我是一个AI助手，很高兴为您服务。');
    });

    test('应该能够完成Anthropic提供商的完整转换流程', () => {
      // 创建多模态测试消息
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
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024
      };

      // 获取Anthropic提供商
      const provider = converterFactory.createProvider('anthropic');
      expect(provider).toBeDefined();
      expect(provider!.getName()).toBe('anthropic');

      // 转换请求
      const request = provider!.convertRequest(messages, parameters);
      expect(request).toBeDefined();
      expect(request['model']).toBe('claude-3-sonnet-20240229');
      expect(request['max_tokens']).toBe(1024);
      expect(Array.isArray(request['messages'])).toBe(true);
      expect(request['messages'].length).toBe(1);
      
      // 验证多模态内容
      const content = request['messages'][0]['content'];
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBe(2);
      expect(content[0].type).toBe('text');
      expect(content[1].type).toBe('image');

      // 模拟响应
      const mockResponse = {
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '这是一张美丽的风景图片，显示了山脉和湖泊。'
          }
        ],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 25,
          output_tokens: 20
        }
      };

      // 转换响应
      const response = provider!.convertResponse(mockResponse);
      expect(response).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.content).toBe('这是一张美丽的风景图片，显示了山脉和湖泊。');
    });

    test('应该能够完成Gemini提供商的完整转换流程', () => {
      // 创建工具调用测试消息
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: '现在几点了？'
        }
      ];

      const parameters = {
        model: 'gemini-pro',
        temperature: 0.5,
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_current_time',
              description: '获取当前时间',
              parameters: {
                type: 'object',
                properties: {
                  timezone: {
                    type: 'string',
                    description: '时区'
                  }
                }
              }
            }
          }
        ]
      };

      // 获取Gemini提供商
      const provider = converterFactory.createProvider('gemini');
      expect(provider).toBeDefined();
      expect(provider!.getName()).toBe('gemini');

      // 转换请求
      const request = provider!.convertRequest(messages, parameters);
      expect(request).toBeDefined();
      expect(request['contents']).toBeDefined();
      expect(Array.isArray(request['contents'])).toBe(true);
      expect(request['tools']).toBeDefined();
      expect(Array.isArray(request['tools'])).toBe(true);

      // 模拟响应
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '我需要调用工具来获取当前时间。'
                },
                {
                  functionCall: {
                    name: 'get_current_time',
                    args: {
                      timezone: 'UTC'
                    }
                  }
                }
              ],
              role: 'model'
            },
            finishReason: 'STOP'
          }
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 15,
          totalTokenCount: 25
        }
      };

      // 转换响应
      const response = provider!.convertResponse(mockResponse);
      expect(response).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.content).toBe('我需要调用工具来获取当前时间。');
      expect(response.tool_calls).toBeDefined();
      expect(Array.isArray(response.tool_calls)).toBe(true);
      expect(response.tool_calls.length).toBe(1);
      expect(response.tool_calls[0].function.name).toBe('get_current_time');
    });
  });

  describe('消息转换器集成测试', () => {
    test('应该能够与消息转换器协同工作', () => {
      // 创建LLMMessage
      const llmMessage: LLMMessage = {
        role: 'user',
        content: '测试消息',
        name: 'test_user'
      };

      // 转换为BaseMessage
      const baseMessage = messageConverter.toBaseMessage(llmMessage);
      expect(baseMessage).toBeDefined();
      expect(baseMessage instanceof HumanMessage).toBe(true);
      expect(baseMessage.content).toBe('测试消息');

      // 转换回LLMMessage
      const convertedLLMMessage = messageConverter.fromBaseMessage(baseMessage);
      expect(convertedLLMMessage).toBeDefined();
      expect(convertedLLMMessage.role).toBe('user');
      expect(convertedLLMMessage.content).toBe('测试消息');
    });
  });

  describe('错误处理集成测试', () => {
    test('应该能够处理无效的提供商请求', () => {
      const provider = converterFactory.createProvider('invalid_provider');
      expect(provider).toBeNull();
    });

    test('应该能够处理无效的消息格式', () => {
      const provider = converterFactory.createProvider('openai');
      
      expect(() => {
        provider!.convertRequest([], {});
      }).toThrow('请求验证失败: 消息列表不能为空');
    });
  });

  describe('性能测试', () => {
    test('应该能够处理大量消息', () => {
      const provider = converterFactory.createProvider('openai');
      
      // 创建大量消息
      const messages: LLMMessage[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `消息 ${i}: 这是一条测试消息`
        });
      }

      const startTime = Date.now();
      const request = provider!.convertRequest(messages, { model: 'gpt-4' });
      const endTime = Date.now();

      expect(request).toBeDefined();
      expect(request['messages'].length).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});