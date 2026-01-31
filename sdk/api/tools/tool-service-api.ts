/**
 * ToolServiceAPI - 工具管理API
 * 封装ToolService和ToolRegistry，提供工具注册、查询和执行功能
 */

import { ToolService } from '../../core/tools/tool-service';
import type { Tool } from '../../types/tool';
import type { ToolFilter, ToolOptions, ToolExecutionResult, ToolTestResult } from '../types/tools-types';
import { NotFoundError } from '../../types/errors';

/**
 * ToolServiceAPI - 工具管理API
 */
export class ToolServiceAPI {
  private toolService: ToolService;
  private executionLog: Array<{
    toolName: string;
    parameters: any;
    result: ToolExecutionResult;
    timestamp: number;
  }> = [];

  constructor() {
    this.toolService = new ToolService();
  }

  /**
   * 注册工具
   * @param tool 工具定义
   */
  async registerTool(tool: Tool): Promise<void> {
    this.toolService.registerTool(tool);
  }

  /**
   * 批量注册工具
   * @param tools 工具定义数组
   */
  async registerTools(tools: Tool[]): Promise<void> {
    this.toolService.registerTools(tools);
  }

  /**
   * 注销工具
   * @param toolName 工具名称
   */
  async unregisterTool(toolName: string): Promise<void> {
    this.toolService.unregisterTool(toolName);
  }

  /**
   * 获取工具定义
   * @param toolName 工具名称
   * @returns 工具定义，如果不存在则返回null
   */
  async getTool(toolName: string): Promise<Tool | null> {
    try {
      return this.toolService.getTool(toolName);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 获取工具列表
   * @param filter 过滤条件
   * @returns 工具定义数组
   */
  async getTools(filter?: ToolFilter): Promise<Tool[]> {
    let tools = this.toolService.listTools();

    // 应用过滤条件
    if (filter) {
      tools = this.applyFilter(tools, filter);
    }

    return tools;
  }

  /**
   * 按类型获取工具列表
   * @param type 工具类型
   * @returns 工具定义数组
   */
  async getToolsByType(type: string): Promise<Tool[]> {
    return this.toolService.listToolsByType(type);
  }

  /**
   * 按分类获取工具列表
   * @param category 工具分类
   * @returns 工具定义数组
   */
  async getToolsByCategory(category: string): Promise<Tool[]> {
    return this.toolService.listToolsByCategory(category);
  }

  /**
   * 搜索工具
   * @param query 搜索关键词
   * @returns 工具定义数组
   */
  async searchTools(query: string): Promise<Tool[]> {
    return this.toolService.searchTools(query);
  }

  /**
   * 检查工具是否存在
   * @param toolName 工具名称
   * @returns 是否存在
   */
  async hasTool(toolName: string): Promise<boolean> {
    return this.toolService.hasTool(toolName);
  }

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
      const tool = await this.getTool(toolName);
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
   * 验证工具参数
   * @param toolName 工具名称
   * @param parameters 工具参数
   * @returns 验证结果
   */
  async validateToolParameters(
    toolName: string,
    parameters: Record<string, any>
  ): Promise<{ valid: boolean; errors: string[] }> {
    return this.toolService.validateParameters(toolName, parameters);
  }

  /**
   * 更新工具定义
   * @param toolName 工具名称
   * @param updates 更新内容
   */
  async updateTool(toolName: string, updates: Partial<Tool>): Promise<void> {
    this.toolService.updateTool(toolName, updates);
  }

  /**
   * 获取工具数量
   * @returns 工具数量
   */
  async getToolCount(): Promise<number> {
    return this.toolService.getToolCount();
  }

  /**
   * 清空所有工具
   */
  async clearTools(): Promise<void> {
    this.toolService.clear();
    this.executionLog = [];
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
  getService(): ToolService {
    return this.toolService;
  }

  /**
   * 应用过滤条件
   * @param tools 工具数组
   * @param filter 过滤条件
   * @returns 过滤后的工具数组
   */
  private applyFilter(tools: Tool[], filter: ToolFilter): Tool[] {
    return tools.filter(tool => {
      if (filter.name && !tool.name.includes(filter.name)) {
        return false;
      }
      if (filter.type && tool.type !== filter.type) {
        return false;
      }
      if (filter.category && tool.metadata?.category !== filter.category) {
        return false;
      }
      if (filter.tags && tool.metadata?.tags) {
        if (!filter.tags.every(tag => tool.metadata?.tags?.includes(tag))) {
          return false;
        }
      }
      return true;
    });
  }
}