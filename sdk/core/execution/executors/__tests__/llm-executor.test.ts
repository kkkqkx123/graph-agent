/**
 * LLMExecutor 单元测试
 */

import { LLMExecutor } from '../llm-executor';
import { LLMWrapper } from '../../../llm/wrapper';
import type { LLMMessage, LLMResult } from '../../../../types/llm';
import { ExecutionError } from '../../../../types/errors';

// Mock LLMWrapper
jest.mock('../../../llm/wrapper');

describe('LLMExecutor', () => {
  let executor: LLMExecutor;
  let mockLLMWrapper: jest.Mocked<LLMWrapper>;

  beforeEach(() => {
    // 清除单例实例
    (LLMExecutor as any).instance = undefined;
    
    // 创建 Mock 实例
    mockLLMWrapper = new LLMWrapper() as jest.Mocked<LLMWrapper>;
    (LLMWrapper as jest.Mock).mockImplementation(() => mockLLMWrapper);
    
    // 获取单例实例
    executor = LLMExecutor.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('应该返回单例实例', () => {
      const instance1 = LLMExecutor.getInstance();
      const instance2 = LLMExecutor.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('executeLLMCall - 非流式调用', () => {
    const mockMessages: LLMMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    const mockLLMResult: LLMResult = {
      id: 'test-id',
      model: 'gpt-4',
      content: 'Hi there!',
      message: {
        role: 'assistant',
        content: 'Hi there!'
      },
      finishReason: 'stop',
      duration: 1000,
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15
      }
    };

    it('应该成功执行非流式LLM调用', async () => {
      mockLLMWrapper.generate.mockResolvedValue(mockLLMResult);

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile',
        parameters: { temperature: 0.7 },
        stream: false
      };

      const result = await executor.executeLLMCall(mockMessages, requestData);

      expect(result).toEqual({
        content: 'Hi there!',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        finishReason: 'stop',
        toolCalls: undefined
      });

      expect(mockLLMWrapper.generate).toHaveBeenCalledWith({
        profileId: 'test-profile',
        messages: mockMessages,
        tools: undefined,
        parameters: { temperature: 0.7 },
        stream: false
      });
    });

    it('应该正确处理工具调用', async () => {
      const mockResultWithToolCalls: LLMResult = {
        ...mockLLMResult,
        toolCalls: [
          {
            id: 'call-1',
            type: 'function',
            function: {
              name: 'test_tool',
              arguments: '{"param": "value"}'
            }
          }
        ]
      };

      mockLLMWrapper.generate.mockResolvedValue(mockResultWithToolCalls);

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile',
        parameters: {},
        tools: [{ name: 'test_tool', description: 'Test tool' }],
        stream: false
      };

      const result = await executor.executeLLMCall(mockMessages, requestData);

      expect(result.toolCalls).toEqual([
        {
          id: 'call-1',
          name: 'test_tool',
          arguments: '{"param": "value"}'
        }
      ]);
    });

    it('应该处理多个工具调用', async () => {
      const mockResultWithMultipleToolCalls: LLMResult = {
        ...mockLLMResult,
        toolCalls: [
          {
            id: 'call-1',
            type: 'function',
            function: {
              name: 'tool1',
              arguments: '{"param": "value1"}'
            }
          },
          {
            id: 'call-2',
            type: 'function',
            function: {
              name: 'tool2',
              arguments: '{"param": "value2"}'
            }
          }
        ]
      };

      mockLLMWrapper.generate.mockResolvedValue(mockResultWithMultipleToolCalls);

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile',
        parameters: {},
        stream: false
      };

      const result = await executor.executeLLMCall(mockMessages, requestData);

      expect(result.toolCalls).toHaveLength(2);
      expect((result.toolCalls as any)[0].name).toBe('tool1');
      expect((result.toolCalls as any)[1].name).toBe('tool2');
    });

    it('应该在LLM返回null时抛出ExecutionError', async () => {
      mockLLMWrapper.generate.mockResolvedValue(null as any);

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile',
        parameters: {},
        stream: false
      };

      await expect(executor.executeLLMCall(mockMessages, requestData))
        .rejects.toThrow(ExecutionError);
      
      await expect(executor.executeLLMCall(mockMessages, requestData))
        .rejects.toThrow('No LLM result generated');
    });

    it('应该在LLM调用失败时抛出ExecutionError', async () => {
      const originalError = new Error('API error');
      mockLLMWrapper.generate.mockRejectedValue(originalError);

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile',
        parameters: {},
        stream: false
      };

      await expect(executor.executeLLMCall(mockMessages, requestData))
        .rejects.toThrow(ExecutionError);
      
      await expect(executor.executeLLMCall(mockMessages, requestData))
        .rejects.toThrow('LLM call failed: API error');
    });

    it('应该正确传递动态工具配置', async () => {
      mockLLMWrapper.generate.mockResolvedValue(mockLLMResult);

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile',
        parameters: {},
        dynamicTools: {
          toolIds: ['tool1', 'tool2'],
          descriptionTemplate: 'Tool: {name}'
        },
        stream: false
      };

      await executor.executeLLMCall(mockMessages, requestData);

      expect(mockLLMWrapper.generate).toHaveBeenCalledWith({
        profileId: 'test-profile',
        messages: mockMessages,
        tools: undefined,
        parameters: {},
        stream: false
      });
    });

    it('应该正确传递maxToolCallsPerRequest参数', async () => {
      mockLLMWrapper.generate.mockResolvedValue(mockLLMResult);

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile',
        parameters: {},
        maxToolCallsPerRequest: 5,
        stream: false
      };

      await executor.executeLLMCall(mockMessages, requestData);

      expect(mockLLMWrapper.generate).toHaveBeenCalledWith({
        profileId: 'test-profile',
        messages: mockMessages,
        tools: undefined,
        parameters: {},
        stream: false
      });
    });
  });

  describe('executeLLMCall - 流式调用', () => {
    const mockMessages: LLMMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    it('应该成功执行流式LLM调用', async () => {
      const mockChunks: LLMResult[] = [
        {
          id: 'test-id',
          model: 'gpt-4',
          content: 'Hi',
          message: { role: 'assistant', content: 'Hi' },
          finishReason: '',
          duration: 100
        },
        {
          id: 'test-id',
          model: 'gpt-4',
          content: 'Hi there!',
          message: { role: 'assistant', content: 'Hi there!' },
          finishReason: 'stop',
          duration: 200,
          usage: {
            promptTokens: 10,
            completionTokens: 5,
            totalTokens: 15
          }
        }
      ];

      const asyncGenerator = (async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      })();

      mockLLMWrapper.generateStream.mockReturnValue(asyncGenerator);

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile',
        parameters: {},
        stream: true
      };

      const result = await executor.executeLLMCall(mockMessages, requestData);

      expect(result).toEqual({
        content: 'Hi there!',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        finishReason: 'stop',
        toolCalls: undefined
      });

      expect(mockLLMWrapper.generateStream).toHaveBeenCalledWith({
        profileId: 'test-profile',
        messages: mockMessages,
        tools: undefined,
        parameters: {},
        stream: true
      });
    });

    it('应该在流式调用中使用最后一个有finishReason的chunk', async () => {
      const mockChunks: LLMResult[] = [
        {
          id: 'test-id',
          model: 'gpt-4',
          content: 'Hi',
          message: { role: 'assistant', content: 'Hi' },
          finishReason: '',
          duration: 100
        },
        {
          id: 'test-id',
          model: 'gpt-4',
          content: 'Hi there',
          message: { role: 'assistant', content: 'Hi there' },
          finishReason: 'length',
          duration: 150
        },
        {
          id: 'test-id',
          model: 'gpt-4',
          content: 'Hi there!',
          message: { role: 'assistant', content: 'Hi there!' },
          finishReason: 'stop',
          duration: 200,
          usage: {
            promptTokens: 10,
            completionTokens: 5,
            totalTokens: 15
          }
        }
      ];

      const asyncGenerator = (async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      })();

      mockLLMWrapper.generateStream.mockReturnValue(asyncGenerator);

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile',
        parameters: {},
        stream: true
      };

      const result = await executor.executeLLMCall(mockMessages, requestData);

      expect(result.finishReason).toBe('stop');
      expect(result.content).toBe('Hi there!');
    });

    it('应该在流式调用失败时抛出ExecutionError', async () => {
      const asyncGenerator = (async function* () {
        yield {
          id: 'test-id',
          model: 'gpt-4',
          content: 'Hi',
          message: { role: 'assistant', content: 'Hi' },
          finishReason: '',
          duration: 100
        } as any;
        throw new Error('Stream error');
      })();

      mockLLMWrapper.generateStream.mockReturnValue(asyncGenerator as any);

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile',
        parameters: {},
        stream: true
      };

      await expect(executor.executeLLMCall(mockMessages, requestData))
        .rejects.toThrow(ExecutionError);
      
      await expect(executor.executeLLMCall(mockMessages, requestData))
        .rejects.toThrow('LLM call failed: No LLM result generated');
    });

    it('应该在流式调用中没有finishReason时抛出ExecutionError', async () => {
      const mockChunks: LLMResult[] = [
        {
          id: 'test-id',
          model: 'gpt-4',
          content: 'Hi',
          message: { role: 'assistant', content: 'Hi' },
          finishReason: '',
          duration: 100
        }
      ];

      const asyncGenerator = (async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      })();

      mockLLMWrapper.generateStream.mockReturnValue(asyncGenerator);

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile',
        parameters: {},
        stream: true
      };

      await expect(executor.executeLLMCall(mockMessages, requestData))
        .rejects.toThrow(ExecutionError);
      
      await expect(executor.executeLLMCall(mockMessages, requestData))
        .rejects.toThrow('No LLM result generated');
    });

    it('应该在流式调用中正确处理工具调用', async () => {
      const mockChunks: LLMResult[] = [
        {
          id: 'test-id',
          model: 'gpt-4',
          content: '',
          message: { role: 'assistant', content: '' },
          finishReason: 'tool_calls',
          duration: 200,
          toolCalls: [
            {
              id: 'call-1',
              type: 'function',
              function: {
                name: 'test_tool',
                arguments: '{"param": "value"}'
              }
            }
          ]
        }
      ];

      const asyncGenerator = (async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      })();

      mockLLMWrapper.generateStream.mockReturnValue(asyncGenerator);

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile',
        parameters: {},
        stream: true
      };

      const result = await executor.executeLLMCall(mockMessages, requestData);

      expect(result.toolCalls).toEqual([
        {
          id: 'call-1',
          name: 'test_tool',
          arguments: '{"param": "value"}'
        }
      ]);
    });
  });

  describe('错误处理', () => {
    const mockMessages: LLMMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    it('应该正确包装非Error类型的错误', async () => {
      mockLLMWrapper.generate.mockRejectedValue('String error');

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile',
        parameters: {},
        stream: false
      };

      await expect(executor.executeLLMCall(mockMessages, requestData))
        .rejects.toThrow(ExecutionError);
      
      await expect(executor.executeLLMCall(mockMessages, requestData))
        .rejects.toThrow('LLM call failed: String error');
    });

    it('应该在错误中包含profileId上下文', async () => {
      const originalError = new Error('API error');
      mockLLMWrapper.generate.mockRejectedValue(originalError);

      const requestData = {
        prompt: 'Hello',
        profileId: 'test-profile-123',
        parameters: {},
        stream: false
      };

      try {
        await executor.executeLLMCall(mockMessages, requestData);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).context?.['profileId']).toBe('test-profile-123');
        expect((error as ExecutionError).cause).toBe(originalError);
      }
    });
  });
});