/**
 * 工具服务
 * 提供统一的工具执行接口
 *
 * 本模块只导出类定义，不导出实例
 * 实例通过 SingletonRegistry 统一管理
 */

import type { Tool } from '@modular-agent/types';
import { ToolType } from '@modular-agent/types';
import { NotFoundError, ToolError, ToolNotFoundError } from '@modular-agent/types';
import { ToolRegistry } from '../tools/tool-registry';
import type { IToolExecutor } from '@modular-agent/types';
import type { ToolExecutionOptions, ToolExecutionResult } from '@modular-agent/types';
import { StatelessExecutor } from '@modular-agent/tool-executors';
import { StatefulExecutor } from '@modular-agent/tool-executors';
import { RestExecutor } from '@modular-agent/tool-executors';
import { McpExecutor } from '@modular-agent/tool-executors';
import { tryCatchAsync } from '@modular-agent/common-utils';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

/**
 * 工具服务类
 */
class ToolService {
  private registry: ToolRegistry;
  private executors: Map<string, IToolExecutor> = new Map();

  constructor() {
    this.registry = new ToolRegistry();
    this.initializeExecutors();
  }

  /**
   * 初始化执行器
   */
  private initializeExecutors(): void {
    // 直接使用packages中的实现
    this.executors.set(ToolType.STATELESS, new StatelessExecutor());
    this.executors.set(ToolType.STATEFUL, new StatefulExecutor());
    this.executors.set(ToolType.REST, new RestExecutor());
    this.executors.set(ToolType.MCP, new McpExecutor());
  }

  /**
   * 注册工具
   * @param tool 工具定义
   */
  registerTool(tool: Tool): void {
    this.registry.register(tool);
  }

  /**
   * 批量注册工具
   * @param tools 工具定义数组
   */
  registerTools(tools: Tool[]): void {
    this.registry.registerBatch(tools);
  }

  /**
   * 注销工具
   * @param toolName 工具名称
   */
  unregisterTool(toolName: string): void {
    this.registry.remove(toolName);
  }

  /**
   * 获取工具定义
   * @param toolName 工具名称
   * @returns 工具定义
   * @throws NotFoundError 如果工具不存在
   */
  getTool(toolName: string): Tool {
    const tool = this.registry.get(toolName);
    if (!tool) {
      throw new ToolNotFoundError(
        `Tool '${toolName}' not found`,
        toolName
      );
    }
    return tool;
  }

  /**
   * 列出所有工具
   * @returns 工具定义数组
   */
  listTools(): Tool[] {
    return this.registry.list();
  }

  /**
   * 按类型列出工具
   * @param type 工具类型
   * @returns 工具定义数组
   */
  listToolsByType(type: string): Tool[] {
    return this.registry.listByType(type);
  }

  /**
   * 按分类列出工具
   * @param category 工具分类
   * @returns 工具定义数组
   */
  listToolsByCategory(category: string): Tool[] {
    return this.registry.listByCategory(category);
  }

  /**
   * 搜索工具
   * @param query 搜索关键词
   * @returns 匹配的工具数组
   */
  searchTools(query: string): Tool[] {
    return this.registry.search(query);
  }

  /**
   * 检查工具是否存在
   * @param toolName 工具名称
   * @returns 是否存在
   */
  hasTool(toolName: string): boolean {
    return this.registry.has(toolName);
  }

  /**
   * 执行工具
   * @param toolName 工具名称
   * @param parameters 工具参数
   * @param options 执行选项
   * @param threadId 线程ID（可选，用于有状态工具）
   * @returns Result<ToolExecutionResult, ToolError>
   */
  async execute(
    toolName: string,
    parameters: Record<string, any>,
    options: ToolExecutionOptions = {},
    threadId?: string
  ): Promise<Result<ToolExecutionResult, ToolError>> {
    // 获取工具定义
    const tool = this.getTool(toolName);

    // 获取对应的执行器
    const executor = this.executors.get(tool.type);
    if (!executor) {
      return err(new ToolError(
        `No executor found for tool type '${tool.type}'`,
        toolName,
        tool.type,
        { parameters }
      ));
    }

    // 直接调用执行器（执行器已内置验证、重试、超时功能）
    const result = await tryCatchAsync(
      executor.execute(tool, parameters, options, threadId)
    );
    
    if (result.isErr()) {
      return err(this.convertToToolError(result.error, toolName, tool.type, parameters));
    }
    
    return ok(result.value);
  }

  /**
   * 批量执行工具
   * @param executions 执行任务数组
   * @param threadId 线程ID（可选，用于有状态工具）
   * @returns Result<ToolExecutionResult[], ToolError>
   */
  async executeBatch(
    executions: Array<{
      toolName: string;
      parameters: Record<string, any>;
      options?: ToolExecutionOptions;
    }>,
    threadId?: string
  ): Promise<Result<ToolExecutionResult[], ToolError>> {
    // 并行执行所有工具
    const results = await Promise.all(
      executions.map(exec =>
        this.execute(exec.toolName, exec.parameters, exec.options, threadId)
      )
    );
    
    // 检查是否有错误
    for (const result of results) {
      if (result.isErr()) {
        return result; // 返回第一个错误
      }
    }
    
    // 全部成功，返回结果数组
    const successResults = results as Array<{ isOk(): true; value: ToolExecutionResult }>;
    return ok(successResults.map(r => r.value));
  }

  /**
   * 验证工具参数
   * @param toolName 工具名称
   * @param parameters 工具参数
   * @returns 验证结果
   */
  validateParameters(
    toolName: string,
    parameters: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    try {
      const tool = this.getTool(toolName);
      const executor = this.executors.get(tool.type);

      if (!executor) {
        return {
          valid: false,
          errors: [`No executor found for tool type '${tool.type}'`]
        };
      }

      // 使用执行器的验证方法
      // 注意：这里需要访问protected方法，实际使用时可能需要调整
      // 暂时返回成功，具体验证在执行时进行
      return { valid: true, errors: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * 清空所有工具
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * 更新工具定义
   * @param toolName 工具名称
   * @param updates 更新内容
   * @throws NotFoundError 如果工具不存在
   */
  updateTool(toolName: string, updates: Partial<Tool>): void {
    const tool = this.getTool(toolName);
    const updatedTool = { ...tool, ...updates };
    this.registry.register(updatedTool);
  }
  /**
   * 转换错误为ToolError
   *
   * @param error 原始错误
   * @param toolName 工具名称
   * @param toolType 工具类型
   * @param parameters 工具参数
   * @returns ToolError
   */
  private convertToToolError(
    error: unknown,
    toolName: string,
    toolType: string,
    parameters: Record<string, any>
  ): ToolError {
    // 如果已经是ToolError，直接返回
    if (error instanceof ToolError) {
      return error;
    }
    
    const message = error instanceof Error ? error.message : String(error);
    
    return new ToolError(
      `Tool execution failed: ${message}`,
      toolName,
      toolType,
      { parameters },
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 导出ToolService类
 */
export { ToolService };