/**
 * 本地工具执行器
 * 执行应用层提供的本地工具
 */

import type { Tool } from '../../../types/tool';
import { BaseToolExecutor } from '../base-tool-executor';

/**
 * 本地工具执行器
 */
export class NativeToolExecutor extends BaseToolExecutor {
  /**
   * 执行本地工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>
  ): Promise<any> {
    // 从metadata中获取执行函数
    const executor = tool.metadata?.customFields?.['executor'];

    if (!executor) {
      throw new Error(`Tool '${tool.name}' does not have an executor function`);
    }

    if (typeof executor !== 'function') {
      throw new Error(`Executor for tool '${tool.name}' is not a function`);
    }

    try {
      // 调用执行函数
      const result = await executor(parameters);

      return result;
    } catch (error) {
      throw new Error(
        `Native tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}