/**
 * 工具服务
 * 提供统一的工具执行接口和工具注册管理
 *
 * 本模块只导出类定义，不导出实例
 * 实例通过 SingletonRegistry 统一管理
 */

import type { Tool } from '@modular-agent/types';
import { ToolError, ToolNotFoundError, RuntimeValidationError, ConfigurationValidationError } from '@modular-agent/types';
import type { IToolExecutor } from '@modular-agent/tool-executors';
import type { ToolExecutionOptions, ToolExecutionResult } from '@modular-agent/types';
import { StatelessExecutor } from '@modular-agent/tool-executors';
import { StatefulExecutor } from '@modular-agent/tool-executors';
import { RestExecutor } from '@modular-agent/tool-executors';
import { McpExecutor } from '@modular-agent/tool-executors';
import { tryCatchAsyncWithSignal, all } from '@modular-agent/common-utils';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';
import { StaticValidator } from '../validation/tool-static-validator.js';
import { RuntimeValidator } from '../validation/tool-runtime-validator.js';
import { createContextualLogger } from '../../utils/contextual-logger.js';

const logger = createContextualLogger({ component: 'ToolService' });

/**
 * 工具服务类
 */
class ToolService {
  private tools: Map<string, Tool> = new Map();
  private executors: Map<string, IToolExecutor> = new Map();
  private staticValidator: StaticValidator;
  private runtimeValidator: RuntimeValidator;

  constructor() {
    this.staticValidator = new StaticValidator();
    this.runtimeValidator = new RuntimeValidator();
    this.initializeExecutors();
  }

  /**
   * 初始化执行器
   */
  private initializeExecutors(): void {
    // 直接使用 packages 中的实现
    this.executors.set('STATELESS', new StatelessExecutor());
    this.executors.set('STATEFUL', new StatefulExecutor());
    this.executors.set('REST', new RestExecutor());
    this.executors.set('MCP', new McpExecutor());
  }

  /**
   * 注册工具
   * @param tool 工具定义
   * @throws ConfigurationValidationError 如果工具定义无效或已存在
   */
  registerTool(tool: Tool): void {
    // 静态验证工具定义
    const result = this.staticValidator.validateTool(tool);
    if (result.isErr()) {
      logger.error('Tool validation failed', { toolId: tool.id, errors: result.error.map(e => e.message) });
      throw result.error[0];
    }

    // 检查工具 ID 是否已存在
    if (this.tools.has(tool.id)) {
      logger.warn('Tool already exists', { toolId: tool.id });
      throw new ConfigurationValidationError(
        `Tool with id '${tool.id}' already exists`,
        {
          configType: 'tool',
          field: 'id',
          value: tool.id
        }
      );
    }

    this.tools.set(tool.id, tool);
    logger.info('Tool registered', { toolId: tool.id, toolType: tool.type, toolName: tool.name });
  }

