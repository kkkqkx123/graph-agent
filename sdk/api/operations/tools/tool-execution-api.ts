/**
 * ToolExecutionAPI - 工具执行API
 * 封装ToolService，提供工具执行功能
 */

import { toolService } from '../../../core/services/tool-service';
import type { Tool } from '../../../types/tool';
import type { ToolOptions, ToolExecutionResult, ToolTestResult } from '../../types/tools-types';
import { NotFoundError } from '../../../types/errors';

/**
 * ToolExecutionAPI - 工具执行API
 */
export class ToolExecutionAPI {
  private toolService = toolService;
  private executionLog: Array<{
    toolName: string;
    parameters: any;
    result: ToolExecutionResult;
    timestamp: number;
  }> = [];

  /**
   * 执行工具
   * @param toolName 工具名称
   * @param parameters 工具参数
   * @param options 执行选项
   * @returns 执行结果
   */
  async executeTool(
    toolName: string,
    parameters: Record<string, any>,
    options?: ToolOptions
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const executionOptions = {
      timeout: options?.timeout,
      maxRetries: options?.maxRetries,
      retryDelay: options?.retryDelay,
      enableLogging: options?.enableLogging ?? true
    };

    try {
      // 验证工具参数
      const validation = this.toolService.validateParameters(toolName, parameters);
      if (!validation.valid) {
        return {
          success: false,
          error: `参数验证失败: ${validation.errors.join(', ')}`,
          executionTime: Date.now() - startTime,
          toolName
        };
      }

      // 执行工具
      const result = await this.toolService.execute(toolName, parameters, executionOptions);
      const executionTime = Date.now() - startTime;

      const executionResult: ToolExecutionResult = {
        success: true,
        result: result.result,
        executionTime,
        toolName
      };

      // 记录执行日志
      if (executionOptions.enableLogging) {
        this.executionLog.push({
          toolName,
          parameters,
          result: executionResult,
          timestamp: Date.now()
        });
      }

      return executionResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      const executionResult: ToolExecutionResult = {
        success: false,
        error: errorMessage,
        executionTime,
        toolName
      };

      // 记录执行日志
      if (executionOptions.enableLogging) {
        this.executionLog.push({
          toolName,
          parameters,
          result: executionResult,
          timestamp: Date.now()
        });
      }

      return executionResult;
    }
  }

  /**
   * 批量执行工具
   * @param executions 执行任务数组
   * @returns 执行结果数组
   */
  async executeToolsBatch(
    executions: Array<{
      toolName: string;
      parameters: Record<string, any>;
      options?: ToolOptions;
    }>
  ): Promise<ToolExecutionResult[]> {
    return Promise.all(
      executions.map(exec =>
        this.executeTool(exec.toolName, exec.parameters, exec.options)
      )
    );
  }

  /**
   * 测试工具
   * @param toolName 工具名称
   * @param parameters 工具参数
   * @returns 测试结果
   */
  async testTool(
    toolName: string,
    parameters: Record<string, any>
  ): Promise<ToolTestResult> {
    const startTime = Date.now();

    try {
      // 验证工具参数
      const validation = this.toolService.validateParameters(toolName, parameters);
      if (!validation.valid) {
        return {
          passed: false,
          error: `参数验证失败: ${validation.errors.join(', ')}`,
          testTime: Date.now() - startTime,
          toolName
        };
      }

      // 检查工具是否存在
      const tool = await this.toolService.getTool(toolName);
      if (!tool) {
        return {
          passed: false,
          error: `工具不存在: ${toolName}`,
          testTime: Date.now() - startTime,
          toolName
        };
      }

      // 执行测试（使用较短的默认超时）
      const result = await this.executeTool(toolName, parameters, {
        timeout: 5000,
        enableLogging: false
      });

      return {
        passed: result.success,
        result: result.result,
        error: result.error,
        testTime: Date.now() - startTime,
        toolName
      };
    } catch (error) {
      return {
        passed: false,
        error: error instanceof Error ? error.message : '未知错误',
        testTime: Date.now() - startTime,
        toolName
      };
    }
  }

  /**
   * 获取执行日志
   * @param toolName 工具名称（可选）
   * @param limit 返回数量限制
   * @returns 执行日志数组
   */
  async getExecutionLog(toolName?: string, limit?: number): Promise<Array<{
    toolName: string;
    parameters: any;
    result: ToolExecutionResult;
    timestamp: number;
  }>> {
    let logs = this.executionLog;

    // 按工具名称过滤
    if (toolName) {
      logs = logs.filter(log => log.toolName === toolName);
    }

    // 按时间倒序排序
    logs = logs.sort((a, b) => b.timestamp - a.timestamp);

    // 限制返回数量
    if (limit && limit > 0) {
      logs = logs.slice(0, limit);
    }

    return logs;
  }

  /**
   * 清空执行日志
   */
  async clearExecutionLog(): Promise<void> {
    this.executionLog = [];
  }

  /**
   * 获取底层ToolService实例
   * @returns ToolService实例
   */
  getService() {
    return this.toolService;
  }
}