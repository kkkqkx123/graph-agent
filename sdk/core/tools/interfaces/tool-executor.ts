/**
 * 工具执行器接口
 * 
 * 定义工具执行器的标准接口，所有工具执行器都必须实现此接口
 */

import type { Tool } from '@modular-agent/types';
import type { ThreadContext } from '../../execution/context/thread-context';
import type { ToolExecutionOptions, ToolExecutionResult } from '@modular-agent/types';

/**
 * 工具执行器接口
 */
export interface IToolExecutor {
  /**
   * 执行工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param options 执行选项
   * @param threadContext 线程上下文（可选）
   * @returns 执行结果
   */
  execute(
    tool: Tool,
    parameters: Record<string, any>,
    options: ToolExecutionOptions,
    threadContext?: ThreadContext
  ): Promise<ToolExecutionResult>;
}