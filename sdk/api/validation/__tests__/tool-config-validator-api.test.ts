/**
 * ToolConfigValidatorAPI测试用例
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ToolConfigValidatorAPI } from '../tool-config-validator-api';
import { ToolType } from '../../../types/tool';
import type { Tool, ToolParameters } from '../../../types/tool';

describe('ToolConfigValidatorAPI', () => {
  let validatorAPI: ToolConfigValidatorAPI;

  beforeEach(() => {
    validatorAPI = new ToolConfigValidatorAPI();
  });

  describe('validateTool', () => {
    it('应该验证有效的工具定义', async () => {
      const validTool: Tool = {
        id: 'test-tool',
        name: 'test-tool',
        type: ToolType.STATELESS,
        description: 'Test tool',
        parameters: {
          properties: {
            input: {
              type: 'string',
              description: 'Input parameter'
            }
          },
          required: ['input']
        },
        config: {
          execute: async (params: any) => ({ result: 'success' })
        }
      };

      const result = await validatorAPI.validateTool(validTool);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝缺少必需字段的工具', async () => {
      const invalidTool = {
        id: 'test-tool',
        name: 'test-tool',
        type: ToolType.STATELESS
      } as any;

      const result = await validatorAPI.validateTool(invalidTool);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝无效的工具类型', async () => {
      const invalidTool = {
        id: 'test-tool',
        name: 'test-tool',
        type: 'invalid-type',
        description: 'Test tool',
        parameters: {
          properties: {},
          required: []
        }
      } as any;

      const result = await validatorAPI.validateTool(invalidTool);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateParameters', () => {
    it('应该验证有效的参数schema', async () => {
      const validParameters: ToolParameters = {
        properties: {
          input: {
            type: 'string',
            description: 'Input parameter'
          },
          count: {
            type: 'number',
            description: 'Count parameter'
          }
        },
        required: ['input']
      };

      const result = await validatorAPI.validateParameters(validParameters);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝必需参数未在properties中定义', async () => {
      const invalidParameters = {
        properties: {
          input: {
            type: 'string'
          }
        },
        required: ['input', 'missing']
      } as any;

      const result = await validatorAPI.validateParameters(invalidParameters);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateToolConfig', () => {
    it('应该验证无状态工具配置', async () => {
      const config = {
        execute: async (params: any) => ({ result: 'success' })
      };

      const result = await validatorAPI.validateToolConfig(ToolType.STATELESS, config);
      expect(result.valid).toBe(true);
    });

    it('应该验证有状态工具配置', async () => {
      const config = {
        factory: {
          create: () => ({
            execute: async (params: any) => ({ result: 'success' })
          })
        }
      };

      const result = await validatorAPI.validateToolConfig(ToolType.STATEFUL, config);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝无效的工具配置', async () => {
      const config = {};

      const result = await validatorAPI.validateToolConfig(ToolType.STATELESS, config);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateToolCallParameters', () => {
    it('应该验证有效的工具调用参数', async () => {
      const tool: Tool = {
        id: 'test-tool',
        name: 'test-tool',
        type: ToolType.STATELESS,
        description: 'Test tool',
        parameters: {
          properties: {
            input: {
              type: 'string',
              description: 'Input parameter'
            }
          },
          required: ['input']
        },
        config: {
          execute: async (params: any) => ({ result: 'success' })
        }
      };

      const parameters = {
        input: 'test value'
      };

      const result = await validatorAPI.validateToolCallParameters(tool, parameters);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝缺少必需参数的调用', async () => {
      const tool: Tool = {
        id: 'test-tool',
        name: 'test-tool',
        type: ToolType.STATELESS,
        description: 'Test tool',
        parameters: {
          properties: {
            input: {
              type: 'string',
              description: 'Input parameter'
            }
          },
          required: ['input']
        },
        config: {
          execute: async (params: any) => ({ result: 'success' })
        }
      };

      const parameters = {};

      const result = await validatorAPI.validateToolCallParameters(tool, parameters);
      expect(result.valid).toBe(false);
    });

    it('应该拒绝参数类型不匹配的调用', async () => {
      const tool: Tool = {
        id: 'test-tool',
        name: 'test-tool',
        type: ToolType.STATELESS,
        description: 'Test tool',
        parameters: {
          properties: {
            count: {
              type: 'number',
              description: 'Count parameter'
            }
          },
          required: ['count']
        },
        config: {
          execute: async (params: any) => ({ result: 'success' })
        }
      };

      const parameters = {
        count: 'not a number'
      };

      const result = await validatorAPI.validateToolCallParameters(tool, parameters);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateToolCompatibility', () => {
    it('应该验证REST工具的网络兼容性', async () => {
      const tool: Tool = {
        id: 'test-tool',
        name: 'test-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {},
          required: []
        },
        config: {
          baseUrl: 'https://api.example.com'
        }
      };

      const environment = {
        networkAvailable: true
      };

      const result = await validatorAPI.validateToolCompatibility(tool, environment);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝REST工具在无网络环境下的使用', async () => {
      const tool: Tool = {
        id: 'test-tool',
        name: 'test-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {},
          required: []
        },
        config: {
          baseUrl: 'https://api.example.com'
        }
      };

      const environment = {
        networkAvailable: false
      };

      const result = await validatorAPI.validateToolCompatibility(tool, environment);
      expect(result.valid).toBe(false);
    });
  });

  describe('getToolConfigValidator', () => {
    it('应该返回底层ToolConfigValidator实例', () => {
      const validator = validatorAPI.getToolConfigValidator();
      expect(validator).toBeDefined();
      expect(validator.constructor.name).toBe('ToolConfigValidator');
    });
  });
});