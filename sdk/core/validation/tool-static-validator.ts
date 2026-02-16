/**
 * 静态验证器
 * 负责工具配置的静态检查（注册时验证）
 * 包括：工具定义、参数schema、配置结构
 */

import { z } from 'zod';
import type {
  Tool,
  ToolParameters,
  ToolProperty,
  RestToolConfig
} from '@modular-agent/types';
import { ToolType } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

/**
 * 工具参数属性schema（基于JSON Schema Draft 2020-12）
 */
const toolPropertySchema: z.ZodType<ToolProperty> = z.lazy(() =>
  z.object({
    type: z.enum(['string', 'number', 'integer', 'boolean', 'array', 'object', 'null']),
    description: z.string().optional(),
    default: z.any().optional(),
    enum: z.array(z.any()).optional(),
    format: z.string().optional(),
    properties: z.record(z.string(), toolPropertySchema).optional(),
    required: z.array(z.string()).optional(),
    additionalProperties: z.union([z.boolean(), toolPropertySchema]).optional(),
  })
);

/**
 * 工具参数schema
 */
const toolParametersSchema = z.object({
  properties: z.record(z.string(), toolPropertySchema),
  required: z.array(z.string()),
}).refine(
  (data) => {
    // 验证required参数是否在properties中定义
    for (const requiredParam of data.required) {
      if (!(requiredParam in data.properties)) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Required parameters must be defined in properties',
    path: ['required'],
  }
);

/**
 * 无状态工具配置schema
 */
const statelessToolConfigSchema = z.object({
  execute: z.function(),
});

/**
 * 有状态工具工厂schema
 */
const statefulToolFactorySchema = z.object({
  create: z.function(),
});

/**
 * 有状态工具配置schema
 */
const statefulToolConfigSchema = z.object({
  factory: statefulToolFactorySchema,
});

/**
 * REST工具配置schema
 */
const restToolConfigSchema = z.object({
  baseUrl: z.string().url().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  timeout: z.number().positive().optional(),
  maxRetries: z.number().nonnegative().optional(),
  retryDelay: z.number().nonnegative().optional(),
});

/**
 * MCP工具配置schema
 */
const mcpToolConfigSchema = z.object({
  serverName: z.string().min(1, 'Server name is required'),
  serverUrl: z.string().url().optional(),
  timeout: z.number().positive().optional(),
});

/**
 * 工具元数据schema
 */
const toolMetadataSchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  documentationUrl: z.string().url().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

/**
 * 工具定义schema
 */
const toolSchema = z.object({
  id: z.string().min(1, 'Tool ID is required'),
  name: z.string().min(1, 'Tool name is required'),
  type: z.custom<ToolType>((val): val is ToolType =>
    ['STATELESS', 'STATEFUL', 'REST', 'MCP'].includes(val as ToolType)
  ),
  description: z.string().min(1, 'Tool description is required'),
  parameters: toolParametersSchema,
  metadata: toolMetadataSchema.optional(),
  config: z.any().optional(),
}).refine(
  (data) => {
    // 根据工具类型验证config字段
    switch (data.type) {
      case 'STATELESS':
        return statelessToolConfigSchema.safeParse(data.config).success;
      case 'STATEFUL':
        return statefulToolConfigSchema.safeParse(data.config).success;
      case 'MCP':
        return mcpToolConfigSchema.safeParse(data.config).success;
      case 'REST':
        // REST工具的config是可选的
        return data.config ? restToolConfigSchema.safeParse(data.config).success : true;
      default:
        return false;
    }
  },
  {
    message: 'Tool configuration is invalid for the specified type',
    path: ['config'],
  }
);

/**
 * 静态验证器
 * 负责工具配置的静态检查
 */
export class StaticValidator {
  /**
   * 验证工具定义
   * @param tool 工具定义
   * @returns 验证结果
   */
  validateTool(tool: Tool): Result<Tool, ConfigurationValidationError[]> {
    const result = toolSchema.safeParse(tool);
    if (!result.success) {
      const error = result.error.issues[0];
      if (!error) {
        return err([new ConfigurationValidationError('Invalid tool configuration', {
          configType: 'tool',
          field: 'tool'
        })]);
      }
      return err([new ConfigurationValidationError(error.message, {
        configType: 'tool',
        configPath: `tool.${error.path.join('.')}`
      })]);
    }
    return ok(tool);
  }

  /**
   * 验证工具参数schema
   * @param parameters 工具参数schema
   * @returns 验证结果
   */
  validateParameters(parameters: ToolParameters): Result<ToolParameters, ConfigurationValidationError[]> {
    const result = toolParametersSchema.safeParse(parameters);
    if (!result.success) {
      const error = result.error.issues[0];
      if (!error) {
        return err([new ConfigurationValidationError('Invalid tool parameters schema', {
          configType: 'tool',
          field: 'parameters'
        })]);
      }
      return err([new ConfigurationValidationError(error.message, {
        configType: 'tool',
        configPath: `parameters.${error.path.join('.')}`
      })]);
    }
    return ok(parameters);
  }

  /**
   * 验证工具配置
   * @param toolType 工具类型
   * @param config 工具配置
   * @returns 验证结果
   */
  validateToolConfig(toolType: ToolType, config: any): Result<any, ConfigurationValidationError[]> {
    let result;

    switch (toolType) {
      case 'STATELESS':
        result = statelessToolConfigSchema.safeParse(config);
        break;
      case 'STATEFUL':
        result = statefulToolConfigSchema.safeParse(config);
        break;
      case 'REST':
        result = restToolConfigSchema.safeParse(config);
        break;
      case 'MCP':
        result = mcpToolConfigSchema.safeParse(config);
        break;
      default:
        return err([new ConfigurationValidationError(`Unknown tool type: ${toolType}`, {
          configType: 'tool',
          field: 'type'
        })]);
    }

    if (!result.success) {
      const error = result.error.issues[0];
      if (!error) {
        return err([new ConfigurationValidationError(`Invalid ${toolType} tool configuration`, {
          configType: 'tool',
          field: 'config'
        })]);
      }
      return err([new ConfigurationValidationError(error.message, {
        configType: 'tool',
        configPath: `config.${error.path.join('.')}`
      })]);
    }
    return ok(config);
  }
}