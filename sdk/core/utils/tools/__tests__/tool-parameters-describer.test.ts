/**
 * ToolParametersDescriber 单元测试
 * 测试工具参数描述生成功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateToolParametersDescription,
  generateSimpleParametersDescription,
  getRequiredParameters,
  getOptionalParameters,
  hasParameters
} from '../tool-parameters-describer.js';
import type { Tool } from '@modular-agent/types';

// Mock 模板和工具
vi.mock('@modular-agent/common-utils', () => ({
  renderTemplate: vi.fn((template: string, variables: Record<string, unknown>) => {
    // 简单的模板渲染实现用于测试
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(variables[key] || ''));
  })
}));

vi.mock('@modular-agent/prompt-templates', () => ({
  TOOL_PARAMETERS_SCHEMA_TEMPLATE: {
    content: 'Tool: {{toolName}} ({{toolId}})\nDescription: {{toolDescription}}\nSchema: {{parametersSchema}}\nParameters:\n{{parametersDescription}}'
  },
  PARAMETER_DESCRIPTION_LINE_TEMPLATE: '- {{paramName}} ({{paramType}}): {{paramDescription}} {{required}}'
}));

describe('ToolParametersDescriber', () => {
  let mockTool: Tool;

  beforeEach(() => {
    mockTool = {
      id: 'test-tool-1',
      name: 'Calculator',
      type: 'STATELESS' as const,
      description: 'Performs basic calculations',
      parameters: {
        type: 'object',
        properties: {
          a: {
            type: 'number' as const,
            description: 'First number'
          },
          b: {
            type: 'number' as const,
            description: 'Second number'
          },
          operator: {
            type: 'string' as const,
            description: 'Mathematical operator (+, -, *, /)'
          }
        },
        required: ['a', 'b']
      }
    };
  });

  describe('generateToolParametersDescription', () => {
    it('应该生成完整的工具参数描述', () => {
      const description = generateToolParametersDescription(mockTool);

      expect(description).toContain('Tool: Calculator');
      expect(description).toContain('test-tool-1');
      expect(description).toContain('Performs basic calculations');
      expect(description).toContain('Schema:');
      expect(description).toContain('Parameters:');
    });

    it('应该包含参数的 JSON Schema', () => {
      const description = generateToolParametersDescription(mockTool);

      expect(description).toContain('"type": "number"');
      expect(description).toContain('"type": "string"');
    });

    it('应该包含参数说明', () => {
      const description = generateToolParametersDescription(mockTool);

      expect(description).toContain('- a (number)');
      expect(description).toContain('- b (number)');
      expect(description).toContain('- operator (string)');
    });

    it('应该标记必填参数', () => {
      const description = generateToolParametersDescription(mockTool);

      expect(description).toContain('(required)');
    });

    it('应该标记可选参数', () => {
      const description = generateToolParametersDescription(mockTool);

      expect(description).toContain('(optional)');
    });

    it('应该处理没有描述的工具', () => {
      const toolWithoutDesc = {
        ...mockTool,
        description: undefined as unknown as string
      };

      const description = generateToolParametersDescription(toolWithoutDesc);

      expect(description).toContain('No description');
    });

    it('应该处理没有参数描述的参数', () => {
      const toolWithoutParamDesc = {
        ...mockTool,
        parameters: {
          ...mockTool.parameters,
          properties: {
            a: {
              type: 'number' as const,
              description: undefined as unknown as string
            }
          },
          required: ['a']
        }
      };

      const description = generateToolParametersDescription(toolWithoutParamDesc);

      expect(description).toContain('No description');
    });
  });

  describe('generateSimpleParametersDescription', () => {
    it('应该生成简化的参数说明', () => {
      const description = generateSimpleParametersDescription(mockTool);

      expect(description).toContain('- a (number)');
      expect(description).toContain('- b (number)');
      expect(description).toContain('- operator (string)');
    });

    it('应该包含必填和可选标记', () => {
      const description = generateSimpleParametersDescription(mockTool);

      expect(description).toContain('(required)');
      expect(description).toContain('(optional)');
    });

    it('不应该包含工具名称和 Schema', () => {
      const description = generateSimpleParametersDescription(mockTool);

      expect(description).not.toContain('Tool: Calculator');
      expect(description).not.toContain('Schema:');
    });
  });

  describe('getRequiredParameters', () => {
    it('应该返回所有必填参数', () => {
      const required = getRequiredParameters(mockTool);

      expect(required).toEqual(['a', 'b']);
      expect(required).toHaveLength(2);
    });

    it('应该返回空数组如果工具没有必填参数', () => {
      const toolWithoutRequired = {
        ...mockTool,
        parameters: {
          ...mockTool.parameters,
          required: []
        }
      };

      const required = getRequiredParameters(toolWithoutRequired);

      expect(required).toEqual([]);
    });

    it('应该处理 undefined 的 required 字段', () => {
      const toolWithUndefinedRequired = {
        ...mockTool,
        parameters: {
          ...mockTool.parameters,
          required: undefined as unknown as string[]
        }
      };

      const required = getRequiredParameters(toolWithUndefinedRequired);

      expect(required).toEqual([]);
    });
  });

  describe('getOptionalParameters', () => {
    it('应该返回所有可选参数', () => {
      const optional = getOptionalParameters(mockTool);

      expect(optional).toEqual(['operator']);
      expect(optional).toHaveLength(1);
    });

    it('应该返回空数组如果所有参数都是必填的', () => {
      const toolAllRequired = {
        ...mockTool,
        parameters: {
          ...mockTool.parameters,
          required: ['a', 'b', 'operator']
        }
      };

      const optional = getOptionalParameters(toolAllRequired);

      expect(optional).toEqual([]);
    });

    it('应该返回所有参数如果所有参数都是可选的', () => {
      const toolAllOptional = {
        ...mockTool,
        parameters: {
          ...mockTool.parameters,
          required: []
        }
      };

      const optional = getOptionalParameters(toolAllOptional);

      expect(optional).toEqual(['a', 'b', 'operator']);
      expect(optional).toHaveLength(3);
    });
  });

  describe('hasParameters', () => {
    it('应该返回 true 如果工具有参数', () => {
      expect(hasParameters(mockTool)).toBe(true);
    });

    it('应该返回 false 如果工具没有参数', () => {
      const toolWithoutParams = {
        ...mockTool,
        parameters: {
          type: 'object' as const,
          properties: {},
          required: []
        }
      };

      expect(hasParameters(toolWithoutParams)).toBe(false);
    });

    it('应该处理空对象', () => {
      const toolWithEmptyParams = {
        ...mockTool,
        parameters: {
          type: 'object' as const,
          properties: {},
          required: []
        }
      };

      expect(hasParameters(toolWithEmptyParams)).toBe(false);
    });
  });

  describe('嵌套对象参数', () => {
    let toolWithNestedObject: Tool;

    beforeEach(() => {
      toolWithNestedObject = {
        id: 'nested-tool',
        name: 'NestedTool',
        type: 'STATELESS' as const,
        description: 'Tool with nested parameters',
        parameters: {
          type: 'object',
          properties: {
            config: {
              type: 'object',
              description: 'Configuration object',
              properties: {
                timeout: {
                  type: 'number' as const,
                  description: 'Timeout in milliseconds'
                },
                retries: {
                  type: 'number' as const,
                  description: 'Number of retries'
                }
              },
              required: ['timeout']
            },
            name: {
              type: 'string' as const,
              description: 'Tool name'
            }
          },
          required: ['config']
        }
      };
    });

    it('应该生成嵌套对象的参数描述', () => {
      const description = generateToolParametersDescription(toolWithNestedObject);

      expect(description).toContain('- config (object)');
      expect(description).toContain('- timeout (number)');
      expect(description).toContain('- retries (number)');
    });

    it('应该正确标记嵌套对象的必填参数', () => {
      const description = generateSimpleParametersDescription(toolWithNestedObject);

      expect(description).toContain('(required)');
    });
  });

  describe('数组类型参数', () => {
    let toolWithArray: Tool;

    beforeEach(() => {
      toolWithArray = {
        id: 'array-tool',
        name: 'ArrayTool',
        type: 'STATELESS' as const,
        description: 'Tool with array parameters',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'Array of items',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string' as const,
                    description: 'Item ID'
                  },
                  value: {
                    type: 'number' as const,
                    description: 'Item value'
                  }
                },
                required: ['id']
              }
            }
          },
          required: ['items']
        }
      };
    });

    it('应该生成数组类型的参数描述', () => {
      const description = generateToolParametersDescription(toolWithArray);

      expect(description).toContain('- items (array)');
      expect(description).toContain('Array items:');
    });

    it('应该包含数组元素的描述', () => {
      const description = generateSimpleParametersDescription(toolWithArray);

      expect(description).toContain('- id (string)');
      expect(description).toContain('- value (number)');
    });
  });
});
