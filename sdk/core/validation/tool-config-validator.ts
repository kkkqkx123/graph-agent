/**
 * Tool模块配置验证器
 * 提供Tool模块配置的验证逻辑
 */

import { z } from 'zod';
import type { 
  Tool, 
  ToolParameters, 
  ToolProperty, 
  StatelessToolConfig, 
  StatefulToolConfig,
  RestToolConfig,
  McpToolConfig 
} from '../../types/tool';
import { ToolType } from '../../types/tool';
import { ValidationError } from '../../types/errors';
import type { Result } from '../../types/result';
import { ok, err } from '../../utils/result-utils';

/**
 * 工具参数属性schema
 */
const toolPropertySchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  description: z.string().optional(),
  default: z.any().optional(),
  enum: z.array(z.any()).optional(),
  format: z.string().optional(),
});

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
    Object.values(ToolType).includes(val as ToolType)
  ),
  description: z.string().min(1, 'Tool description is required'),
  parameters: toolParametersSchema,
  metadata: toolMetadataSchema.optional(),
  config: z.any().optional(),
}).refine(
  (data) => {
    // 根据工具类型验证config字段
    switch (data.type) {
      case ToolType.STATELESS:
        return statelessToolConfigSchema.safeParse(data.config).success;
      case ToolType.STATEFUL:
        return statefulToolConfigSchema.safeParse(data.config).success;
      case ToolType.MCP:
        return mcpToolConfigSchema.safeParse(data.config).success;
      case ToolType.REST:
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
 * Tool配置验证器类
 */
export class ToolConfigValidator {
  /**
   * 验证工具定义
   * @param tool 工具定义
   * @throws ValidationError 当工具定义无效时抛出
   */
  validateTool(tool: Tool): Result<Tool, ValidationError[]> {
    const result = toolSchema.safeParse(tool);
    if (!result.success) {
      const error = result.error.issues[0];
      if (!error) {
        return err([new ValidationError('Invalid tool configuration', 'tool')]);
      }
      return err([new ValidationError(error.message, `tool.${error.path.join('.')}`)]);
    }
    return ok(tool);
  }

  /**
   * 验证工具参数schema
   * @param parameters 工具参数schema
   * @throws ValidationError 当参数schema无效时抛出
   */
  validateParameters(parameters: ToolParameters): Result<ToolParameters, ValidationError[]> {
    const result = toolParametersSchema.safeParse(parameters);
    if (!result.success) {
      const error = result.error.issues[0];
      if (!error) {
        return err([new ValidationError('Invalid tool parameters schema', 'parameters')]);
      }
      return err([new ValidationError(error.message, `parameters.${error.path.join('.')}`)]);
    }
    return ok(parameters);
  }

  /**
   * 验证工具配置
   * @param toolType 工具类型
   * @param config 工具配置
   * @throws ValidationError 当配置无效时抛出
   */
  validateToolConfig(toolType: ToolType, config: any): Result<any, ValidationError[]> {
    let result;

    switch (toolType) {
      case ToolType.STATELESS:
        result = statelessToolConfigSchema.safeParse(config);
        break;
      case ToolType.STATEFUL:
        result = statefulToolConfigSchema.safeParse(config);
        break;
      case ToolType.REST:
        result = restToolConfigSchema.safeParse(config);
        break;
      case ToolType.MCP:
        result = mcpToolConfigSchema.safeParse(config);
        break;
      default:
        return err([new ValidationError(`Unknown tool type: ${toolType}`, 'type')]);
    }

    if (!result.success) {
      const error = result.error.issues[0];
      if (!error) {
        return err([new ValidationError(`Invalid ${toolType} tool configuration`, 'config')]);
      }
      return err([new ValidationError(error.message, `config.${error.path.join('.')}`)]);
    }
    return ok(config);
  }

  /**
   * 验证工具调用参数
   * @param tool 工具定义
   * @param parameters 调用参数
   * @throws ValidationError 当调用参数无效时抛出
   */
  validateToolCallParameters(tool: Tool, parameters: Record<string, any>): Result<Record<string, any>, ValidationError[]> {
    const { properties, required } = tool.parameters;
    const errors: ValidationError[] = [];

    // 验证必需参数
    for (const paramName of required) {
      if (!(paramName in parameters)) {
        errors.push(new ValidationError(
          `Required parameter '${paramName}' is missing`,
          `parameters.${paramName}`
        ));
      }
    }

    // 验证参数类型
    for (const [paramName, paramValue] of Object.entries(parameters)) {
      const property = properties[paramName];
      if (!property) {
        errors.push(new ValidationError(
          `Unknown parameter '${paramName}'`,
          `parameters.${paramName}`
        ));
        continue;
      }

      try {
        this.validateParameterValue(paramName, paramValue, property);
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(error);
        } else {
          errors.push(new ValidationError(
            error instanceof Error ? error.message : String(error),
            `parameters.${paramName}`
          ));
        }
      }
    }
    
    if (errors.length === 0) {
      return ok(parameters);
    }
    return err(errors);
  }

  /**
   * 验证参数值
   * @param paramName 参数名称
   * @param paramValue 参数值
   * @param property 参数属性定义
   * @throws ValidationError 当参数值无效时抛出
   */
  private validateParameterValue(
    paramName: string,
    paramValue: any,
    property: ToolProperty
  ): void {
    const { type, enum: enumValues } = property;

    // 验证枚举值
    if (enumValues && enumValues.length > 0 && !enumValues.includes(paramValue)) {
      throw new ValidationError(
        `Parameter '${paramName}' must be one of: ${enumValues.join(', ')}`,
        `parameters.${paramName}`
      );
    }

    // 验证类型
    switch (type) {
      case 'string':
        if (typeof paramValue !== 'string') {
          throw new ValidationError(
            `Parameter '${paramName}' must be a string`,
            `parameters.${paramName}`
          );
        }
        break;
      case 'number':
        if (typeof paramValue !== 'number') {
          throw new ValidationError(
            `Parameter '${paramName}' must be a number`,
            `parameters.${paramName}`
          );
        }
        break;
      case 'boolean':
        if (typeof paramValue !== 'boolean') {
          throw new ValidationError(
            `Parameter '${paramName}' must be a boolean`,
            `parameters.${paramName}`
          );
        }
        break;
      case 'array':
        if (!Array.isArray(paramValue)) {
          throw new ValidationError(
            `Parameter '${paramName}' must be an array`,
            `parameters.${paramName}`
          );
        }
        break;
      case 'object':
        if (typeof paramValue !== 'object' || paramValue === null || Array.isArray(paramValue)) {
          throw new ValidationError(
            `Parameter '${paramName}' must be an object`,
            `parameters.${paramName}`
          );
        }
        break;
    }

    // 验证格式约束
    if (property.format) {
      this.validateParameterFormat(paramName, paramValue, property.format);
    }
  }

  /**
   * 验证参数格式
   * @param paramName 参数名称
   * @param paramValue 参数值
   * @param format 格式约束
   * @throws ValidationError 当格式无效时抛出
   */
  private validateParameterFormat(
    paramName: string,
    paramValue: any,
    format: string
  ): void {
    switch (format) {
      case 'uri':
        try {
          new URL(paramValue);
        } catch {
          throw new ValidationError(
            `Parameter '${paramName}' must be a valid URI`,
            `parameters.${paramName}`
          );
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(paramValue)) {
          throw new ValidationError(
            `Parameter '${paramName}' must be a valid email address`,
            `parameters.${paramName}`
          );
        }
        break;
      case 'date-time':
        if (isNaN(Date.parse(paramValue))) {
          throw new ValidationError(
            `Parameter '${paramName}' must be a valid date-time`,
            `parameters.${paramName}`
          );
        }
        break;
      // 可以添加更多格式验证
    }
  }

  /**
   * 验证工具兼容性
   * @param tool 工具定义
   * @param environment 执行环境信息
   * @throws ValidationError 当工具与环境不兼容时抛出
   */
  validateToolCompatibility(tool: Tool, environment: Record<string, any>): Result<Tool, ValidationError[]> {
    const { type, config } = tool;
    const errors: ValidationError[] = [];

    switch (type) {
      case ToolType.REST:
        if (config && (config as RestToolConfig).baseUrl) {
          // 验证REST工具的网络连接
          if (!environment['networkAvailable']) {
            errors.push(new ValidationError(
              'Network connectivity is required for REST tools',
              'environment'
            ));
          }
        }
        break;
      case ToolType.MCP:
        if (!environment['mcpAvailable']) {
          errors.push(new ValidationError(
            'MCP protocol support is not available in the execution environment',
            'environment'
          ));
        }
        break;
    }
    
    if (errors.length === 0) {
      return ok(tool);
    }
    return err(errors);
  }
}