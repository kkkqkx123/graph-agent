/**
 * BaseFormatter 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BaseFormatter } from '../base.js';
import type { LLMRequest, LLMMessage, LLMToolCall, ToolSchema } from '@modular-agent/types';
import type { FormatterConfig, ParseStreamChunkResult } from '../types.js';

// 创建一个测试用的 Formatter 子类
class TestFormatter extends BaseFormatter {
  getSupportedProvider(): string {
    return 'TEST';
  }

  buildRequest(request: LLMRequest, config: FormatterConfig) {
    return {
      httpRequest: {
        url: '/test',
        method: 'POST' as const,
        headers: {},
        body: {}
      }
    };
  }

  parseResponse(data: any, config: FormatterConfig) {
    return {
      id: 'test-id',
      model: 'test-model',
      content: data.content || '',
      message: { role: 'assistant' as const, content: data.content || '' },
      finishReason: 'stop',
      duration: 0
    };
  }

  parseStreamChunk(data: any, config: FormatterConfig): ParseStreamChunkResult {
    return {
      chunk: {
        delta: data.delta || '',
        done: data.done || false
      },
      valid: true
    };
  }

  convertTools(tools: ToolSchema[]): any {
    return tools;
  }

  convertMessages(messages: LLMMessage[]): any {
    return messages;
  }

  parseToolCalls(data: any): LLMToolCall[] {
    return data || [];
  }
}

describe('BaseFormatter', () => {
  let formatter: TestFormatter;
  let mockConfig: FormatterConfig;

  beforeEach(() => {
    formatter = new TestFormatter();
    mockConfig = {
      profile: {
        id: 'test-profile-id',
        name: 'test-profile',
        provider: 'TEST' as any,
        model: 'test-model',
        apiKey: 'test-api-key',
        parameters: {}
      }
    };
  });

  describe('parseStreamLine', () => {
    it('应该跳过空行', () => {
      const result = formatter.parseStreamLine('', mockConfig);
      expect(result.valid).toBe(false);
      expect(result.chunk.done).toBe(false);
    });

    it('应该识别 [DONE] 标记', () => {
      const result = formatter.parseStreamLine('data: [DONE]', mockConfig);
      expect(result.valid).toBe(false);
      expect(result.chunk.done).toBe(true);
    });

    it('应该跳过没有 data: 前缀的行', () => {
      const result = formatter.parseStreamLine('invalid line', mockConfig);
      expect(result.valid).toBe(false);
    });

    it('应该解析有效的 SSE 行', () => {
      const result = formatter.parseStreamLine('data: {"delta": "test"}', mockConfig);
      expect(result.valid).toBe(true);
      expect(result.chunk.delta).toBe('test');
    });

    it('应该跳过无效的 JSON', () => {
      const result = formatter.parseStreamLine('data: {invalid json}', mockConfig);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('应该验证有效的配置', () => {
      expect(formatter.validateConfig(mockConfig)).toBe(true);
    });

    it('应该拒绝没有 profile 的配置', () => {
      const invalidConfig = {} as FormatterConfig;
      expect(formatter.validateConfig(invalidConfig)).toBe(false);
    });

    it('应该拒绝没有 model 的配置', () => {
      const invalidConfig = {
        profile: { provider: 'TEST' as any, apiKey: 'test' }
      } as FormatterConfig;
      expect(formatter.validateConfig(invalidConfig)).toBe(false);
    });
  });

  describe('extractSystemMessage', () => {
    it('应该提取系统消息', () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'User message' }
      ];

      const result = formatter['extractSystemMessage'](messages);
      expect(result.systemMessage).toEqual({
        role: 'system',
        content: 'System prompt'
      });
      expect(result.filteredMessages).toHaveLength(1);
      expect(result.filteredMessages[0]?.role).toBe('user');
    });

    it('应该使用最后一个系统消息', () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'First system' },
        { role: 'system', content: 'Second system' },
        { role: 'user', content: 'User message' }
      ];

      const result = formatter['extractSystemMessage'](messages);
      expect(result.systemMessage?.content).toBe('Second system');
    });

    it('应该处理没有系统消息的情况', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'User message' }
      ];

      const result = formatter['extractSystemMessage'](messages);
      expect(result.systemMessage).toBeNull();
      expect(result.filteredMessages).toHaveLength(1);
    });
  });

  describe('findLastUserMessageGroupIndex', () => {
    it('应该找到最后一组用户消息的索引', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'User 1' },
        { role: 'assistant', content: 'Assistant 1' },
        { role: 'user', content: 'User 2' },
        { role: 'user', content: 'User 3' }
      ];

      const index = formatter['findLastUserMessageGroupIndex'](messages);
      expect(index).toBe(2);
    });

    it('应该处理单条用户消息', () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'User 1' },
        { role: 'assistant', content: 'Assistant 1' }
      ];

      const index = formatter['findLastUserMessageGroupIndex'](messages);
      expect(index).toBe(0);
    });

    it('应该在找不到用户消息时返回 -1', () => {
      const messages: LLMMessage[] = [
        { role: 'assistant', content: 'Assistant 1' }
      ];

      const index = formatter['findLastUserMessageGroupIndex'](messages);
      expect(index).toBe(-1);
    });
  });

  describe('cleanInternalFields', () => {
    it('应该清理内部字段', () => {
      const messages: LLMMessage[] = [
        {
          role: 'user',
          content: 'Test',
          // @ts-expect-error 测试内部字段
          _internal: 'should be removed'
        }
      ];

      const cleaned = formatter['cleanInternalFields'](messages);
      expect(cleaned[0]).toEqual({
        role: 'user',
        content: 'Test'
      });
    });

    it('应该保留工具调用相关字段', () => {
      const messages: LLMMessage[] = [
        {
          role: 'assistant',
          content: '',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: {
                name: 'test',
                arguments: '{}'
              }
            }
          ]
        },
        {
          role: 'tool',
          content: 'result',
          toolCallId: 'call_1'
        }
      ];

      const cleaned = formatter['cleanInternalFields'](messages);
      expect(cleaned[0]?.toolCalls).toBeDefined();
      expect(cleaned[1]?.toolCallId).toBe('call_1');
    });
  });

  describe('mergeParameters', () => {
    it('应该合并两个参数对象', () => {
      const profileParams = { temperature: 0.7, max_tokens: 1000 };
      const requestParams = { temperature: 0.8, top_p: 0.9 };

      const merged = formatter['mergeParameters'](profileParams, requestParams);
      expect(merged).toEqual({
        temperature: 0.8,
        max_tokens: 1000,
        top_p: 0.9
      });
    });

    it('应该处理空参数', () => {
      const merged = formatter['mergeParameters']({}, {});
      expect(merged).toEqual({});
    });
  });

  describe('deepMerge', () => {
    it('应该深度合并嵌套对象', () => {
      const target = {
        a: 1,
        b: { c: 2, d: 3 }
      };
      const source = {
        b: { d: 4, e: 5 },
        f: 6
      };

      const result = formatter['deepMerge'](target, source);
      expect(result).toEqual({
        a: 1,
        b: { c: 2, d: 4, e: 5 },
        f: 6
      });
    });

    it('应该合并数组', () => {
      const target = { items: [1, 2] };
      const source = { items: [3, 4] };

      const result = formatter['deepMerge'](target, source);
      expect(result.items).toEqual([1, 2, 3, 4]);
    });

    it('应该覆盖非对象类型的值', () => {
      const target = { a: 1, b: 'old' };
      const source = { b: 'new', c: null };

      const result = formatter['deepMerge'](target, source);
      expect(result).toEqual({
        a: 1,
        b: 'new',
        c: undefined
      });
    });

    it('应该处理 null 或 undefined 源', () => {
      const target = { a: 1 };
      expect(formatter['deepMerge'](target, null)).toEqual(target);
      expect(formatter['deepMerge'](target, undefined)).toEqual(target);
    });

    it('应该处理数组源', () => {
      const target = { a: 1 };
      const source = [1, 2, 3];

      const result = formatter['deepMerge'](target, source);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('buildAuthHeader', () => {
    it('应该构建 Bearer 认证头', () => {
      const config = { ...mockConfig, authType: 'bearer' as const };
      const header = formatter['buildAuthHeader']('test-key', config, 'x-api-key');

      expect(header).toEqual({
        'Authorization': 'Bearer test-key'
      });
    });

    it('应该构建原生认证头', () => {
      const config = { ...mockConfig, authType: 'native' as const };
      const header = formatter['buildAuthHeader']('test-key', config, 'x-api-key');

      expect(header).toEqual({
        'x-api-key': 'test-key'
      });
    });

    it('应该在没有 API key 时返回空对象', () => {
      const header = formatter['buildAuthHeader'](undefined, mockConfig, 'x-api-key');
      expect(header).toEqual({});
    });

    it('应该默认使用原生认证', () => {
      const config = { ...mockConfig };
      const header = formatter['buildAuthHeader']('test-key', config, 'x-api-key');

      expect(header).toEqual({
        'x-api-key': 'test-key'
      });
    });
  });

  describe('buildCustomHeaders', () => {
    it('应该合并简化版自定义请求头', () => {
      const config = {
        ...mockConfig,
        customHeaders: {
          'X-Custom-1': 'value1',
          'X-Custom-2': 'value2'
        }
      };

      const headers = formatter['buildCustomHeaders'](config);
      expect(headers).toEqual({
        'X-Custom-1': 'value1',
        'X-Custom-2': 'value2'
      });
    });

    it('应该合并完整版自定义请求头', () => {
      const config = {
        ...mockConfig,
        customHeadersList: [
          { key: 'X-Custom-1', value: 'value1', enabled: true },
          { key: 'X-Custom-2', value: 'value2', enabled: true },
          { key: 'X-Custom-3', value: 'value3', enabled: false }
        ]
      };

      const headers = formatter['buildCustomHeaders'](config);
      expect(headers).toEqual({
        'X-Custom-1': 'value1',
        'X-Custom-2': 'value2'
      });
    });

    it('应该同时处理两种格式的自定义请求头', () => {
      const config = {
        ...mockConfig,
        customHeaders: { 'X-Custom-1': 'value1' },
        customHeadersList: [
          { key: 'X-Custom-2', value: 'value2', enabled: true }
        ]
      };

      const headers = formatter['buildCustomHeaders'](config);
      expect(headers).toEqual({
        'X-Custom-1': 'value1',
        'X-Custom-2': 'value2'
      });
    });

    it('应该跳过空键名的请求头', () => {
      const config = {
        ...mockConfig,
        customHeadersList: [
          { key: '  ', value: 'value', enabled: true },
          { key: 'X-Custom', value: 'value', enabled: true }
        ]
      };

      const headers = formatter['buildCustomHeaders'](config);
      expect(headers).toEqual({
        'X-Custom': 'value'
      });
    });

    it('应该处理没有值的请求头', () => {
      const config = {
        ...mockConfig,
        customHeadersList: [
          { key: 'X-Custom', value: '', enabled: true }
        ]
      };

      const headers = formatter['buildCustomHeaders'](config);
      expect(headers).toEqual({
        'X-Custom': ''
      });
    });
  });

  describe('applyCustomBody', () => {
    it('应该合并简化版自定义请求体', () => {
      const baseBody = { model: 'test', messages: [] };
      const config = {
        ...mockConfig,
        customBody: { temperature: 0.8, top_p: 0.9 }
      };

      const result = formatter['applyCustomBody'](baseBody, config);
      expect(result).toEqual({
        model: 'test',
        messages: [],
        temperature: 0.8,
        top_p: 0.9
      });
    });

    it('应该合并简单模式的自定义请求体', () => {
      const baseBody = { model: 'test', messages: [] };
      const config = {
        ...mockConfig,
        customBodyConfig: {
          mode: 'simple' as const,
          items: [
            { key: 'temperature', value: '0.8', enabled: true },
            { key: 'top_p', value: '0.9', enabled: true },
            { key: 'disabled', value: '1.0', enabled: false }
          ]
        }
      };

      const result = formatter['applyCustomBody'](baseBody, config);
      expect(result).toEqual({
        model: 'test',
        messages: [],
        temperature: 0.8,
        top_p: 0.9
      });
    });

    it('应该解析简单模式中的 JSON 值', () => {
      const baseBody = { model: 'test' };
      const config = {
        ...mockConfig,
        customBodyConfig: {
          mode: 'simple' as const,
          items: [
            { key: 'extra_body', value: '{"key": "value"}', enabled: true }
          ]
        }
      };

      const result = formatter['applyCustomBody'](baseBody, config);
      expect(result).toEqual({
        model: 'test',
        extra_body: { key: 'value' }
      });
    });

    it('应该处理简单模式中的嵌套路径', () => {
      const baseBody = { model: 'test' };
      const config = {
        ...mockConfig,
        customBodyConfig: {
          mode: 'simple' as const,
          items: [
            { key: 'extra_body.google', value: 'value', enabled: true }
          ]
        }
      };

      const result = formatter['applyCustomBody'](baseBody, config);
      expect(result).toEqual({
        model: 'test',
        extra_body: { google: 'value' }
      });
    });

    it('应该合并高级模式的自定义请求体', () => {
      const baseBody = { model: 'test', messages: [] };
      const config = {
        ...mockConfig,
        customBodyConfig: {
          mode: 'advanced' as const,
          json: '{"temperature": 0.8, "top_p": 0.9}'
        }
      };

      const result = formatter['applyCustomBody'](baseBody, config);
      expect(result).toEqual({
        model: 'test',
        messages: [],
        temperature: 0.8,
        top_p: 0.9
      });
    });

    it('应该跳过无效的 JSON', () => {
      const baseBody = { model: 'test' };
      const config = {
        ...mockConfig,
        customBodyConfig: {
          mode: 'advanced' as const,
          json: '{invalid json}'
        }
      };

      const result = formatter['applyCustomBody'](baseBody, config);
      expect(result).toEqual({ model: 'test' });
    });

    it('应该在 customBodyEnabled 为 false 时跳过自定义请求体', () => {
      const baseBody = { model: 'test' };
      const config = {
        ...mockConfig,
        customBodyEnabled: false,
        customBody: { temperature: 0.8 }
      };

      const result = formatter['applyCustomBody'](baseBody, config);
      expect(result).toEqual({ model: 'test' });
    });
  });

  describe('buildQueryString', () => {
    it('应该构建查询参数字符串', () => {
      const config = {
        ...mockConfig,
        queryParams: { key1: 'value1', key2: 'value2' }
      };

      const queryString = formatter['buildQueryString'](config);
      expect(queryString).toBe('?key1=value1&key2=value2');
    });

    it('应该处理数字和布尔值', () => {
      const config = {
        ...mockConfig,
        queryParams: { num: 123, bool: true }
      };

      const queryString = formatter['buildQueryString'](config);
      expect(queryString).toBe('?num=123&bool=true');
    });

    it('应该在没有查询参数时返回空字符串', () => {
      const queryString = formatter['buildQueryString'](mockConfig);
      expect(queryString).toBe('');
    });
  });

  describe('buildStreamOptions', () => {
    it('应该构建流式选项', () => {
      const config = {
        ...mockConfig,
        streamOptions: { includeUsage: true }
      };

      const options = formatter['buildStreamOptions'](config);
      expect(options).toEqual({ include_usage: true });
    });

    it('应该在没有流式选项时返回 undefined', () => {
      const options = formatter['buildStreamOptions'](mockConfig);
      expect(options).toBeUndefined();
    });

    it('应该在 includeUsage 为 false 时返回 undefined', () => {
      const config = {
        ...mockConfig,
        streamOptions: { includeUsage: false }
      };

      const options = formatter['buildStreamOptions'](config);
      expect(options).toBeUndefined();
    });
  });

  describe('工具调用解析方法', () => {
    describe('parseXMLToolCalls', () => {
      it('应该解析 XML 格式的工具调用', () => {
        const xmlText = `
          <tool_use>
            <tool_name>test_tool</tool_name>
            <parameters>
              <param1>value1</param1>
              <param2>value2</param2>
            </parameters>
          </tool_use>
        `;

        const toolCalls = formatter.parseXMLToolCalls(xmlText);
        expect(toolCalls).toHaveLength(1);
        expect(toolCalls[0]?.function.name).toBe('test_tool');
      });

      it('应该解析嵌套的 XML 参数', () => {
        const xmlText = `
          <tool_use>
            <tool_name>test_tool</tool_name>
            <parameters>
              <nested>
                <key>value</key>
              </nested>
            </parameters>
          </tool_use>
        `;

        const toolCalls = formatter.parseXMLToolCalls(xmlText);
        const args = JSON.parse(toolCalls[0]!.function.arguments);
        expect(args).toEqual({ nested: { key: 'value' } });
      });

      it('应该解析 XML 数组', () => {
        const xmlText = `
          <tool_use>
            <tool_name>test_tool</tool_name>
            <parameters>
              <items>
                <item>1</item>
                <item>2</item>
                <item>3</item>
              </items>
            </parameters>
          </tool_use>
        `;

        const toolCalls = formatter.parseXMLToolCalls(xmlText);
        const args = JSON.parse(toolCalls[0]!.function.arguments);
        expect(args).toEqual({ items: [1, 2, 3] });
      });

      it('应该解析多个工具调用', () => {
        const xmlText = `
          <tool_use>
            <tool_name>tool1</tool_name>
            <parameters>
              <param>value1</param>
            </parameters>
          </tool_use>
          <tool_use>
            <tool_name>tool2</tool_name>
            <parameters>
              <param>value2</param>
            </parameters>
          </tool_use>
        `;

        const toolCalls = formatter.parseXMLToolCalls(xmlText);
        expect(toolCalls).toHaveLength(2);
      });
    });

    describe('parseJSONToolCalls', () => {
      it('应该解析 JSON 格式的工具调用', () => {
        const text = `
          <<<TOOL_CALL>>>
          {"tool": "test_tool", "parameters": {"param1": "value1"}}
          <<<END_TOOL_CALL>>>
        `;

        const toolCalls = formatter.parseJSONToolCalls(text);
        expect(toolCalls).toHaveLength(1);
        expect(toolCalls[0]?.function.name).toBe('test_tool');
      });

      it('应该解析自定义标记的 JSON 工具调用', () => {
        const text = `
          <<<CUSTOM_START>>>
          {"tool": "test_tool", "parameters": {}}
          <<<CUSTOM_END>>>
        `;

        const toolCalls = formatter.parseJSONToolCalls(text, {
          toolCallStartMarker: '<<<CUSTOM_START>>>',
          toolCallEndMarker: '<<<CUSTOM_END>>>'
        });
        expect(toolCalls).toHaveLength(1);
      });

      it('应该解析多个 JSON 工具调用', () => {
        const text = `
          <<<TOOL_CALL>>>
          {"tool": "tool1", "parameters": {}}
          <<<END_TOOL_CALL>>>
          <<<TOOL_CALL>>>
          {"tool": "tool2", "parameters": {}}
          <<<END_TOOL_CALL>>>
        `;

        const toolCalls = formatter.parseJSONToolCalls(text);
        expect(toolCalls).toHaveLength(2);
      });
    });

    describe('parseToolCallsFromText', () => {
      it('应该自动检测并解析 XML 格式', () => {
        const text = `
          <tool_use>
            <tool_name>test_tool</tool_name>
            <parameters>
              <param>value</param>
            </parameters>
          </tool_use>
        `;

        const toolCalls = formatter.parseToolCallsFromText(text);
        expect(toolCalls).toHaveLength(1);
        expect(toolCalls[0]?.function.name).toBe('test_tool');
      });

      it('应该自动检测并解析 JSON 格式', () => {
        const text = `
          <<<TOOL_CALL>>>
          {"tool": "test_tool", "parameters": {}}
          <<<END_TOOL_CALL>>>
        `;

        const toolCalls = formatter.parseToolCallsFromText(text);
        expect(toolCalls).toHaveLength(1);
        expect(toolCalls[0]?.function.name).toBe('test_tool');
      });

      it('应该在无法识别格式时返回空数组', () => {
        const text = 'No tool calls here';
        const toolCalls = formatter.parseToolCallsFromText(text);
        expect(toolCalls).toHaveLength(0);
      });

      it('应该优先尝试 XML 格式', () => {
        const text = `
          <tool_use>
            <tool_name>xml_tool</tool_name>
            <parameters></parameters>
          </tool_use>
          <<<TOOL_CALL>>>
          {"tool": "json_tool", "parameters": {}}
          <<<END_TOOL_CALL>>>
        `;

        const toolCalls = formatter.parseToolCallsFromText(text);
        expect(toolCalls).toHaveLength(1);
        expect(toolCalls[0]?.function.name).toBe('xml_tool');
      });
    });
  });
});