  /**
   * 批量注册工具
   * @param tools 工具定义数组
   */
  registerTools(tools: Tool[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /**
   * 注销工具
   * @param toolId 工具 ID
   * @throws ToolNotFoundError 如果工具不存在
   */
  unregisterTool(toolId: string): void {
    if (!this.tools.has(toolId)) {
      logger.warn('Attempted to unregister non-existent tool', { toolId });
      throw new ToolNotFoundError(
        `Tool with id '${toolId}' not found`,
        toolId
      );
    }
    this.tools.delete(toolId);
    logger.info('Tool unregistered', { toolId });
  }

  /**
   * 获取工具定义
   * @param toolId 工具 ID
   * @returns 工具定义
   * @throws ToolNotFoundError 如果工具不存在
   */
  getTool(toolId: string): Tool {
    const tool = this.tools.get(toolId);
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
    return Array.from(this.tools.values());
  }

  /**
   * 按类型列出工具
   * @param type 工具类型
   * @returns 工具定义数组
   */
  listToolsByType(type: string): Tool[] {
    return this.listTools().filter(tool => tool.type === type);
  }

  /**
   * 按分类列出工具
   * @param category 工具分类
   * @returns 工具定义数组
   */
  listToolsByCategory(category: string): Tool[] {
    return this.listTools().filter(
      tool => tool.metadata?.category === category
    );
  }

  /**
   * 搜索工具
   * @param query 搜索关键词
   * @returns 匹配的工具数组
   */
  searchTools(query: string): Tool[] {
    const lowerQuery = query.toLowerCase();
    return this.listTools().filter(tool => {
      return (
        tool.id.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery) ||
        tool.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        tool.metadata?.category?.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * 检查工具是否存在
   * @param toolId 工具 ID
   * @returns 是否存在
   */
  hasTool(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * 获取工具数量
   * @returns 工具数量
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * 执行工具
   * @param toolId 工具 ID
   * @param parameters 工具参数
   * @param options 执行选项
   * @param threadId 线程 ID（可选，用于有状态工具）
   * @returns Result<ToolExecutionResult, ToolError>
   */
  async execute(
    toolId: string,
    parameters: Record<string, any>,
    options: ToolExecutionOptions = {},
    threadId?: string
  ): Promise<Result<ToolExecutionResult, ToolError>> {
    logger.debug('Tool execution started', { toolId, threadId, hasParameters: Object.keys(parameters).length > 0 });

    // 获取工具定义
    const tool = this.getTool(toolId);

    // 获取对应的执行器
    const executor = this.executors.get(tool.type);
    if (!executor) {
      logger.error('No executor found for tool type', { toolId, toolType: tool.type });
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
        logger.warn('Tool parameter validation failed', { toolId, error: error.message });
        return err(new ToolError(
          error.message,
          toolId,
          tool.type,
          { parameters },
          error
        ));
      }
      logger.warn('Tool parameter validation failed', { toolId, error: String(error) });
      return err(new ToolError(
        'Parameter validation failed',
        toolId,
        tool.type,
        { parameters },
        error instanceof Error ? error : undefined
      ));
    }

    // 使用 tryCatchAsyncWithSignal 确保 signal 正确传递
    const result = await tryCatchAsyncWithSignal(
      (signal: AbortSignal | undefined) => executor.execute(tool, parameters, { ...options, signal }, threadId),
      options?.signal
    );

    if (result.isErr()) {
      logger.error('Tool execution failed', { toolId, toolType: tool.type, error: result.error.message });
      return err(this.convertToToolError(result.error, toolId, tool.type, parameters));
    }

    logger.debug('Tool execution completed', { toolId, success: result.value.success });
    return ok(result.value);
  }

  /**
   * 批量执行工具
   * @param executions 执行任务数组
   * @param threadId 线程 ID（可选，用于有状态工具）
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

    // 组合结果，全部成功时返回成功，否则返回第一个错误
    return all(results);
  }

  /**
   * 验证工具参数（运行时验证）
   * @param toolId 工具 ID
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
    const count = this.tools.size;
    this.tools.clear();
    logger.info('All tools cleared', { count });
  }

  /**
   * 清理指定线程的所有有状态工具实例
   * @param threadId 线程 ID
   */
  cleanupThread(threadId: string): void {
    logger.debug('Cleaning up thread stateful tools', { threadId });
    const statefulExecutor = this.executors.get('STATEFUL');
    if (statefulExecutor && typeof (statefulExecutor as any).cleanupThread === 'function') {
      (statefulExecutor as any).cleanupThread(threadId);
      logger.debug('Thread stateful tools cleaned up', { threadId });
    }
  }

  /**
   * 清理所有执行器的资源
   */
  async cleanupAll(): Promise<void> {
    logger.info('Cleaning up all tool executors');
    for (const executor of this.executors.values()) {
      if (typeof executor.cleanup === 'function') {
        await executor.cleanup();
      }
    }
    logger.info('All tool executors cleaned up');
  }

  /**
   * 更新工具定义
   * @param toolId 工具 ID
   * @param updates 更新内容
   * @throws ToolNotFoundError 如果工具不存在
   */
  updateTool(toolId: string, updates: Partial<Tool>): void {
    const tool = this.getTool(toolId);
    const updatedTool = { ...tool, ...updates };
    // 先删除旧工具，再注册新工具（会重新验证）
    this.tools.delete(toolId);
    this.registerTool(updatedTool);
  }

  /**
   * 转换错误为 ToolError
   *
   * @param error 原始错误
   * @param toolId 工具 ID
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
    // 如果已经是 ToolError，直接返回
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
 * 导出 ToolService 类
 */
export { ToolService };
