/**
 * Tool Executor 接口和实现
 *
 * 负责执行工具调用
 */

import { injectable, inject } from 'inversify';
import { IInteractionContext } from '../interaction-context';
import { ToolExecutionResult } from '../interaction-engine';
import { ToolConfig } from '../../../domain/interaction/value-objects/tool-config';
import { ToolCall } from '../../../domain/interaction/value-objects/tool-call';
import { ILogger } from '../../../domain/common/types/logger-types';
import { ToolRegistry, ITool, ToolResult } from '../tool-registry';

/**
 * Tool Executor 接口
 */
export interface IToolExecutor {
  /**
   * 执行工具调用
   * @param config 工具配置
   * @param context Interaction 上下文
   * @returns 执行结果
   */
  execute(
    config: ToolConfig,
    context: IInteractionContext
  ): Promise<ToolExecutionResult>;

  /**
   * 获取工具 Schema
   * @param toolIds 工具 ID 列表
   * @returns 工具 Schema 列表
   */
  getToolSchemas(toolIds: string[]): any[];
}

/**
 * Tool Executor 实现
 *
 * 使用工具注册表执行工具调用
 */
@injectable()
export class ToolExecutor implements IToolExecutor {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('ToolRegistry') private readonly toolRegistry: ToolRegistry
  ) {}

  async execute(
    config: ToolConfig,
    context: IInteractionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    this.logger.debug('开始执行工具调用', {
      toolId: config.toolId,
    });

    try {
      // 1. 从工具注册表获取工具
      const tool = this.toolRegistry.get(config.toolId);
      if (!tool) {
        const availableTools = this.toolRegistry.getToolNames();
        return {
          success: false,
          error: `Unknown tool: ${config.toolId}. Available tools: ${availableTools.join(', ')}`,
          executionTime: Date.now() - startTime,
          metadata: {
            toolId: config.toolId,
            availableTools,
          },
        };
      }

      // 2. 验证参数
      const validationResult = this.validateParameters(tool, config.parameters);
      if (!validationResult.valid) {
        return {
          success: false,
          error: `Parameter validation failed: ${validationResult.error}`,
          executionTime: Date.now() - startTime,
          metadata: {
            toolId: config.toolId,
            validationErrors: validationResult.errors,
          },
        };
      }

      // 3. 执行工具
      const result = await tool.execute(config.parameters);

      // 4. 处理结果
      const executionTime = Date.now() - startTime;

      // 5. 更新上下文
      const toolCall = this.createToolCall(config, result, executionTime);
      context.addToolCall(toolCall);

      return {
        success: result.success,
        output: result.content,
        error: result.error,
        executionTime,
        metadata: {
          toolId: config.toolId,
          toolMetadata: result.metadata,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('工具调用失败', error instanceof Error ? error : new Error(String(error)), {
        toolId: config.toolId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        metadata: {
          toolId: config.toolId,
        },
      };
    }
  }

  /**
   * 获取工具 Schema
   * @param toolIds 工具 ID 列表
   * @returns 工具 Schema 列表
   */
  getToolSchemas(toolIds: string[]): any[] {
    return this.toolRegistry.getSchemas(toolIds);
  }

  /**
   * 验证参数
   * @param tool 工具实例
   * @param parameters 参数
   * @returns 验证结果
   */
  private validateParameters(
    tool: ITool,
    parameters: Record<string, any>
  ): { valid: boolean; error?: string; errors?: string[] } {
    const errors: string[] = [];

    // 检查必需参数
    const requiredParams = (tool.parameters as any)['required'] || [];
    for (const param of requiredParams) {
      if (!(param in parameters) || parameters[param] === undefined || parameters[param] === null) {
        errors.push(`Required parameter '${param}' is missing`);
      }
    }

    // 检查参数类型
    const properties = (tool.parameters as any)['properties'] || {};
    for (const [key, value] of Object.entries(parameters)) {
      const paramSchema = properties[key];
      if (paramSchema) {
        const typeError = this.validateParameterType(key, value, paramSchema);
        if (typeError) {
          errors.push(typeError);
        }
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join('; '),
        errors,
      };
    }

    return { valid: true };
  }

  /**
   * 验证参数类型
   * @param key 参数名
   * @param value 参数值
   * @param schema 参数 schema
   * @returns 错误信息或 undefined
   */
  private validateParameterType(
    key: string,
    value: any,
    schema: any
  ): string | undefined {
    const type = schema.type;

    if (type === 'string' && typeof value !== 'string') {
      return `Parameter '${key}' must be a string`;
    }

    if (type === 'number' && typeof value !== 'number') {
      return `Parameter '${key}' must be a number`;
    }

    if (type === 'integer' && (!Number.isInteger(value) || typeof value !== 'number')) {
      return `Parameter '${key}' must be an integer`;
    }

    if (type === 'boolean' && typeof value !== 'boolean') {
      return `Parameter '${key}' must be a boolean`;
    }

    if (type === 'array' && !Array.isArray(value)) {
      return `Parameter '${key}' must be an array`;
    }

    if (type === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
      return `Parameter '${key}' must be an object`;
    }

    return undefined;
  }

  /**
   * 创建工具调用记录
   * @param config 工具配置
   * @param result 执行结果
   * @param executionTime 执行时间
   * @returns 工具调用记录
   */
  private createToolCall(
    config: ToolConfig,
    result: ToolResult,
    executionTime: number
  ): ToolCall {
    return new ToolCall({
      id: `tool_${Date.now()}`,
      name: config.toolId,
      arguments: config.parameters,
      result: result.success ? result.content : result.error,
      executionTime,
      timestamp: new Date().toISOString(),
    });
  }
}