/**
 * 有状态工具执行器
 * 执行应用层提供的有状态工具，通过 ThreadContext 管理工具实例，支持线程隔离
 */

import type { Tool } from '@modular-agent/types';
import type { StatefulToolConfig } from '@modular-agent/types';
import { ToolError } from '@modular-agent/types';
import { BaseExecutor } from '../core/base/BaseExecutor';
import { ExecutorType } from '../core/types';
import type { StatefulExecutorConfig } from './types';

/**
 * ThreadContext 提供器接口
 * 用于通过 threadId 获取 ThreadContext
 */
export interface ThreadContextProvider {
  /**
   * 获取 ThreadContext
   * @param threadId 线程ID
   * @returns ThreadContext 实例，如果不存在则返回 undefined
   */
  getThreadContext(threadId: string): any | undefined;
}

/**
 * 有状态工具执行器
 */
export class StatefulExecutor extends BaseExecutor {
  private threadContextProvider: ThreadContextProvider;

  constructor(threadContextProvider: ThreadContextProvider) {
    super();
    this.threadContextProvider = threadContextProvider;
  }

  /**
   * 执行有状态工具的具体实现
   * @param tool 工具定义
   * @param parameters 工具参数
   * @param threadId 线程ID（必需，用于线程隔离）
   * @returns 执行结果
   */
  protected async doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadId?: string
  ): Promise<any> {
    if (!threadId) {
      throw new ToolError(
        `ThreadId is required for stateful tool '${tool.name}'`,
        tool.name,
        'STATEFUL',
        { threadIdRequired: true }
      );
    }

    // 获取 ThreadContext
    const threadContext = this.threadContextProvider.getThreadContext(threadId);
    if (!threadContext) {
      throw new ToolError(
        `ThreadContext not found for threadId: ${threadId}`,
        tool.name,
        'STATEFUL',
        { threadId }
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
      // 在 ThreadContext 中注册工厂函数
      threadContext.registerStatefulTool(tool.name, config.factory);

      // 从 ThreadContext 获取工具实例（懒加载）
      const instance = threadContext.getStatefulTool(tool.name);

      // 调用实例的 execute 方法
      if (typeof instance.execute !== 'function') {
        throw new ToolError(
          `Tool instance for '${tool.name}' does not have an execute method`,
          tool.name,
          'STATEFUL',
          { instanceType: typeof instance, hasMethods: Object.keys(instance) }
        );
      }

      const result = await instance.execute(parameters);
      
      return {
        result,
        threadId
      };
    } catch (error) {
      if (error instanceof ToolError) {
        throw error;
      }
      throw new ToolError(
        `Stateful tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tool.name,
        'STATEFUL',
        { parameters, threadId },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 获取执行器类型
   */
  getExecutorType(): string {
    return ExecutorType.STATEFUL;
  }
}