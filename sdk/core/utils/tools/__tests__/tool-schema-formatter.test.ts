/**
 * ToolSchemaFormatter 单元测试
 * 测试工具 Schema 格式转换功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  toFunctionCallSchema,
  toFunctionCallSchemas,
  toXMLFormat,
  toXMLFormatBatch,
  toJSONFormat,
  toJSONFormatBatch,
  formatTool,
  formatTools,
  type LLMToolSchema,
  type ToolFormatType
} from '../tool-schema-formatter';
import type { Tool } from '@modular-agent/types';

// Mock 模板渲染
vi.mock('@modular-agent/common-utils', () => ({
  renderTemplate: vi.fn((template: string, variables: Record<string, unknown>) => {
    // 简单的模板渲染实现用于测试
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(variables[key] || ''));
  })
}));

vi.mock('@modular-agent/prompt-templates', () => ({
  TOOL_XML_FORMAT_TEMPLATE: {
    content: `<tool name="{{toolName}}">
<description>{{toolDescription}}</description>
<parameters>
{{parametersDescription}}
</parameters>
</tool>`
  },
  TOOLS_XML_LIST_TEMPLATE: {
    content: `## 可用工具

{{toolsXml}}`
  },
  TOOL_XML_PARAMETER_LINE_TEMPLATE: {
    content: '- {{paramName}} ({{paramType}}){{required}}: {{paramDescription}}'
  },
  TOOL_JSON_FORMAT_TEMPLATE: {
    content: `### {{toolName}}

{{toolDescription}}

参数:
{{parametersDescription}}`
  },
  TOOLS_JSON_LIST_TEMPLATE: {
    content: `## 可用工具

{{toolsJson}}`
  },
  TOOL_JSON_PARAMETER_LINE_TEMPLATE: {
    content: '- {{paramName}} ({{paramType}}){{required}}: {{paramDescription}}'
  }
}));

vi.mock('../tool-parameters-describer.js', () => ({
  generateSimpleParametersDescription: vi.fn(() => '- param1 (string): Test param')
}));

describe('ToolSchemaFormatter', () => {
  let mockTool1: Tool;
  let mockTool2: Tool;
  let mockToolWithParams: Tool;

  beforeEach(() => {
    mockTool1 = {
      id: 'tool-1',
      name: 'Calculator',
      type: 'STATELESS' as const,
      description: 'Performs basic calculations',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    };

    mockTool2 = {
      id: 'tool-2',
      name: 'Weather',
      type: 'STATELESS' as const,
      description: 'Gets weather information',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    };

    mockToolWithParams = {
      id: 'tool-params',
      name: 'SearchTool',
      type: 'STATELESS' as const,
      description: 'Searches for information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string' as const,
            description: 'Search query'
          },
          limit: {
            type: 'number' as const,
            description: 'Max results'
          }
        },
        required: ['query']
      }
    };
  });

  describe('toFunctionCallSchema', () => {
    it('应该将工具转换为 Function Call Schema 格式', () => {
      const schema = toFunctionCallSchema(mockTool1);

      expect(schema.type).toBe('function');
      expect(schema.function.name).toBe('Calculator');
      expect(schema.function.description).toBe('Performs basic calculations');
      expect(schema.function.parameters).toEqual(mockTool1.parameters);
    });

    it('应该正确处理带参数的工具', () => {
      const schema = toFunctionCallSchema(mockToolWithParams);

      expect(schema.function.parameters.properties.query).toBeDefined();
      expect(schema.function.parameters.properties.limit).toBeDefined();
      expect(schema.function.parameters.required).toContain('query');
    });
  });

  describe('toFunctionCallSchemas', () => {
    it('应该批量转换工具列表', () => {
      const tools = [mockTool1, mockTool2];
      const schemas = toFunctionCallSchemas(tools);

      expect(schemas).toHaveLength(2);
      expect(schemas[0].function.name).toBe('Calculator');
      expect(schemas[1].function.name).toBe('Weather');
    });

    it('应该处理空数组', () => {
      const schemas = toFunctionCallSchemas([]);

      expect(schemas).toHaveLength(0);
    });
  });

  describe('toXMLFormat', () => {
    it('应该将工具转换为 XML 格式', () => {
      const xml = toXMLFormat(mockTool1);

      expect(xml).toContain('<tool name="Calculator">');
      expect(xml).toContain('<description>Performs basic calculations</description>');
      expect(xml).toContain('</tool>');
    });

    it('应该包含参数描述', () => {
      const xml = toXMLFormat(mockToolWithParams);

      expect(xml).toContain('query');
      expect(xml).toContain('string');
    });

    it('应该处理无参数的工具', () => {
      const xml = toXMLFormat(mockTool1);

      expect(xml).toContain('No parameters');
    });
  });

  describe('toXMLFormatBatch', () => {
    it('应该批量转换工具列表为 XML 格式', () => {
      const tools = [mockTool1, mockTool2];
      const xml = toXMLFormatBatch(tools);

      expect(xml).toContain('## 可用工具');
      expect(xml).toContain('<tool name="Calculator">');
      expect(xml).toContain('<tool name="Weather">');
    });

    it('应该处理空数组', () => {
      const xml = toXMLFormatBatch([]);

      expect(xml).toBe('No tools available');
    });
  });

  describe('toJSONFormat', () => {
    it('应该将工具转换为 JSON 文本格式', () => {
      const json = toJSONFormat(mockTool1);

      expect(json).toContain('### Calculator');
      expect(json).toContain('Performs basic calculations');
      expect(json).toContain('参数:');
    });

    it('应该包含参数描述', () => {
      const json = toJSONFormat(mockToolWithParams);

      expect(json).toContain('query');
      expect(json).toContain('string');
    });

    it('应该处理无参数的工具', () => {
      const json = toJSONFormat(mockTool1);

      expect(json).toContain('No parameters');
    });
  });

  describe('toJSONFormatBatch', () => {
    it('应该批量转换工具列表为 JSON 文本格式', () => {
      const tools = [mockTool1, mockTool2];
      const json = toJSONFormatBatch(tools);

      expect(json).toContain('## 可用工具');
      expect(json).toContain('### Calculator');
      expect(json).toContain('### Weather');
    });

    it('应该处理空数组', () => {
      const json = toJSONFormatBatch([]);

      expect(json).toBe('No tools available');
    });
  });

  describe('formatTool', () => {
    it('应该根据格式类型转换工具 - function_call', () => {
      const result = formatTool(mockTool1, 'function_call');

      expect((result as LLMToolSchema).type).toBe('function');
    });

    it('应该根据格式类型转换工具 - xml', () => {
      const result = formatTool(mockTool1, 'xml');

      expect(result).toContain('<tool name="Calculator">');
    });

    it('应该根据格式类型转换工具 - json', () => {
      const result = formatTool(mockTool1, 'json');

      expect(result).toContain('### Calculator');
    });

    it('默认应该使用 function_call 格式', () => {
      const result = formatTool(mockTool1, 'unknown' as ToolFormatType);

      expect((result as LLMToolSchema).type).toBe('function');
    });
  });

  describe('formatTools', () => {
    it('应该批量根据格式类型转换工具 - function_call', () => {
      const tools = [mockTool1, mockTool2];
      const result = formatTools(tools, 'function_call') as LLMToolSchema[];

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('function');
    });

    it('应该批量根据格式类型转换工具 - xml', () => {
      const tools = [mockTool1, mockTool2];
      const result = formatTools(tools, 'xml') as string;

      expect(result).toContain('<tool name="Calculator">');
      expect(result).toContain('<tool name="Weather">');
    });

    it('应该批量根据格式类型转换工具 - json', () => {
      const tools = [mockTool1, mockTool2];
      const result = formatTools(tools, 'json') as string;

      expect(result).toContain('### Calculator');
      expect(result).toContain('### Weather');
    });
  });

  describe('边界情况', () => {
    it('应该处理特殊字符在描述中', () => {
      const toolWithSpecialChars: Tool = {
        ...mockTool1,
        description: 'Calculates with special chars: @#$%'
      };

      const schema = toFunctionCallSchema(toolWithSpecialChars);

      expect(schema.function.description).toContain('@#$%');
    });

    it('应该处理长描述', () => {
      const toolWithLongDesc: Tool = {
        ...mockTool1,
        description: 'This is a very long description that goes on and on and on and on and on and on and on and on and on and on and on and on and on'
      };

      const schema = toFunctionCallSchema(toolWithLongDesc);

      expect(schema.function.description).toContain('This is a very long description');
    });

    it('应该处理嵌套参数', () => {
      const toolWithNestedParams: Tool = {
        ...mockTool1,
        parameters: {
          type: 'object',
          properties: {
            config: {
              type: 'object',
              description: 'Configuration object',
              properties: {
                enabled: {
                  type: 'boolean',
                  description: 'Enable flag'
                }
              },
              required: ['enabled']
            }
          },
          required: ['config']
        }
      };

      const schema = toFunctionCallSchema(toolWithNestedParams);

      expect(schema.function.parameters.properties.config.properties!.enabled).toBeDefined();
    });

    it('应该处理数组参数', () => {
      const toolWithArrayParams: Tool = {
        ...mockTool1,
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'Array of items',
              items: {
                type: 'string',
                description: 'Item name'
              }
            }
          },
          required: ['items']
        }
      };

      const schema = toFunctionCallSchema(toolWithArrayParams);

      expect(schema.function.parameters.properties.items.type).toBe('array');
      expect(schema.function.parameters.properties.items.items!.type).toBe('string');
    });
  });
});
