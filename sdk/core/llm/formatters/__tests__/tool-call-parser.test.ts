/**
 * ToolCallParser 单元测试
 */

import { describe, it, expect, vi } from 'vitest';
import { ToolCallParser, type ToolCallParseOptions } from '../tool-call-parser.js';

describe('ToolCallParser', () => {
  describe('parseXMLToolCalls', () => {
    it('应该解析简单的 XML 工具调用', () => {
      const xmlText = `
        <tool_use>
          <tool_name>test_tool</tool_name>
          <parameters>
            <param1>value1</param1>
            <param2>value2</param2>
          </parameters>
        </tool_use>
      `;

      const toolCalls = ToolCallParser.parseXMLToolCalls(xmlText);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]?.type).toBe('function');
      expect(toolCalls[0]?.function.name).toBe('test_tool');
      expect(JSON.parse(toolCalls[0]!.function.arguments)).toEqual({
        param1: 'value1',
        param2: 'value2'
      });
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

      const toolCalls = ToolCallParser.parseXMLToolCalls(xmlText);
      const args = JSON.parse(toolCalls[0]!.function.arguments);
      expect(args).toEqual({
        nested: {
          key: 'value'
        }
      });
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

      const toolCalls = ToolCallParser.parseXMLToolCalls(xmlText);
      const args = JSON.parse(toolCalls[0]!.function.arguments);
      expect(args).toEqual({ items: [1, 2, 3] });
    });

    it('应该解析嵌套对象的 XML 数组', () => {
      const xmlText = `
        <tool_use>
          <tool_name>test_tool</tool_name>
          <parameters>
            <users>
              <item>
                <name>Alice</name>
                <age>30</age>
              </item>
              <item>
                <name>Bob</name>
                <age>25</age>
              </item>
            </users>
          </parameters>
        </tool_use>
      `;

      const toolCalls = ToolCallParser.parseXMLToolCalls(xmlText);
      const args = JSON.parse(toolCalls[0]!.function.arguments);
      expect(args).toEqual({
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 }
        ]
      });
    });

    it('应该正确解析 XML 值类型', () => {
      const xmlText = `
        <tool_use>
          <tool_name>test_tool</tool_name>
          <parameters>
            <integer>42</integer>
            <float>3.14</float>
            <boolean_true>true</boolean_true>
            <boolean_false>false</boolean_false>
            <null_value>null</null_value>
            <string>hello</string>
          </parameters>
        </tool_use>
      `;

      const toolCalls = ToolCallParser.parseXMLToolCalls(xmlText);
      const args = JSON.parse(toolCalls[0]!.function.arguments);
      expect(args).toEqual({
        integer: 42,
        float: 3.14,
        boolean_true: true,
        boolean_false: false,
        null_value: null,
        string: 'hello'
      });
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

      const toolCalls = ToolCallParser.parseXMLToolCalls(xmlText);
      expect(toolCalls).toHaveLength(2);
      expect(toolCalls[0]?.function.name).toBe('tool1');
      expect(toolCalls[1]?.function.name).toBe('tool2');
    });

    it('应该处理没有参数的工具调用', () => {
      const xmlText = `
        <tool_use>
          <tool_name>test_tool</tool_name>
        </tool_use>
      `;

      const toolCalls = ToolCallParser.parseXMLToolCalls(xmlText);
      const args = JSON.parse(toolCalls[0]!.function.arguments);
      expect(args).toEqual({});
    });

    it('应该跳过无效的 XML 块', () => {
      const xmlText = `
        <tool_use>
          <tool_name>valid_tool</tool_name>
          <parameters>
            <param>value</param>
          </parameters>
        </tool_use>
        <tool_use>
          <tool_name></tool_name>
        </tool_use>
      `;

      const toolCalls = ToolCallParser.parseXMLToolCalls(xmlText);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]?.function.name).toBe('valid_tool');
    });
  });

  describe('parseJSONToolCalls', () => {
    it('应该解析标准格式的 JSON 工具调用', () => {
      const text = `
        <<<TOOL_CALL>>>
        {"tool": "test_tool", "parameters": {"param1": "value1"}}
        <<<END_TOOL_CALL>>>
      `;

      const toolCalls = ToolCallParser.parseJSONToolCalls(text);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]?.type).toBe('function');
      expect(toolCalls[0]?.function.name).toBe('test_tool');
      expect(JSON.parse(toolCalls[0]!.function.arguments)).toEqual({
        param1: 'value1'
      });
    });

    it('应该解析 OpenAI 格式的 JSON 工具调用', () => {
      const text = `
        <<<TOOL_CALL>>>
        {"name": "test_tool", "arguments": "{\\"param1\\": \\"value1\\"}"}
        <<<END_TOOL_CALL>>>
      `;

      const toolCalls = ToolCallParser.parseJSONToolCalls(text);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]?.function.name).toBe('test_tool');
      expect(toolCalls[0]?.function.arguments).toBe('{"param1": "value1"}');
    });

    it('应该解析完整 OpenAI 格式的 JSON 工具调用', () => {
      const text = `
        <<<TOOL_CALL>>>
        {
          "id": "call_123",
          "type": "function",
          "function": {
            "name": "test_tool",
            "arguments": "{\\"param1\\": \\"value1\\"}"
          }
        }
        <<<END_TOOL_CALL>>>
      `;

      const toolCalls = ToolCallParser.parseJSONToolCalls(text);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]?.id).toBe('call_123');
      expect(toolCalls[0]?.type).toBe('function');
      expect(toolCalls[0]?.function.name).toBe('test_tool');
    });

    it('应该解析对象类型的 arguments', () => {
      const text = `
        <<<TOOL_CALL>>>
        {"name": "test_tool", "arguments": {"param1": "value1"}}
        <<<END_TOOL_CALL>>>
      `;

      const toolCalls = ToolCallParser.parseJSONToolCalls(text);
      expect(toolCalls).toHaveLength(1);
      expect(JSON.parse(toolCalls[0]!.function.arguments)).toEqual({
        param1: 'value1'
      });
    });

    it('应该解析自定义标记的 JSON 工具调用', () => {
      const text = `
        <<<CUSTOM_START>>>
        {"tool": "test_tool", "parameters": {}}
        <<<CUSTOM_END>>>
      `;

      const options: ToolCallParseOptions = {
        toolCallStartMarker: '<<<CUSTOM_START>>>',
        toolCallEndMarker: '<<<CUSTOM_END>>>'
      };

      const toolCalls = ToolCallParser.parseJSONToolCalls(text, options);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]?.function.name).toBe('test_tool');
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

      const toolCalls = ToolCallParser.parseJSONToolCalls(text);
      expect(toolCalls).toHaveLength(2);
      expect(toolCalls[0]?.function.name).toBe('tool1');
      expect(toolCalls[1]?.function.name).toBe('tool2');
    });

    it('应该跳过无效的 JSON', () => {
      const text = `
        <<<TOOL_CALL>>>
        {invalid json}
        <<<END_TOOL_CALL>>>
      `;

      const toolCalls = ToolCallParser.parseJSONToolCalls(text);
      expect(toolCalls).toHaveLength(0);
    });

    it('应该跳过空的工具调用块', () => {
      const text = `
        <<<TOOL_CALL>>>

        <<<END_TOOL_CALL>>>
      `;

      const toolCalls = ToolCallParser.parseJSONToolCalls(text);
      expect(toolCalls).toHaveLength(0);
    });
  });

  describe('parseFromText', () => {
    it('应该自动检测并解析 XML 格式', () => {
      const text = `
        <tool_use>
          <tool_name>test_tool</tool_name>
          <parameters>
            <param>value</param>
          </parameters>
        </tool_use>
      `;

      const toolCalls = ToolCallParser.parseFromText(text);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]?.function.name).toBe('test_tool');
    });

    it('应该自动检测并解析 JSON 格式', () => {
      const text = `
        <<<TOOL_CALL>>>
        {"tool": "test_tool", "parameters": {}}
        <<<END_TOOL_CALL>>>
      `;

      const toolCalls = ToolCallParser.parseFromText(text);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]?.function.name).toBe('test_tool');
    });

    it('应该在无法识别格式时返回空数组', () => {
      const text = 'No tool calls here';
      const toolCalls = ToolCallParser.parseFromText(text);
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

      const toolCalls = ToolCallParser.parseFromText(text);
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]?.function.name).toBe('xml_tool');
    });

    it('应该处理空字符串', () => {
      const toolCalls = ToolCallParser.parseFromText('');
      expect(toolCalls).toHaveLength(0);
    });

    it('应该处理非字符串输入', () => {
      // @ts-expect-error 测试非字符串输入
      const toolCalls = ToolCallParser.parseFromText(null);
      expect(toolCalls).toHaveLength(0);

      // @ts-expect-error 测试非字符串输入
      const toolCalls2 = ToolCallParser.parseFromText(undefined);
      expect(toolCalls2).toHaveLength(0);
    });
  });

  describe('hasXMLToolCalls', () => {
    it('应该检测 XML 格式的工具调用', () => {
      const text = `
        <tool_use>
          <tool_name>test_tool</tool_name>
        </tool_use>
      `;
      expect(ToolCallParser.hasXMLToolCalls(text)).toBe(true);
    });

    it('应该在没有 XML 工具调用时返回 false', () => {
      const text = 'No XML tool calls here';
      expect(ToolCallParser.hasXMLToolCalls(text)).toBe(false);
    });
  });

  describe('hasJSONToolCalls', () => {
    it('应该检测 JSON 格式的工具调用', () => {
      const text = `
        <<<TOOL_CALL>>>
        {"tool": "test_tool"}
        <<<END_TOOL_CALL>>>
      `;
      expect(ToolCallParser.hasJSONToolCalls(text)).toBe(true);
    });

    it('应该在没有 JSON 工具调用时返回 false', () => {
      const text = 'No JSON tool calls here';
      expect(ToolCallParser.hasJSONToolCalls(text)).toBe(false);
    });
  });

  describe('escapeRegExp', () => {
    it('应该转义正则表达式特殊字符', () => {
      const input = '<<<TOOL_CALL>>>';
      const escaped = ToolCallParser.escapeRegExp(input);
      expect(escaped).toBe('<<<TOOL_CALL>>>');
    });

    it('应该转义所有特殊字符', () => {
      const input = '.*+?^${}()|[]\\';
      const escaped = ToolCallParser.escapeRegExp(input);
      expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });
  });
});
