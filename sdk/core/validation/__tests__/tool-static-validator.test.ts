/**
 * 静态验证器测试
 * 测试工具配置的静态检查（注册时验证）
 */

import { StaticValidator } from '../tool-static-validator';
import { ToolType } from '@modular-agent/types';

describe('StaticValidator', () => {
  let validator: StaticValidator;

  beforeEach(() => {
    validator = new StaticValidator();
  });

  describe('validateTool', () => {
    it('应该验证有效的无状态工具定义', () => {
      const validTool = {
        id: 'tool-1',
        name: 'test-tool',
        type: ToolType.STATELESS,
        description: 'A test tool',
        parameters: {
          properties: {
            input: {
              type: 'string' as const,
              description: 'Input parameter',
            },
          },
          required: ['input'],
        },
        config: {
          execute: async (params: any) => params.input,
        },
      };

      const result = validator.validateTool(validTool);
      expect(result.isOk()).toBe(true);
    });

    it('应该验证有效的有状态工具定义', () => {
      const validTool = {
        id: 'tool-2',
        name: 'test-stateful-tool',
        type: ToolType.STATEFUL,
        description: 'A test stateful tool',
        parameters: {
          properties: {
            value: {
              type: 'number' as const,
              description: 'Value parameter',
            },
          },
          required: ['value'],
        },
        config: {
          factory: {
            create: () => ({
              process: (value: number) => value * 2,
            }),
          },
        },
      };

      const result = validator.validateTool(validTool);
      expect(result.isOk()).toBe(true);
    });

    it('应该验证有效的REST工具定义', () => {
      const validTool = {
        id: 'tool-3',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'A test REST tool',
        parameters: {
          properties: {
            endpoint: {
              type: 'string' as const,
              description: 'API endpoint',
            },
          },
          required: ['endpoint'],
        },
        config: {
          baseUrl: 'https://api.example.com',
          timeout: 5000,
        },
      };

      const result = validator.validateTool(validTool);
      expect(result.isOk()).toBe(true);
    });

    it('应该验证有效的MCP工具定义', () => {
      const validTool = {
        id: 'tool-4',
        name: 'test-mcp-tool',
        type: ToolType.MCP,
        description: 'A test MCP tool',
        parameters: {
          properties: {
            query: {
              type: 'string' as const,
              description: 'Query parameter',
            },
          },
          required: ['query'],
        },
        config: {
          serverName: 'test-server',
          serverUrl: 'ws://localhost:8080',
        },
      };

      const result = validator.validateTool(validTool);
      expect(result.isOk()).toBe(true);
    });

    it('应该抛出ValidationError当工具缺少必需字段', () => {
      const invalidTool = {
        id: 'tool-1',
        // 缺少name字段
        type: ToolType.STATELESS,
        description: 'A test tool',
        parameters: {
          properties: {},
          required: [],
        },
        config: {
          execute: async () => { },
        },
      } as any;

      const result = validator.validateTool(invalidTool);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
      }
    });

    it('应该抛出ValidationError当参数schema无效', () => {
      const invalidTool = {
        id: 'tool-1',
        name: 'test-tool',
        type: ToolType.STATELESS,
        description: 'A test tool',
        parameters: {
          properties: {},
          required: ['missing-param'], // 必需的参数未在properties中定义
        },
        config: {
          execute: async () => { },
        },
      };

      const result = validator.validateTool(invalidTool);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
      }
    });

    it('应该抛出ValidationError当工具配置与类型不匹配', () => {
      const invalidTool = {
        id: 'tool-1',
        name: 'test-tool',
        type: ToolType.STATELESS,
        description: 'A test tool',
        parameters: {
          properties: {
            input: {
              type: 'string' as const,
              description: 'Input parameter',
            },
          },
          required: ['input'],
        },
        config: {
          // 缺少execute函数
          invalidField: 'value',
        } as any, // 使用类型断言绕过类型检查
      };

      const result = validator.validateTool(invalidTool);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
      }
    });
  });

  describe('validateParameters', () => {
    it('应该验证有效的参数schema', () => {
      const validParameters = {
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
      };

      const result = validator.validateParameters(validParameters);
      expect(result.isOk()).toBe(true);
    });

    it('应该抛出ValidationError当参数schema无效', () => {
      const invalidParameters = {
        properties: {
          name: {
            type: 'string' as const,
          },
        },
        required: ['age'], // 必需的参数未在properties中定义
      };

      const result = validator.validateParameters(invalidParameters);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
      }
    });
  });

  describe('validateToolConfig', () => {
    it('应该验证有效的无状态工具配置', () => {
      const validConfig = {
        execute: async (params: any) => params.input,
      };

      const result = validator.validateToolConfig(ToolType.STATELESS, validConfig);
      expect(result.isOk()).toBe(true);
    });

    it('应该验证有效的有状态工具配置', () => {
      const validConfig = {
        factory: {
          create: () => ({}),
        },
      };

      const result = validator.validateToolConfig(ToolType.STATEFUL, validConfig);
      expect(result.isOk()).toBe(true);
    });

    it('应该验证有效的REST工具配置', () => {
      const validConfig = {
        baseUrl: 'https://api.example.com',
        timeout: 5000,
      };

      const result = validator.validateToolConfig(ToolType.REST, validConfig);
      expect(result.isOk()).toBe(true);
    });

    it('应该验证有效的MCP工具配置', () => {
      const validConfig = {
        serverName: 'test-server',
        serverUrl: 'ws://localhost:8080',
      };

      const result = validator.validateToolConfig(ToolType.MCP, validConfig);
      expect(result.isOk()).toBe(true);
    });

    it('应该抛出ValidationError当配置无效', () => {
      const invalidConfig = {
        // 缺少serverName
        serverUrl: 'ws://localhost:8080',
      };

      const result = validator.validateToolConfig(ToolType.MCP, invalidConfig);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
      }
    });
  });
});