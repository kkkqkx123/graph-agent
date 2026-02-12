/**
 * 有状态工具执行器
 * 执行应用层提供的有状态工具，通过ThreadContext实现线程隔离
 */

import type { Tool } from '@modular-agent/types/tool';
import type { StatefulToolConfig } from '@modular-agent/types/tool';
import { ToolError } from '@modular-agent/types/errors';
import { BaseToolExecutor } from './base-executor';

/**
 * 有状态工具执行器
 */
export class StatefulExecutor extends BaseToolExecutor {
  /**
   * 执行有状态工具的具体实现
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param threadContext 线程上下文（必需）
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadContext?: any
  ): Promise<any> {
    if (!threadContext) {
      throw new ToolError(
        `ThreadContext is required for stateful tool '${tool.name}'`,
        tool.name,
        'STATEFUL',
        { threadContextRequired: true }
      );
    }

    // 获取工厂函数
    const config = tool.config as StatefulToolConfig;
    if (!config || !config.factory) {
      throw new ToolError(
        `Tool '${tool.name}' does not have a factory function`,
        tool.name,
        'STATEFUL',
        { hasConfig: !!config, hasFactory: !!config?.factory }
      );
    }

    if (typeof config.factory.create !== 'function') {
      throw new ToolError(
        `Factory for tool '${tool.name}' is not a function`,
        tool.name,
        'STATEFUL',
        { factoryCreateType: typeof config.factory.create }
      );
    }

    try {
      // 注册工厂函数（如果尚未注册）
      threadContext.registerStatefulTool(tool.name, config.factory);

      // 获取工具实例（懒加载）
      const instance = threadContext.getStatefulTool(tool.name);

      // 调用实例的execute方法
      if (typeof instance.execute !== 'function') {
        throw new ToolError(
          `Tool instance for '${tool.name}' does not have an execute method`,
          tool.name,
          'STATEFUL',
          { instanceType: typeof instance, hasMethods: Object.keys(instance) }
        );
      }

      const result = await instance.execute(parameters);
      return result;
    } catch (error) {
      if (error instanceof ToolError) {
        throw error;
      }
      throw new ToolError(
        `Stateful tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tool.name,
        'STATEFUL',
        { parameters },
        error instanceof Error ? error : undefined
      );
    }
  }
}