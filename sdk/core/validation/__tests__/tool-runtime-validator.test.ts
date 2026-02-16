/**
 * 运行时验证器测试
 * 测试工具参数的运行时检查（执行时验证）
 */

import { RuntimeValidator } from '../tool-runtime-validator';
import { ToolType } from '@modular-agent/types';
import { RuntimeValidationError } from '@modular-agent/types';

describe('RuntimeValidator', () => {
  let validator: RuntimeValidator;

  beforeEach(() => {
    validator = new RuntimeValidator();
  });

  describe('validate', () => {
    it('应该验证有效的工具调用参数', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: 'STATELESS',
        description: 'A test tool',
        parameters: {
          properties: {
            name: {
              type: 'string' as const,
              description: 'Name parameter',
            },
            age: {
              type: 'number' as const,
              description: 'Age parameter',
            },
          },
          required: ['name'],
        },
        config: {
          execute: async () => { },
        },
      };

      const validParameters = {
        name: 'John',
        age: 30,
      };

      expect(() => validator.validate(tool, validParameters)).not.toThrow();
    });

    it('应该抛出RuntimeValidationError当缺少必需参数', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: 'STATELESS',
        description: 'A test tool',
        parameters: {
          properties: {
            name: {
              type: 'string' as const,
              description: 'Name parameter',
            },
          },
          required: ['name'],
        },
        config: {
          execute: async () => { },
        },
      };

      const invalidParameters = {
        // 缺少name参数
        age: 30,
      };

      expect(() => validator.validate(tool, invalidParameters)).toThrow(RuntimeValidationError);
    });

    it('应该抛出RuntimeValidationError当参数类型不匹配', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: 'STATELESS',
        description: 'A test tool',
        parameters: {
          properties: {
            age: {
              type: 'number' as const,
              description: 'Age parameter',
            },
          },
          required: ['age'],
        },
        config: {
          execute: async () => { },
        },
      };

      const invalidParameters = {
        age: 'thirty', // 应该是数字，不是字符串
      };

      expect(() => validator.validate(tool, invalidParameters)).toThrow(RuntimeValidationError);
    });

    it('应该验证枚举参数', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: 'STATELESS',
        description: 'A test tool',
        parameters: {
          properties: {
            status: {
              type: 'string' as const,
              description: 'Status parameter',
              enum: ['active', 'inactive'],
            },
          },
          required: ['status'],
        },
        config: {
          execute: async () => { },
        },
      };

      const validParameters = {
        status: 'active',
      };

      expect(() => validator.validate(tool, validParameters)).not.toThrow();

      const invalidParameters = {
        status: 'invalid', // 不在枚举中
      };

      expect(() => validator.validate(tool, invalidParameters)).toThrow(RuntimeValidationError);
    });

    it('应该验证格式约束', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: 'STATELESS',
        description: 'A test tool',
        parameters: {
          properties: {
            email: {
              type: 'string' as const,
              description: 'Email parameter',
              format: 'email',
            },
            url: {
              type: 'string' as const,
              description: 'URL parameter',
              format: 'uri',
            },
          },
          required: ['email', 'url'],
        },
        config: {
          execute: async () => { },
        },
      };

      const validParameters = {
        email: 'test@example.com',
        url: 'https://example.com',
      };

      expect(() => validator.validate(tool, validParameters)).not.toThrow();

      const invalidParameters = {
        email: 'invalid-email',
        url: 'not-a-url',
      };

      expect(() => validator.validate(tool, invalidParameters)).toThrow(RuntimeValidationError);
    });

    it('应该验证integer类型', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: 'STATELESS',
        description: 'A test tool',
        parameters: {
          properties: {
            count: {
              type: 'integer' as const,
              description: 'Count parameter',
            },
          },
          required: ['count'],
        },
        config: {
          execute: async () => { },
        },
      };

      const validParameters = {
        count: 42,
      };

      expect(() => validator.validate(tool, validParameters)).not.toThrow();

      const invalidParameters = {
        count: 42.5, // 不是整数
      };

      expect(() => validator.validate(tool, invalidParameters)).toThrow(RuntimeValidationError);
    });

    it('应该验证boolean类型', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: 'STATELESS',
        description: 'A test tool',
        parameters: {
          properties: {
            enabled: {
              type: 'boolean' as const,
              description: 'Enabled parameter',
            },
          },
          required: ['enabled'],
        },
        config: {
          execute: async () => { },
        },
      };

      const validParameters = {
        enabled: true,
      };

      expect(() => validator.validate(tool, validParameters)).not.toThrow();

      const invalidParameters = {
        enabled: 'true', // 应该是布尔值
      };

      expect(() => validator.validate(tool, invalidParameters)).toThrow(RuntimeValidationError);
    });

    it('应该验证array类型', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: 'STATELESS',
        description: 'A test tool',
        parameters: {
          properties: {
            items: {
              type: 'array' as const,
              description: 'Items parameter',
            },
          },
          required: ['items'],
        },
        config: {
          execute: async () => { },
        },
      };

      const validParameters = {
        items: [1, 2, 3],
      };

      expect(() => validator.validate(tool, validParameters)).not.toThrow();

      const invalidParameters = {
        items: 'not-an-array',
      };

      expect(() => validator.validate(tool, invalidParameters)).toThrow(RuntimeValidationError);
    });

    it('应该验证object类型', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: 'STATELESS',
        description: 'A test tool',
        parameters: {
          properties: {
            metadata: {
              type: 'object' as const,
              description: 'Metadata parameter',
            },
          },
          required: ['metadata'],
        },
        config: {
          execute: async () => { },
        },
      };

      const validParameters = {
        metadata: { key: 'value' },
      };

      expect(() => validator.validate(tool, validParameters)).not.toThrow();

      const invalidParameters = {
        metadata: 'not-an-object',
      };

      expect(() => validator.validate(tool, invalidParameters)).toThrow(RuntimeValidationError);
    });

    it('应该验证null类型', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: 'STATELESS',
        description: 'A test tool',
        parameters: {
          properties: {
            value: {
              type: 'null' as const,
              description: 'Value parameter',
            },
          },
          required: ['value'],
        },
        config: {
          execute: async () => { },
        },
      };

      const validParameters = {
        value: null,
      };

      expect(() => validator.validate(tool, validParameters)).not.toThrow();

      const invalidParameters = {
        value: 'not-null',
      };

      expect(() => validator.validate(tool, invalidParameters)).toThrow(RuntimeValidationError);
    });

    it('应该允许可选参数缺失', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: 'STATELESS',
        description: 'A test tool',
        parameters: {
          properties: {
            name: {
              type: 'string' as const,
              description: 'Name parameter',
            },
            age: {
              type: 'number' as const,
              description: 'Age parameter',
            },
          },
          required: ['name'], // age是可选的
        },
        config: {
          execute: async () => { },
        },
      };

      const validParameters = {
        name: 'John',
        // age缺失，但它是可选的
      };

      expect(() => validator.validate(tool, validParameters)).not.toThrow();
    });

    it('应该验证uuid格式', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: 'STATELESS',
        description: 'A test tool',
        parameters: {
          properties: {
            id: {
              type: 'string' as const,
              description: 'ID parameter',
              format: 'uuid',
            },
          },
          required: ['id'],
        },
        config: {
          execute: async () => { },
        },
      };

      const validParameters = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      };

      expect(() => validator.validate(tool, validParameters)).not.toThrow();

      const invalidParameters = {
        id: 'not-a-uuid',
      };

      expect(() => validator.validate(tool, invalidParameters)).toThrow(RuntimeValidationError);
    });

    it('应该验证date-time格式', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: 'STATELESS',
        description: 'A test tool',
        parameters: {
          properties: {
            timestamp: {
              type: 'string' as const,
              description: 'Timestamp parameter',
              format: 'date-time',
            },
          },
          required: ['timestamp'],
        },
        config: {
          execute: async () => { },
        },
      };

      const validParameters = {
        timestamp: '2024-01-01T00:00:00Z',
      };

      expect(() => validator.validate(tool, validParameters)).not.toThrow();

      const invalidParameters = {
        timestamp: 'not-a-datetime',
      };

      expect(() => validator.validate(tool, invalidParameters)).toThrow(RuntimeValidationError);
    });
  });
});