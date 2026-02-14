/**
 * 实例池
 * 管理有状态工具的实例，提供实例复用、生命周期管理、健康检查等功能
 */

import type { ToolInstanceFactory, InstancePoolConfig, InstanceInfo } from '../types';
import { ToolError } from '@modular-agent/types';

/**
 * 实例池
 */
export class InstancePool {
  private instances: Map<string, InstanceInfo> = new Map();
  private factories: Map<string, ToolInstanceFactory> = new Map();
  private config: InstancePoolConfig;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<InstancePoolConfig> = {}) {
    this.config = {
      maxInstances: config.maxInstances ?? 10,
      minInstances: config.minInstances ?? 1,
      idleTimeout: config.idleTimeout ?? 300000, // 5分钟
      maxLifetime: config.maxLifetime ?? 3600000, // 1小时
      enableHealthCheck: config.enableHealthCheck ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 60000 // 1分钟
    };

    // 启动健康检查
    if (this.config.enableHealthCheck) {
      this.startHealthCheck();
    }
  }

  /**
   * 注册工厂函数
   */
  registerFactory(toolName: string, factory: ToolInstanceFactory): void {
    this.factories.set(toolName, factory);
  }

  /**
   * 获取或创建实例
   */
  async getInstance(toolName: string): Promise<any> {
    // 检查是否已注册工厂
    if (!this.factories.has(toolName)) {
      throw new ToolError(
        `Factory for tool '${toolName}' is not registered`,
        toolName,
        'STATEFUL',
        { toolName }
      );
    }

    // 检查是否已有可用实例
    const instanceInfo = this.instances.get(toolName);
    if (instanceInfo && instanceInfo.isHealthy) {
      // 更新使用信息
      instanceInfo.lastUsedAt = new Date();
      instanceInfo.useCount++;
      return instanceInfo.instance;
    }

    // 创建新实例
    return await this.createInstance(toolName);
  }

  /**
   * 创建新实例
   */
  private async createInstance(toolName: string): Promise<any> {
    // 检查实例数限制
    if (this.instances.size >= this.config.maxInstances) {
      // 尝试清理空闲实例
      await this.cleanupIdleInstances();
      
      // 如果仍然超过限制，抛出错误
      if (this.instances.size >= this.config.maxInstances) {
        throw new ToolError(
          `Maximum instances (${this.config.maxInstances}) reached`,
          toolName,
          'STATEFUL',
          { currentInstances: this.instances.size }
        );
      }
    }

    const factory = this.factories.get(toolName)!;
    const instance = factory.create();

    // 创建实例信息
    const instanceInfo: InstanceInfo = {
      instance,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 1,
      isHealthy: true
    };

    this.instances.set(toolName, instanceInfo);

    return instance;
  }

  /**
   * 释放实例
   */
  async releaseInstance(toolName: string): Promise<void> {
    const instanceInfo = this.instances.get(toolName);
    if (!instanceInfo) {
      return;
    }

    const factory = this.factories.get(toolName);
    if (factory && factory.destroy) {
      try {
        await factory.destroy(instanceInfo.instance);
      } catch (error) {
        console.error(`Error destroying instance for ${toolName}:`, error);
      }
    }

    this.instances.delete(toolName);
  }

  /**
   * 清理空闲实例
   */
  private async cleanupIdleInstances(): Promise<void> {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [toolName, instanceInfo] of this.instances) {
      const idleTime = now - instanceInfo.lastUsedAt.getTime();
      const lifetime = now - instanceInfo.createdAt.getTime();

      // 清理空闲超时或生命周期超时的实例
      if (idleTime > this.config.idleTimeout || lifetime > this.config.maxLifetime) {
        toRemove.push(toolName);
      }
    }

    for (const toolName of toRemove) {
      await this.releaseInstance(toolName);
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    for (const [toolName, instanceInfo] of this.instances) {
      try {
        // 检查实例是否有healthCheck方法
        if (typeof instanceInfo.instance.healthCheck === 'function') {
          const isHealthy = await instanceInfo.instance.healthCheck();
          instanceInfo.isHealthy = isHealthy;
          
          if (!isHealthy) {
            console.warn(`Instance for ${toolName} is unhealthy, recreating...`);
            await this.releaseInstance(toolName);
          }
        }
      } catch (error) {
        console.error(`Health check error for ${toolName}:`, error);
        instanceInfo.isHealthy = false;
        await this.releaseInstance(toolName);
      }
    }
  }

  /**
   * 获取实例信息
   */
  getInstanceInfo(toolName: string): InstanceInfo | null {
    return this.instances.get(toolName) || null;
  }

  /**
   * 获取所有实例信息
   */
  getAllInstanceInfo(): Map<string, InstanceInfo> {
    return new Map(this.instances);
  }

  /**
   * 获取实例数
   */
  getInstanceCount(): number {
    return this.instances.size;
  }

  /**
   * 清理所有实例
   */
  async cleanup(): Promise<void> {
    const toolNames = Array.from(this.instances.keys());
    for (const toolName of toolNames) {
      await this.releaseInstance(toolName);
    }
  }

  /**
   * 销毁实例池
   */
  async destroy(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    await this.cleanup();
    this.factories.clear();
  }
}