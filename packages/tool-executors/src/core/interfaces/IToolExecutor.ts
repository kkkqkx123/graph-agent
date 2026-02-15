/**
 * 工具执行器接口
 * 定义所有执行器必须实现的核心契约
 */

import type { Tool, ToolExecutionOptions, ToolExecutionResult } from '@modular-agent/types';

/**
 * 工具执行器接口
 */
export interface IToolExecutor {
  /**
   * 执行工具
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param options 执行选项
   * @param threadId 线程ID（可选，用于有状态工具的线程隔离）
   * @returns 执行结果
   */
  execute(
    tool: Tool,
    parameters: Record<string, any>,
    options?: ToolExecutionOptions,
    threadId?: string
  ): Promise<ToolExecutionResult>;

  /**
   * 验证工具参数
   * @param tool 工具定义
   * @param parameters 工具参数
   * @throws ValidationError 如果参数验证失败
   */
  validateParameters(tool: Tool, parameters: Record<string, any>): void;

  /**
   * 清理资源
   * @returns Promise
   */
  cleanup?(): Promise<void>;

  /**
   * 获取执行器类型
   */
  getExecutorType(): string;
}