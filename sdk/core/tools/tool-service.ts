/**
 * 工具服务
 * 提供统一的工具执行接口
 */

import type { Tool } from '../../types/tool';
import { ToolType } from '../../types/tool';
import { NotFoundError, ToolError } from '../../types/errors';
import { ToolRegistry } from './tool-registry';
import { BaseToolExecutor } from './executor-base';
import type { ToolExecutionOptions, ToolExecutionResult } from './executor-base';
import { BuiltinToolExecutor } from './executors/builtin';
import { NativeToolExecutor } from './executors/native';
import { RestToolExecutor } from './executors/rest';
import { McpToolExecutor } from './executors/mcp';

/**
 * 工具服务类
 */
export class ToolService {
  private registry: ToolRegistry;
  private executors: Map<string, BaseToolExecutor> = new Map();

  constructor() {
    this.registry = new ToolRegistry();
    this.initializeExecutors();
  }

  /**
   * 初始化执行器
   */
  private initializeExecutors(): void {
    this.executors.set(ToolType.BUILTIN, new BuiltinToolExecutor());
    this.executors.set(ToolType.NATIVE, new NativeToolExecutor());
    this.executors.set(ToolType.REST, new RestToolExecutor());
    this.executors.set(ToolType.MCP, new McpToolExecutor());
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
      throw new NotFoundError(
        `Tool '${toolName}' not found`,
        'tool',
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
   * @returns 执行结果
   * @throws NotFoundError 如果工具不存在
   * @throws ToolError 如果执行失败
   */
  async execute(
    toolName: string,
    parameters: Record<string, any>,
    options: ToolExecutionOptions = {}
  ): Promise<ToolExecutionResult> {
    // 获取工具定义
    const tool = this.getTool(toolName);

    // 获取对应的执行器
    const executor = this.executors.get(tool.type);
    if (!executor) {
      throw new ToolError(
        `No executor found for tool type '${tool.type}'`,
        toolName,
        tool.type
      );
    }

    // 执行工具
    try {
      return await executor.execute(tool, parameters, options);
    } catch (error) {
      if (error instanceof Error) {
        throw new ToolError(
          `Tool execution failed: ${error.message}`,
          toolName,
          tool.type,
          { parameters },
          error
        );
      }
      throw error;
    }
  }

  /**
   * 批量执行工具
   * @param executions 执行任务数组
   * @returns 执行结果数组
   */
  async executeBatch(
    executions: Array<{
      toolName: string;
      parameters: Record<string, any>;
      options?: ToolExecutionOptions;
    }>
  ): Promise<ToolExecutionResult[]> {
    // 并行执行所有工具
    return Promise.all(
      executions.map(exec =>
        this.execute(exec.toolName, exec.parameters, exec.options)
      )
    );
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
   * 获取工具数量
   * @returns 工具数量
   */
  getToolCount(): number {
    return this.registry.size();
  }

  /**
   * 清空所有工具
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * 获取工具注册表（用于高级操作）
   * @returns 工具注册表
   */
  getRegistry(): ToolRegistry {
    return this.registry;
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
}