/**
 * 工具服务
 * 提供统一的工具执行接口
 *
 * 本模块只导出类定义，不导出实例
 * 实例通过 SingletonRegistry 统一管理
 */

import type { Tool } from '@modular-agent/types';
import { ToolType } from '@modular-agent/types';
import { ToolError, ToolNotFoundError, RuntimeValidationError } from '@modular-agent/types';
import { ToolRegistry } from '../tools/tool-registry';
import type { IToolExecutor } from '@modular-agent/tool-executors';
import type { ToolExecutionOptions, ToolExecutionResult } from '@modular-agent/types';
import { StatelessExecutor } from '@modular-agent/tool-executors';
import { StatefulExecutor } from '@modular-agent/tool-executors';
import { RestExecutor } from '@modular-agent/tool-executors';
import { McpExecutor } from '@modular-agent/tool-executors';
import { tryCatchAsync } from '@modular-agent/common-utils';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';
import { StaticValidator } from '../validation/tool-static-validator';
import { RuntimeValidator } from '../validation/tool-runtime-validator';

/**
 * 工具服务类
 */
class ToolService {
  private registry: ToolRegistry;
  private executors: Map<string, IToolExecutor> = new Map();
  private staticValidator: StaticValidator;
  private runtimeValidator: RuntimeValidator;

  constructor() {
    this.registry = new ToolRegistry();
    this.staticValidator = new StaticValidator();
    this.runtimeValidator = new RuntimeValidator();
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
    // 静态验证工具定义
    const result = this.staticValidator.validateTool(tool);
    if (result.isErr()) {
      throw result.error[0];
    }
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
   * @param toolId 工具ID
   */
  unregisterTool(toolId: string): void {
    this.registry.remove(toolId);
  }

  /**
   * 获取工具定义
   * @param toolId 工具ID
   * @returns 工具定义
   * @throws NotFoundError 如果工具不存在
   */
  getTool(toolId: string): Tool {
    const tool = this.registry.get(toolId);
    if (!tool) {
      throw new ToolNotFoundError(
        `Tool with id '${toolId}' not found`,
        toolId
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
   * @param toolId 工具ID
   * @returns 是否存在
   */
  hasTool(toolId: string): boolean {
    return this.registry.has(toolId);
  }

  /**
   * 执行工具
   * @param toolId 工具ID
   * @param parameters 工具参数
   * @param options 执行选项
   * @param threadId 线程ID（可选，用于有状态工具）
   * @returns Result<ToolExecutionResult, ToolError>
   */
  async execute(
    toolId: string,
    parameters: Record<string, any>,
    options: ToolExecutionOptions = {},
    threadId?: string
  ): Promise<Result<ToolExecutionResult, ToolError>> {
    // 获取工具定义
    const tool = this.getTool(toolId);

    // 获取对应的执行器
    const executor = this.executors.get(tool.type);
    if (!executor) {
      return err(new ToolError(
        `No executor found for tool type '${tool.type}'`,
        toolId,
        tool.type,
        { parameters }
      ));
    }

    // 运行时验证参数
    try {
      this.runtimeValidator.validate(tool, parameters);
    } catch (error) {
      if (error instanceof RuntimeValidationError) {
        return err(new ToolError(
          error.message,
          toolId,
          tool.type,
          { parameters },
          error
        ));
      }
      return err(new ToolError(
        'Parameter validation failed',
        toolId,
        tool.type,
        { parameters },
        error instanceof Error ? error : undefined
      ));
    }

    // 调用执行器
    const result = await tryCatchAsync(
      executor.execute(tool, parameters, options, threadId)
    );

    if (result.isErr()) {
      return err(this.convertToToolError(result.error, toolId, tool.type, parameters));
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
      toolId: string;
      parameters: Record<string, any>;
      options?: ToolExecutionOptions;
    }>,
    threadId?: string
  ): Promise<Result<ToolExecutionResult[], ToolError>> {
    // 并行执行所有工具
    const results = await Promise.all(
      executions.map(exec =>
        this.execute(exec.toolId, exec.parameters, exec.options, threadId)
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
   * 验证工具参数（运行时验证）
   * @param toolId 工具ID
   * @param parameters 工具参数
   * @returns 验证结果
   */
  validateParameters(
    toolId: string,
    parameters: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    try {
      const tool = this.getTool(toolId);

      // 使用运行时验证器
      try {
        this.runtimeValidator.validate(tool, parameters);
        return { valid: true, errors: [] };
      } catch (error) {
        return {
          valid: false,
          errors: [error instanceof Error ? error.message : 'Unknown validation error']
        };
      }
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
   * 清理指定线程的所有有状态工具实例
   * @param threadId 线程ID
   */
  cleanupThread(threadId: string): void {
    const statefulExecutor = this.executors.get(ToolType.STATEFUL);
    if (statefulExecutor && typeof (statefulExecutor as any).cleanupThread === 'function') {
      (statefulExecutor as any).cleanupThread(threadId);
    }
  }

  /**
   * 清理所有执行器的资源
   */
  async cleanupAll(): Promise<void> {
    for (const executor of this.executors.values()) {
      if (typeof executor.cleanup === 'function') {
        await executor.cleanup();
      }
    }
  }

  /**
   * 更新工具定义
   * @param toolId 工具ID
   * @param updates 更新内容
   * @throws NotFoundError 如果工具不存在
   */
  updateTool(toolId: string, updates: Partial<Tool>): void {
    const tool = this.getTool(toolId);
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
    toolId: string,
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
      toolId,
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