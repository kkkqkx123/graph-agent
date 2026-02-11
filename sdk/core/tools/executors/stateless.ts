/**
 * 无状态工具执行器
 * 执行应用层提供的无状态函数工具
 */

import type { Tool } from '@modular-agent/types/tool';
import type { StatelessToolConfig } from '@modular-agent/types/tool';
import { ToolError } from '@modular-agent/types/errors';
import { BaseToolExecutor } from '../base-tool-executor';

/**
 * 无状态工具执行器
 */
export class StatelessToolExecutor extends BaseToolExecutor {
  /**
   * 执行无状态工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
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
      // 调用执行函数
      const result = await config.execute(parameters);
      return result;
    } catch (error) {
      throw new ToolError(
        `Stateless tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tool.name,
        'STATELESS',
        { parameters },
        error instanceof Error ? error : undefined
      );
    }
  }
}