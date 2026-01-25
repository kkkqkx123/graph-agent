/**
 * Tool Executor 接口和实现
 *
 * 负责执行工具调用
 * 作为 interaction 层和 tools 层之间的适配器
 */

import { injectable, inject } from 'inversify';
import { IInteractionContext } from '../interaction-context';
import { ToolExecutionResult } from '../interaction-engine';
import { ToolConfig } from '../../../domain/interaction/value-objects/tool-config';
import { ToolCall } from '../../../domain/interaction/value-objects/tool-call';
import { ILogger } from '../../../domain/common/types/logger-types';
import { ToolService } from '../../tools/tool-service';
import { ToolResult } from '../../../domain/tools/entities/tool-result';

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
  getToolSchemas(toolIds: string[]): Promise<any[]>;
}

/**
 * Tool Executor 实现
 *
 * 使用工具注册表执行工具调用
 * 作为 interaction 层和 tools 层之间的适配器
 */
@injectable()
export class ToolExecutor implements IToolExecutor {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('ToolService') private readonly toolService: ToolService
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
      // 1. 验证工具是否存在
      const toolExists = this.toolService.has(config.toolId);
      if (!toolExists) {
        const availableTools = this.toolService.getToolNames();
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
      const validationResult = await this.toolService.validateParameters(
        config.toolId,
        config.parameters
      );
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Parameter validation failed: ${validationResult.errors.join('; ')}`,
          executionTime: Date.now() - startTime,
          metadata: {
            toolId: config.toolId,
            validationErrors: validationResult.errors,
            validationWarnings: validationResult.warnings,
          },
        };
      }

      // 3. 执行工具
      const result = await this.toolService.execute(config.toolId, config.parameters, {
        sessionId: context.getMetadata('sessionId'),
        threadId: context.getMetadata('threadId'),
        workflowId: context.getMetadata('workflowId'),
        nodeId: context.getMetadata('nodeId'),
      });

      // 4. 处理结果
      const executionTime = Date.now() - startTime;

      // 5. 更新上下文
      const toolCall = this.createToolCall(config, result, executionTime);
      context.addToolCall(toolCall);

      return {
        success: result.success,
        output: result.success ? result.data : undefined,
        error: result.success ? undefined : result.error,
        executionTime,
        metadata: {
          toolId: config.toolId,
          toolMetadata: result.metadata,
          duration: result.duration,
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
  async getToolSchemas(toolIds: string[]): Promise<any[]> {
    return this.toolService.getSchemas(toolIds);
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
      result: result.success ? result.data : result.error,
      executionTime,
      timestamp: new Date().toISOString(),
    });
  }
}