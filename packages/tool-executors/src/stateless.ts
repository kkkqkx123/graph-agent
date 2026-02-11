/**
 * 无状态工具执行器
 * 执行应用层提供的无状态函数工具
 */

import type { Tool } from '@modular-agent/types/tool';
import type { StatelessToolConfig } from '@modular-agent/types/tool';
import type { ThreadContext } from '@modular-agent/types/common';
import { ToolError } from '@modular-agent/types/errors';
import type { IToolExecutor } from '@modular-agent/types/tool';

/**
 * 无状态工具执行器
 */
export class StatelessExecutor implements IToolExecutor {
  /**
   * 执行无状态工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param options 执行选项
   * @param threadContext 线程上下文（可选）
   * @returns 执行结果
   */
  async execute(
    tool: Tool,
    parameters: Record<string, any>,
    options?: any,
    threadContext?: ThreadContext
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