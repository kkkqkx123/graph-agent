import { injectable, inject } from 'inversify';
import { IPollingPoolManager } from '../../../domain/llm/interfaces/pool-manager.interface';
import { PollingPoolNotFoundError } from '../../../domain/llm/exceptions/pool-exceptions';

/**
 * 轮询池服务
 * 
 * 提供轮询池管理的应用层服务
 */
@injectable()
export class PoolService {
  constructor(
    @inject('IPollingPoolManager') private poolManager: IPollingPoolManager
  ) {}

  /**
   * 获取轮询池
   */
  async getPool(poolName: string): Promise<any> {
    const pool = await this.poolManager.getPool(poolName);
    
    if (!pool) {
      throw new PollingPoolNotFoundError(poolName);
    }
    
    return pool;
  }

  /**
   * 调用轮询池的LLM
   */
  async callLLM(poolName: string, prompt: string, kwargs?: Record<string, any>): Promise<any> {
    const pool = await this.getPool(poolName);
    return pool.callLLM(prompt, kwargs);
  }

  /**
   * 获取轮询池状态
   */
  async getPoolStatus(poolName: string): Promise<Record<string, any>> {
    const pool = await this.getPool(poolName);
    return pool.getStatus();
  }

  /**
   * 获取所有轮询池状态
   */
  async getAllPoolsStatus(): Promise<Record<string, any>> {
    return this.poolManager.listAllStatus();
  }

  /**
   * 检查轮询池是否可用
   */
  async isPoolAvailable(poolName: string): Promise<boolean> {
    try {
      const status = await this.getPoolStatus(poolName);
      return status['healthyInstances'] > 0;
    } catch {
      return false;
    }
  }

  /**
   * 获取轮询池统计信息
   */
  async getPoolStatistics(poolName: string): Promise<Record<string, any>> {
    const status = await this.getPoolStatus(poolName);
    
    return {
      name: poolName,
      totalInstances: status['totalInstances'],
      healthyInstances: status['healthyInstances'],
      degradedInstances: status['degradedInstances'],
      failedInstances: status['failedInstances'],
      availabilityRate: status['totalInstances'] > 0 ?
        (status['healthyInstances'] + status['degradedInstances']) / status['totalInstances'] : 0,
      concurrencyStatus: status['concurrencyStatus']
    };
  }

  /**
   * 获取所有轮询池的统计信息
   */
  async getAllPoolsStatistics(): Promise<Record<string, any>> {
    const allStatus = await this.getAllPoolsStatus();
    const statistics: Record<string, any> = {};
    
    for (const [poolName, status] of Object.entries(allStatus)) {
      statistics[poolName] = {
        name: poolName,
        totalInstances: status['totalInstances'],
        healthyInstances: status['healthyInstances'],
        degradedInstances: status['degradedInstances'],
        failedInstances: status['failedInstances'],
        availabilityRate: status['totalInstances'] > 0 ?
          (status['healthyInstances'] + status['degradedInstances']) / status['totalInstances'] : 0
      };
    }
    
    return statistics;
  }

  /**
   * 关闭轮询池
   */
  async shutdownPool(poolName: string): Promise<void> {
    const pool = await this.getPool(poolName);
    await pool.shutdown();
  }

  /**
   * 关闭所有轮询池
   */
  async shutdownAllPools(): Promise<void> {
    await this.poolManager.shutdownAll();
  }

  /**
   * 重新加载轮询池配置
   */
  async reloadPool(poolName: string): Promise<void> {
    // TODO: 实现轮询池重新加载逻辑
    // 这可能需要关闭现有池并重新创建
    console.log(`重新加载轮询池: ${poolName}`);
  }

  /**
   * 获取轮询池健康报告
   */
  async getPoolHealthReport(poolName: string): Promise<Record<string, any>> {
    const status = await this.getPoolStatus(poolName);
    const statistics = await this.getPoolStatistics(poolName);
    
    return {
      poolName,
      status: 'healthy', // 简化实现
      issues: [],
      recommendations: [],
      statistics,
      lastChecked: new Date()
    };
  }

  /**
   * 获取系统级轮询池报告
   */
  async getSystemPoolReport(): Promise<Record<string, any>> {
    const allStatistics = await this.getAllPoolsStatistics();
    const totalPools = Object.keys(allStatistics).length;
    const totalInstances = Object.values(allStatistics).reduce(
      (sum, stats) => sum + stats['totalInstances'], 0
    );
    const healthyInstances = Object.values(allStatistics).reduce(
      (sum, stats) => sum + stats['healthyInstances'], 0
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