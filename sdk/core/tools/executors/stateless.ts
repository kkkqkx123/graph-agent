/**
 * 无状态工具执行器
 * 执行应用层提供的无状态函数工具
 */

import type { Tool } from '../../../types/tool';
import type { StatelessToolConfig } from '../../../types/tool';
import type { ThreadContext } from '../../execution/context/thread-context';
import { BaseToolExecutor } from '../base-tool-executor';

/**
 * 无状态工具执行器
 */
export class StatelessToolExecutor extends BaseToolExecutor {
  /**
   * 执行无状态工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param threadContext 线程上下文（可选，无状态工具不使用）
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadContext?: ThreadContext
  ): Promise<any> {
    // 获取执行函数
    const config = tool.config as StatelessToolConfig;
    if (!config || !config.execute) {
      throw new Error(`Tool '${tool.name}' does not have an execute function`);
    }

    if (typeof config.execute !== 'function') {
      throw new Error(`Execute for tool '${tool.name}' is not a function`);
    }

    try {
      // 调用执行函数
      const result = await config.execute(parameters);
      return result;
    } catch (error) {
      throw new Error(
        `Stateless tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}