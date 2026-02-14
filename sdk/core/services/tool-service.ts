/**
 * 工具服务
 * 提供统一的工具执行接口
 *
 * 本模块导出全局单例实例，不导出类定义
 *
 * 如果需要测试隔离，使用以下模式：
 * - 创建 Mock 类实现该接口
 * - 使用 type { ToolService } 获取类型
 * - 通过依赖注入传入 Mock
 */

import type { Tool } from '@modular-agent/types';
import type { ThreadContext } from '../execution/context/thread-context';
import { ToolType } from '@modular-agent/types';
import { NotFoundError, ToolError, ToolNotFoundError } from '@modular-agent/types';
import { ToolRegistry } from '../tools/tool-registry';
import type { IToolExecutor } from '@modular-agent/types';
import type { ToolExecutionOptions, ToolExecutionResult } from '@modular-agent/types';
import { StatelessExecutor } from '@modular-agent/tool-executors';
import { StatefulExecutor } from '@modular-agent/tool-executors';
import { RestExecutor } from '@modular-agent/tool-executors';
import { McpExecutor } from '@modular-agent/tool-executors';

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
   * @param threadContext 线程上下文（可选，用于有状态工具）
   * @returns 执行结果
   * @throws NotFoundError 如果工具不存在
   * @throws ToolError 如果执行失败
   */
  async execute(
    toolName: string,
    parameters: Record<string, any>,
    options: ToolExecutionOptions = {},
    threadContext?: ThreadContext
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

    // 直接调用执行器（执行器已内置验证、重试、超时功能）
    try {
      return await executor.execute(tool, parameters, options, threadContext);
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
   * @param threadContext 线程上下文（可选）
   * @returns 执行结果数组
   */
  async executeBatch(
    executions: Array<{
      toolName: string;
      parameters: Record<string, any>;
      options?: ToolExecutionOptions;
    }>,
    threadContext?: ThreadContext
  ): Promise<ToolExecutionResult[]> {
    // 并行执行所有工具
    return Promise.all(
      executions.map(exec =>
        this.execute(exec.toolName, exec.parameters, exec.options, threadContext)
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
}

/**
 * 全局工具服务单例
 * 用于管理所有工具的注册、查询和执行
 */
export const toolService = new ToolService();

/**
 * 导出ToolService类供测试使用
 * 注意：生产代码应使用单例 toolService，此类仅供测试使用
 */
export { ToolService };