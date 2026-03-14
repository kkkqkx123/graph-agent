/**
 * ParameterValidator 单元测试
 */

import { describe, it, expect } from 'vitest';
import { ParameterValidator } from '../ParameterValidator.js';
import type { Tool } from '@modular-agent/types';
import { RuntimeValidationError } from '@modular-agent/types';

describe('ParameterValidator', () => {
  const validator = new ParameterValidator();

  // 创建测试工具定义的辅助函数
  const createTool = (params: {
    properties: Record<string, any>;
    required?: string[];
  }): Tool => ({
    id: 'test-tool',
    name: 'Test Tool',
    type: 'STATELESS',
    description: 'A test tool',
    parameters: {
      type: 'object',
      properties: params.properties,
      required: params.required || []
    }
  });

  describe('validate', () => {
    describe('基本类型验证', () => {
      it('应该验证字符串类型参数', () => {
        const tool = createTool({
          properties: {
            name: { type: 'string' }
          },
          required: ['name']
        });

        // 有效参数
        expect(() => validator.validate(tool, { name: 'test' })).not.toThrow();

        // 无效参数 - 类型错误
        expect(() => validator.validate(tool, { name: 123 })).toThrow(RuntimeValidationError);
      });

      it('应该验证数字类型参数', () => {
        const tool = createTool({
          properties: {
            count: { type: 'number' }
          },
          required: ['count']
        });

        expect(() => validator.validate(tool, { count: 42 })).not.toThrow();
        expect(() => validator.validate(tool, { count: 3.14 })).not.toThrow();
        expect(() => validator.validate(tool, { count: '42' })).toThrow(RuntimeValidationError);
      });

      it('应该验证布尔类型参数', () => {
        const tool = createTool({
          properties: {
            enabled: { type: 'boolean' }
          },
          required: ['enabled']
        });

        expect(() => validator.validate(tool, { enabled: true })).not.toThrow();
        expect(() => validator.validate(tool, { enabled: false })).not.toThrow();
        expect(() => validator.validate(tool, { enabled: 'true' })).toThrow(RuntimeValidationError);
      });

      it('应该验证数组类型参数', () => {
        const tool = createTool({
          properties: {
            items: { type: 'array' }
          },
          required: ['items']
        });

        expect(() => validator.validate(tool, { items: [1, 2, 3] })).not.toThrow();
        expect(() => validator.validate(tool, { items: [] })).not.toThrow();
        expect(() => validator.validate(tool, { items: 'not-array' })).toThrow(RuntimeValidationError);
      });

      it('应该验证对象类型参数', () => {
        const tool = createTool({
          properties: {
            config: { type: 'object' }
          },
          required: ['config']
        });

        expect(() => validator.validate(tool, { config: { key: 'value' } })).not.toThrow();
        expect(() => validator.validate(tool, { config: {} })).not.toThrow();
        expect(() => validator.validate(tool, { config: 'not-object' })).toThrow(RuntimeValidationError);
      });
    });

    describe('必需参数验证', () => {
      it('应该在缺少必需参数时抛出错误', () => {
        const tool = createTool({
          properties: {
            name: { type: 'string' },
            age: { type: 'number' }
          },
          required: ['name', 'age']
        });

        // 缺少所有必需参数
        expect(() => validator.validate(tool, {})).toThrow(RuntimeValidationError);

        // 缺少部分必需参数
        expect(() => validator.validate(tool, { name: 'test' })).toThrow(RuntimeValidationError);

        // 所有必需参数都存在
        expect(() => validator.validate(tool, { name: 'test', age: 25 })).not.toThrow();
      });

      it('应该允许缺少可选参数', () => {
        const tool = createTool({
          properties: {
            name: { type: 'string' },
            nickname: { type: 'string' }
          },
          required: ['name']
        });

        expect(() => validator.validate(tool, { name: 'test' })).not.toThrow();
        expect(() => validator.validate(tool, { name: 'test', nickname: 'nick' })).not.toThrow();
      });
    });

    describe('枚举验证', () => {
      it('应该验证枚举值', () => {
        const tool = createTool({
          properties: {
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'pending']
            }
          },
          required: ['status']
        });

        expect(() => validator.validate(tool, { status: 'active' })).not.toThrow();
        expect(() => validator.validate(tool, { status: 'inactive' })).not.toThrow();
        expect(() => validator.validate(tool, { status: 'invalid' })).toThrow(RuntimeValidationError);
      });
    });

    describe('格式验证', () => {
      it('应该验证 URI 格式', () => {
        const tool = createTool({
          properties: {
            url: { type: 'string', format: 'uri' }
          },
          required: ['url']
        });

        expect(() => validator.validate(tool, { url: 'https://example.com' })).not.toThrow();
        expect(() => validator.validate(tool, { url: 'http://localhost:3000' })).not.toThrow();
        expect(() => validator.validate(tool, { url: 'not-a-url' })).toThrow(RuntimeValidationError);
      });

      it('应该验证 email 格式', () => {
        const tool = createTool({
          properties: {
            email: { type: 'string', format: 'email' }
          },
          required: ['email']
        });

        expect(() => validator.validate(tool, { email: 'test@example.com' })).not.toThrow();
        expect(() => validator.validate(tool, { email: 'invalid-email' })).toThrow(RuntimeValidationError);
      });

      it('应该验证 UUID 格式', () => {
        const tool = createTool({
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        });

        expect(() => validator.validate(tool, { id: '123e4567-e89b-12d3-a456-426614174000' })).not.toThrow();
        expect(() => validator.validate(tool, { id: 'not-a-uuid' })).toThrow(RuntimeValidationError);
      });

      it('应该验证 date-time 格式', () => {
        const tool = createTool({
          properties: {
            timestamp: { type: 'string', format: 'date-time' }
          },
          required: ['timestamp']
        });

        expect(() => validator.validate(tool, { timestamp: '2024-01-01T00:00:00Z' })).not.toThrow();
        expect(() => validator.validate(tool, { timestamp: '2024-01-01T00:00:00.000Z' })).not.toThrow();
        expect(() => validator.validate(tool, { timestamp: 'not-a-datetime' })).toThrow(RuntimeValidationError);
      });
    });

    describe('复杂参数验证', () => {
      it('应该验证多个参数', () => {
        const tool = createTool({
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
            email: { type: 'string', format: 'email' },
            active: { type: 'boolean' }
          },
          required: ['name', 'age']
        });

        expect(() => validator.validate(tool, {
          name: 'John',
          age: 30,
          email: 'john@example.com',
          active: true
        })).not.toThrow();

        expect(() => validator.validate(tool, {
          name: 'John',
          age: 30
        })).not.toThrow();
      });

      it('应该在验证失败时提供详细的错误信息', () => {
        const tool = createTool({
          properties: {
            email: { type: 'string', format: 'email' }
          },
          required: ['email']
        });

        try {
          validator.validate(tool, { email: 'invalid' });
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(RuntimeValidationError);
          expect((error as RuntimeValidationError).message).toContain('email');
        }
      });
    });

    describe('边界情况', () => {
      it('应该处理空参数对象', () => {
        const tool = createTool({
          properties: {},
          required: []
        });

        expect(() => validator.validate(tool, {})).not.toThrow();
      });

      it('应该处理未知类型（使用 any）', () => {
        const tool = createTool({
          properties: {
            data: { type: 'unknown-type' as any }
          },
          required: ['data']
        });

        // 未知类型应该接受任何值
        expect(() => validator.validate(tool, { data: 'anything' })).not.toThrow();
        expect(() => validator.validate(tool, { data: 123 })).not.toThrow();
        expect(() => validator.validate(tool, { data: null })).not.toThrow();
      });

      it('应该处理未知格式', () => {
        const tool = createTool({
          properties: {
            custom: { type: 'string', format: 'custom-format' }
          },
          required: ['custom']
        });

        // 未知格式应该接受任何字符串
        expect(() => validator.validate(tool, { custom: 'any-string' })).not.toThrow();
      });
    });
  });
});
