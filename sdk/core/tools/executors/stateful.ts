/**
 * 有状态工具执行器
 * 执行应用层提供的有状态工具，通过ThreadContext实现线程隔离
 */

import type { Tool } from '../../../types/tool';
import type { StatefulToolConfig } from '../../../types/tool';
import type { ThreadContext } from '../../execution/context/thread-context';
import { BaseToolExecutor } from '../base-tool-executor';

/**
 * 有状态工具执行器
 */
export class StatefulToolExecutor extends BaseToolExecutor {
  /**
   * 执行有状态工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param threadContext 线程上下文（必需）
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadContext?: ThreadContext
  ): Promise<any> {
    if (!threadContext) {
      throw new Error(`ThreadContext is required for stateful tool '${tool.name}'`);
    }

    // 获取工厂函数
    const config = tool.config as StatefulToolConfig;
    if (!config || !config.factory) {
      throw new Error(`Tool '${tool.name}' does not have a factory function`);
    }

    if (typeof config.factory.create !== 'function') {
      throw new Error(`Factory for tool '${tool.name}' is not a function`);
    }

    try {
      // 注册工厂函数（如果尚未注册）
      threadContext.registerStatefulTool(tool.name, config.factory);

      // 获取工具实例（懒加载）
      const instance = threadContext.getStatefulTool(tool.name);

      // 调用实例的execute方法
      if (typeof instance.execute !== 'function') {
        throw new Error(`Tool instance for '${tool.name}' does not have an execute method`);
      }

      const result = await instance.execute(parameters);
      return result;
    } catch (error) {
      throw new Error(
        `Stateful tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}