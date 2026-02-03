/**
 * Tool配置验证器测试
 */

import { ToolConfigValidator } from '../tool-config-validator';
import { ValidationError } from '../../../types/errors';
import { ToolType } from '../../../types/tool';

describe('ToolConfigValidator', () => {
  let validator: ToolConfigValidator;

  beforeEach(() => {
    validator = new ToolConfigValidator();
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

      expect(() => validator.validateTool(validTool)).not.toThrow();
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

      expect(() => validator.validateTool(validTool)).not.toThrow();
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

      expect(() => validator.validateTool(validTool)).not.toThrow();
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

      expect(() => validator.validateTool(validTool)).not.toThrow();
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
          execute: async () => {},
        },
      } as any;

      expect(() => validator.validateTool(invalidTool)).toThrow(ValidationError);
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
          execute: async () => {},
        },
      };

      expect(() => validator.validateTool(invalidTool)).toThrow(ValidationError);
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

      expect(() => validator.validateTool(invalidTool)).toThrow(ValidationError);
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

      expect(() => validator.validateParameters(validParameters)).not.toThrow();
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

      expect(() => validator.validateParameters(invalidParameters)).toThrow(ValidationError);
    });
  });

  describe('validateToolConfig', () => {
    it('应该验证有效的无状态工具配置', () => {
      const validConfig = {
        execute: async (params: any) => params.input,
      };

      expect(() => validator.validateToolConfig(ToolType.STATELESS, validConfig)).not.toThrow();
    });

    it('应该验证有效的有状态工具配置', () => {
      const validConfig = {
        factory: {
          create: () => ({}),
        },
      };

      expect(() => validator.validateToolConfig(ToolType.STATEFUL, validConfig)).not.toThrow();
    });

    it('应该验证有效的REST工具配置', () => {
      const validConfig = {
        baseUrl: 'https://api.example.com',
        timeout: 5000,
      };

      expect(() => validator.validateToolConfig(ToolType.REST, validConfig)).not.toThrow();
    });

    it('应该验证有效的MCP工具配置', () => {
      const validConfig = {
        serverName: 'test-server',
        serverUrl: 'ws://localhost:8080',
      };

      expect(() => validator.validateToolConfig(ToolType.MCP, validConfig)).not.toThrow();
    });

    it('应该抛出ValidationError当配置无效', () => {
      const invalidConfig = {
        // 缺少serverName
        serverUrl: 'ws://localhost:8080',
      };

      expect(() => validator.validateToolConfig(ToolType.MCP, invalidConfig)).toThrow(ValidationError);
    });
  });

  describe('validateToolCallParameters', () => {
    it('应该验证有效的工具调用参数', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: ToolType.STATELESS,
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
          execute: async () => {},
        },
      };

      const validParameters = {
        name: 'John',
        age: 30,
      };

      expect(() => validator.validateToolCallParameters(tool, validParameters)).not.toThrow();
    });

    it('应该抛出ValidationError当缺少必需参数', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: ToolType.STATELESS,
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
          execute: async () => {},
        },
      };

      const invalidParameters = {
        // 缺少name参数
        age: 30,
      };

      expect(() => validator.validateToolCallParameters(tool, invalidParameters)).toThrow(ValidationError);
    });

    it('应该抛出ValidationError当参数类型不匹配', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: ToolType.STATELESS,
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
          execute: async () => {},
        },
      };

      const invalidParameters = {
        age: 'thirty', // 应该是数字，不是字符串
      };

      expect(() => validator.validateToolCallParameters(tool, invalidParameters)).toThrow(ValidationError);
    });

    it('应该验证枚举参数', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: ToolType.STATELESS,
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
          execute: async () => {},
        },
      };

      const validParameters = {
        status: 'active',
      };

      expect(() => validator.validateToolCallParameters(tool, validParameters)).not.toThrow();

      const invalidParameters = {
        status: 'invalid', // 不在枚举中
      };

      expect(() => validator.validateToolCallParameters(tool, invalidParameters)).toThrow(ValidationError);
    });

    it('应该验证格式约束', () => {
      const tool = {
        id: 'tool-1',
        name: 'test-tool',
        type: ToolType.STATELESS,
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
          execute: async () => {},
        },
      };

      const validParameters = {
        email: 'test@example.com',
        url: 'https://example.com',
      };

      expect(() => validator.validateToolCallParameters(tool, validParameters)).not.toThrow();

      const invalidParameters = {
        email: 'invalid-email',
        url: 'not-a-url',
      };

      expect(() => validator.validateToolCallParameters(tool, invalidParameters)).toThrow(ValidationError);
    });
  });

  describe('validateToolCompatibility', () => {
    it('应该验证工具与环境的兼容性', () => {
      const tool = {
        id: 'tool-1',
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
        },
      };

      const compatibleEnvironment = {
        networkAvailable: true,
        mcpAvailable: true,
      };

      expect(() => validator.validateToolCompatibility(tool, compatibleEnvironment)).not.toThrow();
    });

    it('应该抛出ValidationError当环境不满足要求', () => {
      const tool = {
        id: 'tool-1',
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
        },
      };

      const incompatibleEnvironment = {
        networkAvailable: false, // 网络不可用
      };

      expect(() => validator.validateToolCompatibility(tool, incompatibleEnvironment)).toThrow(ValidationError);
    });
  });
});