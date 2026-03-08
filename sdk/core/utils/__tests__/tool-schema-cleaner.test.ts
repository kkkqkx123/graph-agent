/**
 * ToolSchemaCleaner 单元测试
 * 测试工具 Schema 清理功能
 */

import { describe, it, expect } from 'vitest';
import {
  cleanForGemini,
  cleanForAnthropic,
  cleanForOpenAI,
  cleanForProvider,
  cleanToolForProvider,
  cleanToolsForProvider,
  type LLMProvider
} from '../tool-schema-cleaner';
import type { ToolParameters } from '@modular-agent/types';

describe('ToolSchemaCleaner', () => {
  // 创建包含各种字段的测试参数 Schema
  const createTestParameters = (): ToolParameters => ({
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'User name',
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: '#/properties/name',
        examples: ['John', 'Jane'],
        default: 'Anonymous',
        minLength: 1,
        maxLength: 100,
        pattern: '^[a-zA-Z]+$'
      },
      age: {
        type: 'integer',
        description: 'User age',
        minimum: 0,
        maximum: 150,
        default: 18
      },
      email: {
        type: 'string',
        description: 'Email address',
        format: 'email'
      },
      tags: {
        type: 'array',
        description: 'User tags',
        items: {
          type: 'string',
          description: 'Tag name',
          $schema: 'https://json-schema.org/draft/2020-12/schema'
        }
      },
      config: {
        type: 'object',
        description: 'Configuration',
        properties: {
          enabled: {
            type: 'boolean',
            description: 'Enable flag',
            default: true
          },
          nested: {
            type: 'object',
            description: 'Nested object',
            properties: {
              value: {
                type: 'string',
                description: 'Nested value',
                $schema: 'https://json-schema.org/draft/2020-12/schema'
              }
            },
            required: ['value']
          }
        },
        required: ['enabled'],
        additionalProperties: false
      }
    },
    required: ['name', 'age']
  });

  describe('cleanForGemini', () => {
    it('应该移除 $schema 字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForGemini(params);

      expect(cleaned.properties.name.$schema).toBeUndefined();
    });

    it('应该移除 additionalProperties 字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForGemini(params);

      expect(cleaned.properties.config.additionalProperties).toBeUndefined();
    });

    it('应该移除 default 字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForGemini(params);

      expect(cleaned.properties.name.default).toBeUndefined();
      expect(cleaned.properties.age.default).toBeUndefined();
    });

    it('应该移除 examples 字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForGemini(params);

      expect(cleaned.properties.name.examples).toBeUndefined();
    });

    it('应该保留基本字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForGemini(params);

      expect(cleaned.properties.name.type).toBe('string');
      expect(cleaned.properties.name.description).toBe('User name');
      expect(cleaned.properties.name.minLength).toBe(1);
      expect(cleaned.properties.name.maxLength).toBe(100);
      expect(cleaned.properties.name.pattern).toBe('^[a-zA-Z]+$');
    });

    it('应该递归清理嵌套对象', () => {
      const params = createTestParameters();
      const cleaned = cleanForGemini(params);

      expect(cleaned.properties.config.properties.enabled.type).toBe('boolean');
      expect(cleaned.properties.config.properties.enabled.default).toBeUndefined();
      expect(cleaned.properties.config.properties.nested.properties.value.$schema).toBeUndefined();
    });

    it('应该递归清理数组元素', () => {
      const params = createTestParameters();
      const cleaned = cleanForGemini(params);

      expect(cleaned.properties.tags.items.type).toBe('string');
      expect(cleaned.properties.tags.items.$schema).toBeUndefined();
    });

    it('应该保留 required 字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForGemini(params);

      expect(cleaned.required).toEqual(['name', 'age']);
    });
  });

  describe('cleanForAnthropic', () => {
    it('应该移除 $schema 字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForAnthropic(params);

      expect(cleaned.properties.name.$schema).toBeUndefined();
    });

    it('应该保留 additionalProperties 字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForAnthropic(params);

      expect(cleaned.properties.config.additionalProperties).toBe(false);
    });

    it('应该保留 default 字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForAnthropic(params);

      expect(cleaned.properties.name.default).toBe('Anonymous');
      expect(cleaned.properties.age.default).toBe(18);
    });

    it('应该保留 examples 字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForAnthropic(params);

      expect(cleaned.properties.name.examples).toEqual(['John', 'Jane']);
    });

    it('应该保留基本字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForAnthropic(params);

      expect(cleaned.properties.name.type).toBe('string');
      expect(cleaned.properties.name.description).toBe('User name');
    });
  });

  describe('cleanForOpenAI', () => {
    it('应该移除 $schema 字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForOpenAI(params);

      expect(cleaned.properties.name.$schema).toBeUndefined();
    });

    it('应该保留 additionalProperties 字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForOpenAI(params);

      expect(cleaned.properties.config.additionalProperties).toBe(false);
    });

    it('应该保留 default 字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForOpenAI(params);

      expect(cleaned.properties.name.default).toBe('Anonymous');
    });

    it('应该保留基本字段', () => {
      const params = createTestParameters();
      const cleaned = cleanForOpenAI(params);

      expect(cleaned.properties.name.type).toBe('string');
      expect(cleaned.properties.name.description).toBe('User name');
    });
  });

  describe('cleanForProvider', () => {
    it('应该根据提供商选择正确的清理策略 - gemini', () => {
      const params = createTestParameters();
      const cleaned = cleanForProvider(params, 'gemini');

      expect(cleaned.properties.name.default).toBeUndefined();
    });

    it('应该根据提供商选择正确的清理策略 - anthropic', () => {
      const params = createTestParameters();
      const cleaned = cleanForProvider(params, 'anthropic');

      expect(cleaned.properties.name.default).toBe('Anonymous');
    });

    it('应该根据提供商选择正确的清理策略 - openai', () => {
      const params = createTestParameters();
      const cleaned = cleanForProvider(params, 'openai');

      expect(cleaned.properties.name.default).toBe('Anonymous');
    });

    it('默认应该使用 OpenAI 策略', () => {
      const params = createTestParameters();
      const cleaned = cleanForProvider(params, 'unknown' as LLMProvider);

      expect(cleaned.properties.name.$schema).toBeUndefined();
      expect(cleaned.properties.name.default).toBe('Anonymous');
    });
  });

  describe('cleanToolForProvider', () => {
    it('应该清理工具的参数 Schema', () => {
      const tool = {
        id: 'test-tool',
        name: 'TestTool',
        description: 'Test tool',
        parameters: createTestParameters()
      };

      const cleaned = cleanToolForProvider(tool, 'gemini');

      expect(cleaned.id).toBe('test-tool');
      expect(cleaned.name).toBe('TestTool');
      expect(cleaned.parameters.properties.name.$schema).toBeUndefined();
    });

    it('应该保留工具的其他属性', () => {
      const tool = {
        id: 'test-tool',
        name: 'TestTool',
        description: 'Test tool',
        type: 'native' as const,
        parameters: createTestParameters(),
        metadata: { category: 'test' }
      };

      const cleaned = cleanToolForProvider(tool, 'gemini');

      expect(cleaned.type).toBe('native');
      expect(cleaned.metadata).toEqual({ category: 'test' });
    });
  });

  describe('cleanToolsForProvider', () => {
    it('应该批量清理工具列表', () => {
      const tools = [
        {
          id: 'tool-1',
          name: 'Tool1',
          parameters: createTestParameters()
        },
        {
          id: 'tool-2',
          name: 'Tool2',
          parameters: createTestParameters()
        }
      ];

      const cleaned = cleanToolsForProvider(tools, 'gemini');

      expect(cleaned).toHaveLength(2);
      expect(cleaned[0].parameters.properties.name.$schema).toBeUndefined();
      expect(cleaned[1].parameters.properties.name.$schema).toBeUndefined();
    });

    it('应该处理空数组', () => {
      const cleaned = cleanToolsForProvider([], 'gemini');

      expect(cleaned).toHaveLength(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理空参数', () => {
      const params: ToolParameters = {
        type: 'object',
        properties: {},
        required: []
      };

      const cleaned = cleanForGemini(params);

      expect(cleaned.properties).toEqual({});
      expect(cleaned.required).toEqual([]);
    });

    it('应该处理没有 required 字段的参数', () => {
      const params: ToolParameters = {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name' }
        },
        required: []
      };

      const cleaned = cleanForGemini(params);

      expect(cleaned.required).toEqual([]);
    });

    it('应该处理枚举类型', () => {
      const params: ToolParameters = {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Status',
            enum: ['active', 'inactive']
          }
        },
        required: ['status']
      };

      const cleaned = cleanForGemini(params);

      expect(cleaned.properties.status.enum).toEqual(['active', 'inactive']);
    });

    it('应该处理格式字段', () => {
      const params: ToolParameters = {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'Email',
            format: 'email'
          }
        },
        required: ['email']
      };

      const cleaned = cleanForGemini(params);

      expect(cleaned.properties.email.format).toBe('email');
    });

    it('应该处理深层嵌套', () => {
      const params: ToolParameters = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            description: 'Level 1',
            properties: {
              level2: {
                type: 'object',
                description: 'Level 2',
                properties: {
                  level3: {
                    type: 'string',
                    description: 'Level 3',
                    $schema: 'https://json-schema.org/draft/2020-12/schema'
                  }
                },
                required: ['level3']
              }
            },
            required: ['level2']
          }
        },
        required: ['level1']
      };

      const cleaned = cleanForGemini(params);

      expect(
        cleaned.properties.level1.properties.level2.properties.level3.$schema
      ).toBeUndefined();
    });
  });
});
