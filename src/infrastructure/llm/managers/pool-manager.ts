import { injectable, inject } from 'inversify';
import { IPollingPoolManager, IPollingPool } from '../../../domain/llm/interfaces/pool-manager.interface';
import { PollingPool } from '../../../domain/llm/entities/pool';
import { ID } from '../../../domain/common/value-objects/id';

/**
 * 轮询池管理器
 * 
 * 实现轮询池管理的具体逻辑
 */
@injectable()
export class PollingPoolManager implements IPollingPoolManager {
  private pools: Map<string, IPollingPool> = new Map();

  constructor(
    @inject('ITaskGroupManager') private taskGroupManager: any
  ) {}

  /**
   * 获取轮询池
   */
  async getPool(name: string): Promise<IPollingPool | null> {
    return this.pools.get(name) || null;
  }

  /**
   * 创建轮询池
   */
  async createPool(name: string, config: Record<string, any>): Promise<IPollingPool> {
    if (this.pools.has(name)) {
      throw new Error(`轮询池已存在: ${name}`);
    }

    const pool = new PollingPool(
      ID.generate(),
      name,
      config,
      this.taskGroupManager
    );

    await pool.initialize();
    this.pools.set(name, pool);

    return pool;
  }

  /**
   * 获取所有轮询池状态
   */
  async listAllStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const [name, pool] of this.pools.entries()) {
      status[name] = await pool.getStatus();
    }

    return status;
  }

  /**
   * 关闭所有轮询池
   */
  async shutdownAll(): Promise<void> {
    for (const pool of this.pools.values()) {
      await pool.shutdown();
    }
    this.pools.clear();
  }

  /**
   * 删除轮询池
   */
  async removePool(name: string): Promise<void> {
    const pool = this.pools.get(name);
    if (pool) {
      await pool.shutdown();
      this.pools.delete(name);
    }
  }

  /**
   * 获取轮询池列表
   */
  async listPools(): Promise<string[]> {
    return Array.from(this.pools.keys());
  }

  /**
   * 检查轮询池是否存在
   */
  async hasPool(name: string): Promise<boolean> {
    return this.pools.has(name);
  }

  /**
   * 重新加载轮询池配置
   */
  async reloadPool(name: string, newConfig: Record<string, any>): Promise<void> {
    const existingPool = this.pools.get(name);
    if (!existingPool) {
      throw new Error(`轮询池不存在: ${name}`);
    }

    // 关闭现有池
    await existingPool.shutdown();
    this.pools.delete(name);

    // 创建新池
    await this.createPool(name, newConfig);
  }

  /**
   * 获取轮询池统计信息
   */
  async getPoolStatistics(name: string): Promise<Record<string, any>> {
    const pool = await this.getPool(name);
    if (!pool) {
      throw new Error(`轮询池不存在: ${name}`);
    }

    const status = await pool.getStatus();
    return {
      name,
      totalInstances: status['totalInstances'],
      healthyInstances: status['healthyInstances'],
      degradedInstances: status['degradedInstances'],
      failedInstances: status['failedInstances'],
      availabilityRate: status['totalInstances'] > 0 ? 
        ((status['healthyInstances'] as number) + (status['degradedInstances'] as number)) / (status['totalInstances'] as number) : 0
    };
  }

  /**
   * 获取所有轮询池统计信息
   */
  async getAllPoolsStatistics(): Promise<Record<string, any>> {
    const allStatus = await this.listAllStatus();
    const statistics: Record<string, any> = {};

    for (const [name, status] of Object.entries(allStatus)) {
      statistics[name] = {
        name,
        totalInstances: status['totalInstances'],
        healthyInstances: status['healthyInstances'],
        degradedInstances: status['degradedInstances'],
        failedInstances: status['failedInstances'],
        availabilityRate: status['totalInstances'] > 0 ? 
          ((status['healthyInstances'] as number) + (status['degradedInstances'] as number)) / (status['totalInstances'] as number) : 0
      };
    }

    return statistics;
  }

  /**
   * 健康检查所有轮询池
   */
  async healthCheckAll(): Promise<Record<string, any>> {
    const healthStatus: Record<string, any> = {};

    for (const [name, pool] of this.pools.entries()) {
      try {
        const status = await pool.getStatus();
        const healthyInstances = (status['healthyInstances'] as number) || 0;
        const totalInstances = (status['totalInstances'] as number) || 0;

        healthStatus[name] = {
          status: healthyInstances > 0 ? 'healthy' : 'unhealthy',
          healthyInstances,
          totalInstances,
          availabilityRate: totalInstances > 0 ? healthyInstances / totalInstances : 0,
          lastChecked: new Date()
        };
      } catch (error) {
        healthStatus[name] = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          lastChecked: new Date()
        };
      }
    }

    return healthStatus;
  }

  /**
   * 获取系统级报告
   */
  async getSystemReport(): Promise<Record<string, any>> {
    const allStatistics = await this.getAllPoolsStatistics();
    const totalPools = Object.keys(allStatistics).length;
    const totalInstances = Object.values(allStatistics).reduce(
      (sum, stats) => sum + stats.totalInstances, 0
    );
    const healthyInstances = Object.values(allStatistics).reduce(
      (sum, stats) => sum + stats.healthyInstances, 0
    );

    const overallAvailability = totalInstances > 0 ? 
      healthyInstances / totalInstances : 0;

    return {
      totalPools,
      totalInstances,
      healthyInstances,
      overallAvailability,
      pools: allStatistics,
      timestamp: new Date()
    };
  }
}