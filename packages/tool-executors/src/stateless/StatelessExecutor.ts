/**
 * 无状态工具执行器
 * 执行应用层提供的无状态函数工具，通过函数注册表管理函数，支持版本控制和调用统计
 */

import type { Tool } from '@modular-agent/types';
import type { StatelessToolConfig } from '@modular-agent/types';
import { ToolError } from '@modular-agent/types';
import { BaseExecutor } from '../core/base/BaseExecutor';
import { ExecutorType } from '../core/types';
import { FunctionRegistry } from './registry/FunctionRegistry';
import type { FunctionRegistryConfig } from './types';

/**
 * 无状态工具执行器
 */
export class StatelessExecutor extends BaseExecutor {
  private functionRegistry: FunctionRegistry;

  constructor(config: Partial<FunctionRegistryConfig> = {}) {
    super();
    this.functionRegistry = new FunctionRegistry(config);
  }

  /**
   * 执行无状态工具的具体实现
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param threadId 线程ID（可选，无状态工具不使用）
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadId?: string
  ): Promise<any> {
    // 获取执行函数
    const config = tool.config as StatelessToolConfig;
    if (!config || !config.execute) {
      throw new ToolError(
        `Tool '${tool.name}' does not have an execute function`,
        tool.name,
        'STATELESS',
        { hasConfig: !!config, hasExecute: !!config?.execute }
      );
    }

    if (typeof config.execute !== 'function') {
      throw new ToolError(
        `Execute for tool '${tool.name}' is not a function`,
        tool.name,
        'STATELESS',
        { executeType: typeof config.execute }
      );
    }

    try {
      // 注册函数（如果尚未注册）
      if (!this.functionRegistry.has(tool.name)) {
        this.functionRegistry.register(
          tool.name,
          config.execute,
          config.version,
          config.description
        );
      }

      // 执行函数
      const result = await this.functionRegistry.execute(tool.name, parameters);

      return {
        result,
        functionStats: this.functionRegistry.getFunctionStats(tool.name)
      };
    } catch (error) {
      if (error instanceof ToolError) {
        throw error;
      }
      throw new ToolError(
        `Stateless tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tool.name,
        'STATELESS',
        { parameters },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 注册函数
   */
  registerFunction(
    toolName: string,
    execute: (parameters: any) => Promise<any>,
    version?: string,
    description?: string
  ): void {
    this.functionRegistry.register(toolName, execute, version, description);
  }

  /**
   * 批量注册函数
   */
  registerBatch(functions: Record<string, {
    execute: (parameters: any) => Promise<any>;
    version?: string;
    description?: string;
  }>): void {
    this.functionRegistry.registerBatch(functions);
  }

  /**
   * 注销函数
   */
  unregisterFunction(toolName: string): boolean {
    return this.functionRegistry.unregister(toolName);
  }

  /**
   * 获取函数信息
   */
  getFunctionInfo(toolName: string): any | null {
    return this.functionRegistry.get(toolName);
  }

  /**
   * 获取所有函数信息
   */
  getAllFunctionInfo(): Map<string, any> {
    return this.functionRegistry.getAllFunctionInfo();
  }

  /**
   * 获取函数统计信息
   */
  getFunctionStats(toolName: string): any | null {
    return this.functionRegistry.getFunctionStats(toolName);
  }

  /**
   * 获取所有函数名称
   */
  getFunctionNames(): string[] {
    return this.functionRegistry.getFunctionNames();
  }

  /**
   * 获取注册函数数
   */
  getFunctionCount(): number {
    return this.functionRegistry.getFunctionCount();
  }

  /**
   * 清空注册表
   */
  clearRegistry(): void {
    this.functionRegistry.clear();
  }

  /**
   * 获取执行器类型
   */
  getExecutorType(): string {
    return ExecutorType.STATELESS;
  }
}