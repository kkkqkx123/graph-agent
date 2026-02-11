/**
 * LLM 工具定义转换工具单元测试
 */

import { describe, it, expect } from '@jest/globals';
import type { ToolSchema, ToolParameters } from '../../../types/tool';
import {
  convertToolsToOpenAIFormat,
  convertToolsToAnthropicFormat,
  convertToolsToGeminiFormat,
  convertToolsByProvider,
  isEmptyTools,
  OpenAITool,
  AnthropicTool,
  GeminiTool
} from '../tool-converter';

describe('tool-converter', () => {
  const mockToolSchemas: ToolSchema[] = [
    {
      name: 'search',
      description: 'Search the web for information',
      parameters: {
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          limit: {
            type: 'number',
            description: 'Number of results to return',
            default: 10
          }
        },
        required: ['query']
      }
    },
    {
      name: 'calculate',
      description: 'Perform mathematical calculations',
      parameters: {
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate'
          }
        },
        required: ['expression']
      }
    }
  ];

  const mockEmptyParameters: ToolParameters = {
    properties: {},
    required: []
  };

  describe('convertToolsToOpenAIFormat', () => {
    it('应该正确转换为OpenAI格式', () => {
      const result = convertToolsToOpenAIFormat(mockToolSchemas);
      
      expect(result).toHaveLength(2);
      
      expect(result[0]).toEqual({
        type: 'function',
        function: {
          name: 'search',
          description: 'Search the web for information',
          parameters: mockToolSchemas[0]!.parameters
        }
      });

      expect(result[1]).toEqual({
        type: 'function',
        function: {
          name: 'calculate',
          description: 'Perform mathematical calculations',
          parameters: mockToolSchemas[1]!.parameters
        }
      });
    });

    it('应该返回空数组当工具数组为空时', () => {
      const result = convertToolsToOpenAIFormat([]);
      expect(result).toEqual([]);
    });

    it('应该返回空数组当工具数组为null或undefined时', () => {
      expect(convertToolsToOpenAIFormat(null as any)).toEqual([]);
      expect(convertToolsToOpenAIFormat(undefined as any)).toEqual([]);
    });

    it('应该处理空参数的工具', () => {
      const tools: ToolSchema[] = [
        {
          name: 'no_params',
          description: 'Tool without parameters',
          parameters: mockEmptyParameters
        }
      ];
      
      const result = convertToolsToOpenAIFormat(tools);
      expect(result[0]).toEqual({
        type: 'function',
        function: {
          name: 'no_params',
          description: 'Tool without parameters',
          parameters: mockEmptyParameters
        }
      });
    });
  });

  describe('convertToolsToAnthropicFormat', () => {
    it('应该正确转换为Anthropic格式', () => {
      const result = convertToolsToAnthropicFormat(mockToolSchemas);
      
      expect(result).toHaveLength(2);
      
      expect(result[0]).toEqual({
        name: 'search',
        description: 'Search the web for information',
        input_schema: mockToolSchemas[0]!.parameters
      });

      expect(result[1]).toEqual({
        name: 'calculate',
        description: 'Perform mathematical calculations',
        input_schema: mockToolSchemas[1]!.parameters
      });
    });

    it('应该返回空数组当工具数组为空时', () => {
      const result = convertToolsToAnthropicFormat([]);
      expect(result).toEqual([]);
    });

    it('应该返回空数组当工具数组为null或undefined时', () => {
      expect(convertToolsToAnthropicFormat(null as any)).toEqual([]);
      expect(convertToolsToAnthropicFormat(undefined as any)).toEqual([]);
    });

    it('应该处理空参数的工具', () => {
      const tools: ToolSchema[] = [
        {
          name: 'no_params',
          description: 'Tool without parameters',
          parameters: mockEmptyParameters
        }
      ];
      
      const result = convertToolsToAnthropicFormat(tools);
      expect(result[0]).toEqual({
        name: 'no_params',
        description: 'Tool without parameters',
        input_schema: mockEmptyParameters
      });
    });
  });

  describe('convertToolsToGeminiFormat', () => {
    it('应该正确转换为Gemini格式', () => {
      const result = convertToolsToGeminiFormat(mockToolSchemas);
      
      expect(result).toHaveLength(2);
      
      expect(result[0]).toEqual({
        functionDeclarations: [{
          name: 'search',
          description: 'Search the web for information',
          parameters: mockToolSchemas[0]!.parameters
        }]
      });

      expect(result[1]).toEqual({
        functionDeclarations: [{
          name: 'calculate',
          description: 'Perform mathematical calculations',
          parameters: mockToolSchemas[1]!.parameters
        }]
      });
    });

    it('应该返回空数组当工具数组为空时', () => {
      const result = convertToolsToGeminiFormat([]);
      expect(result).toEqual([]);
    });

    it('应该返回空数组当工具数组为null或undefined时', () => {
      expect(convertToolsToGeminiFormat(null as any)).toEqual([]);
      expect(convertToolsToGeminiFormat(undefined as any)).toEqual([]);
    });

    it('应该处理空参数的工具', () => {
      const tools: ToolSchema[] = [
        {
          name: 'no_params',
          description: 'Tool without parameters',
          parameters: mockEmptyParameters
        }
      ];
      
      const result = convertToolsToGeminiFormat(tools);
      expect(result[0]).toEqual({
        functionDeclarations: [{
          name: 'no_params',
          description: 'Tool without parameters',
          parameters: mockEmptyParameters
        }]
      });
    });
  });

  describe('convertToolsByProvider', () => {
    it('应该为OPENAI_CHAT提供商转换为OpenAI格式', () => {
      const result = convertToolsByProvider(mockToolSchemas, 'OPENAI_CHAT');
      expect(result).toEqual(convertToolsToOpenAIFormat(mockToolSchemas));
    });

    it('应该为OPENAI_RESPONSE提供商转换为OpenAI格式', () => {
      const result = convertToolsByProvider(mockToolSchemas, 'OPENAI_RESPONSE');
      expect(result).toEqual(convertToolsToOpenAIFormat(mockToolSchemas));
    });

    it('应该为ANTHROPIC提供商转换为Anthropic格式', () => {
      const result = convertToolsByProvider(mockToolSchemas, 'ANTHROPIC');
      expect(result).toEqual(convertToolsToAnthropicFormat(mockToolSchemas));
    });

    it('应该为GEMINI_NATIVE提供商转换为Gemini格式', () => {
      const result = convertToolsByProvider(mockToolSchemas, 'GEMINI_NATIVE');
      expect(result).toEqual(convertToolsToGeminiFormat(mockToolSchemas));
    });

    it('应该为GEMINI_OPENAI提供商转换为Gemini格式', () => {
      const result = convertToolsByProvider(mockToolSchemas, 'GEMINI_OPENAI');
      expect(result).toEqual(convertToolsToGeminiFormat(mockToolSchemas));
    });

    it('应该为未知提供商默认转换为OpenAI格式', () => {
      const result = convertToolsByProvider(mockToolSchemas, 'UNKNOWN_PROVIDER');
      expect(result).toEqual(convertToolsToOpenAIFormat(mockToolSchemas));
    });

    it('应该返回空数组当工具数组为空时', () => {
      const result = convertToolsByProvider([], 'OPENAI_CHAT');
      expect(result).toEqual([]);
    });

    it('应该返回空数组当工具数组为null或undefined时', () => {
      expect(convertToolsByProvider(null as any, 'OPENAI_CHAT')).toEqual([]);
      expect(convertToolsByProvider(undefined as any, 'OPENAI_CHAT')).toEqual([]);
    });

    it('应该处理空字符串提供商', () => {
      const result = convertToolsByProvider(mockToolSchemas, '');
      expect(result).toEqual(convertToolsToOpenAIFormat(mockToolSchemas));
    });
  });

  describe('isEmptyTools', () => {
    it('应该返回true当工具数组为空时', () => {
      expect(isEmptyTools([])).toBe(true);
    });

    it('应该返回true当工具数组为null或undefined时', () => {
      expect(isEmptyTools(null as any)).toBe(true);
      expect(isEmptyTools(undefined as any)).toBe(true);
    });

    it('应该返回false当工具数组不为空时', () => {
      expect(isEmptyTools(mockToolSchemas)).toBe(false);
    });

    it('应该返回false当有单个工具时', () => {
      expect(isEmptyTools([mockToolSchemas[0]!])).toBe(false);
    });
  });
});