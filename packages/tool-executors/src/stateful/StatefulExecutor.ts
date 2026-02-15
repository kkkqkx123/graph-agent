/**
 * 有状态工具执行器
 * 执行应用层提供的有状态工具，直接管理工具实例，支持线程隔离
 */

import type { Tool } from '@modular-agent/types';
import type { StatefulToolConfig, StatefulToolFactory } from '@modular-agent/types';
import { ToolError } from '@modular-agent/types';
import { BaseExecutor } from '../core/base/BaseExecutor';
import { ExecutorType } from '../core/types';
import type { StatefulExecutorConfig } from './types';

/**
 * 有状态工具执行器
 */
export class StatefulExecutor extends BaseExecutor {
  private config: StatefulExecutorConfig;
  // 按线程ID和工具名称管理实例：Map<threadId, Map<toolName, { instance, createdAt }>>
  private threadInstances: Map<string, Map<string, { instance: any; createdAt: number }>> = new Map();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: StatefulExecutorConfig = {}) {
    super();
    this.config = {
      enableInstanceCache: config.enableInstanceCache ?? true,
      maxCachedInstances: config.maxCachedInstances ?? 100,
      instanceExpirationTime: config.instanceExpirationTime ?? 3600000, // 1小时
      autoCleanupExpiredInstances: config.autoCleanupExpiredInstances ?? true,
      cleanupInterval: config.cleanupInterval ?? 300000 // 5分钟
    };

    // 启动自动清理
    if (this.config.autoCleanupExpiredInstances) {
      this.startCleanupTimer();
    }
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

    // 获取工厂函数
    const toolConfig = tool.config as StatefulToolConfig;
    if (!toolConfig || !toolConfig.factory) {
      throw new ToolError(
        `Tool '${tool.name}' does not have a factory function`,
        tool.name,
        'STATEFUL',
        { hasConfig: !!toolConfig, hasFactory: !!toolConfig?.factory }
      );
    }

    if (typeof toolConfig.factory.create !== 'function') {
      throw new ToolError(
        `Factory for tool '${tool.name}' is not a function`,
        tool.name,
        'STATEFUL',
        { factoryCreateType: typeof toolConfig.factory.create }
      );
    }

    try {
      // 获取或创建工具实例（线程隔离）
      const instance = this.getOrCreateInstance(threadId!, tool.name, toolConfig.factory);

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
   * 获取或创建工具实例（线程隔离）
   * @param threadId 线程ID
   * @param toolName 工具名称
   * @param factory 工厂函数
   * @returns 工具实例
   */
  private getOrCreateInstance(threadId: string, toolName: string, factory: StatefulToolFactory): any {
    // 获取或创建该线程的实例映射
    if (!this.threadInstances.has(threadId)) {
      this.threadInstances.set(threadId, new Map());
    }

    const threadMap = this.threadInstances.get(threadId)!;

    // 如果已存在实例，直接返回
    if (threadMap.has(toolName)) {
      return threadMap.get(toolName)!.instance;
    }

    // 创建新实例
    const instance = factory.create();
    threadMap.set(toolName, {
      instance,
      createdAt: Date.now()
    });

    return instance;
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredInstances();
    }, this.config.cleanupInterval);
  }

  /**
   * 清理过期实例
   */
  private cleanupExpiredInstances(): void {
    const now = Date.now();
    for (const [threadId, threadMap] of this.threadInstances.entries()) {
      for (const [toolName, { createdAt }] of threadMap.entries()) {
        if (now - createdAt > this.config.instanceExpirationTime!) {
          threadMap.delete(toolName);
        }
      }
      // 如果线程没有实例了，删除线程映射
      if (threadMap.size === 0) {
        this.threadInstances.delete(threadId);
      }
    }
  }

  /**
   * 清理指定线程的所有实例
   * @param threadId 线程ID
   */
  cleanupThread(threadId: string): void {
    const threadMap = this.threadInstances.get(threadId);
    if (threadMap) {
      for (const [toolName, { instance }] of threadMap.entries()) {
        if (typeof instance.cleanup === 'function') {
          instance.cleanup();
        }
      }
      this.threadInstances.delete(threadId);
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    // 清理所有实例
    for (const [threadId, threadMap] of this.threadInstances.entries()) {
      for (const [toolName, { instance }] of threadMap.entries()) {
        if (typeof instance.cleanup === 'function') {
          instance.cleanup();
        }
      }
    }
    this.threadInstances.clear();
  }

  /**
   * 获取执行器类型
   */
  getExecutorType(): string {
    return ExecutorType.STATEFUL;
  }
}