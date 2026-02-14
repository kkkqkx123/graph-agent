/**
 * 有状态工具执行器
 * 执行应用层提供的有状态工具，通过实例池管理工具实例，支持生命周期管理和健康检查
 */

import type { Tool } from '@modular-agent/types';
import type { StatefulToolConfig } from '@modular-agent/types';
import { ToolError } from '@modular-agent/types';
import { BaseExecutor } from '../core/base/BaseExecutor';
import { ExecutorType } from '../core/types';
import { InstancePool } from './pool/InstancePool';
import type { StatefulExecutorConfig } from './types';

/**
 * 有状态工具执行器
 */
export class StatefulExecutor extends BaseExecutor {
  private instancePool: InstancePool;
  private config: StatefulExecutorConfig;

  constructor(config: StatefulExecutorConfig = {}) {
    super();
    this.config = config;
    this.instancePool = new InstancePool(config.instancePool);
  }

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
      this.instancePool.registerFactory(tool.name, config.factory);

      // 获取工具实例（从实例池）
      const instance = await this.instancePool.getInstance(tool.name);

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
      
      return {
        result,
        instanceInfo: this.instancePool.getInstanceInfo(tool.name)
      };
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

  /**
   * 注册工厂函数
   */
  registerFactory(toolName: string, factory: any): void {
    this.instancePool.registerFactory(toolName, factory);
  }

  /**
   * 获取实例信息
   */
  getInstanceInfo(toolName: string): any | null {
    return this.instancePool.getInstanceInfo(toolName);
  }

  /**
   * 获取所有实例信息
   */
  getAllInstanceInfo(): Map<string, any> {
    return this.instancePool.getAllInstanceInfo();
  }

  /**
   * 获取实例数
   */
  getInstanceCount(): number {
    return this.instancePool.getInstanceCount();
  }

  /**
   * 释放指定工具的实例
   */
  async releaseInstance(toolName: string): Promise<void> {
    await this.instancePool.releaseInstance(toolName);
  }

  /**
   * 清理所有实例
   */
  async cleanup(): Promise<void> {
    await this.instancePool.destroy();
  }

  /**
   * 获取执行器类型
   */
  getExecutorType(): string {
    return ExecutorType.STATEFUL;
  }
}