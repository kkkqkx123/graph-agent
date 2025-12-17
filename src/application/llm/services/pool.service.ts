import { 
  ILLMPoolManager, 
  PoolConfig, 
  PoolHealthStatus,
  PoolStatistics 
} from '../../../domain/llm/interfaces/pool-manager.interface';
import { Pool, PoolId } from '../../../domain/llm/entities/pool';
import { ILLMClient } from '../../../domain/llm/interfaces/llm-client.interface';
import { 
  PoolNotFoundException, 
  PoolAlreadyExistsException,
  PoolConfigurationException 
} from '../../../domain/llm/exceptions';
import { ILogger } from '@shared/types/logger';

/**
 * 轮询池服务接口
 */
export interface IPoolService extends ILLMPoolManager {
  getAllPools(): Promise<Pool[]>;
  updatePoolConfig(poolName: string, config: Partial<PoolConfig>): Promise<Pool>;
  deletePool(poolName: string): Promise<boolean>;
  getPoolStatistics(poolName: string): Promise<PoolStatistics>;
  globalHealthCheck(): Promise<Record<string, PoolHealthStatus>>;
}

/**
 * 轮询池服务实现
 * 
 * 提供轮询池的业务逻辑管理
 */
export class PoolService implements IPoolService {
  private readonly pools: Map<string, Pool> = new Map();
  private readonly healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly logger: ILogger,
    private readonly clientFactory: (config: any) => Promise<ILLMClient>
  ) {
    this.logger = logger.child({ service: 'PoolService' });
  }

  /**
   * 获取轮询池
   */
  public async getPool(poolName: string): Promise<Pool | null> {
    const pool = this.pools.get(poolName);
    return pool || null;
  }

  /**
   * 创建轮询池
   */
  public async createPool(poolConfig: PoolConfig): Promise<Pool> {
    this.logger.info('创建轮询池', { poolName: poolConfig.name });

    // 检查池是否已存在
    if (this.pools.has(poolConfig.name)) {
      throw new PoolAlreadyExistsException(poolConfig.name);
    }

    // 验证配置
    this.validatePoolConfig(poolConfig);

    // 创建池实例
    const pool = Pool.create(poolConfig);

    // 初始化池实例
    await this.initializePoolInstances(pool, poolConfig);

    // 保存池
    this.pools.set(poolConfig.name, pool);

    // 启动健康检查
    this.startHealthCheck(pool);

    this.logger.info('轮询池创建成功', { 
      poolName: poolConfig.name,
      instanceCount: pool.getInstanceCount()
    });

    return pool;
  }

  /**
   * 获取池实例
   */
  public async getPoolInstance(poolName: string): Promise<any> {
    const pool = await this.getPool(poolName);
    if (!pool) {
      throw new PoolNotFoundException(poolName);
    }

    return await pool.getInstance();
  }

  /**
   * 释放池实例
   */
  public async releasePoolInstance(poolName: string, instance: any): Promise<void> {
    const pool = await this.getPool(poolName);
    if (!pool) {
      throw new PoolNotFoundException(poolName);
    }

    pool.releaseInstance(instance);
  }

  /**
   * 执行健康检查
   */
  public async healthCheck(poolName: string): Promise<PoolHealthStatus> {
    const pool = await this.getPool(poolName);
    if (!pool) {
      throw new PoolNotFoundException(poolName);
    }

    return await pool.healthCheck();
  }

  /**
   * 获取所有轮询池
   */
  public async getAllPools(): Promise<Pool[]> {
    return Array.from(this.pools.values());
  }

  /**
   * 更新轮询池配置
   */
  public async updatePoolConfig(poolName: string, config: Partial<PoolConfig>): Promise<Pool> {
    const existingPool = await this.getPool(poolName);
    if (!existingPool) {
      throw new PoolNotFoundException(poolName);
    }

    this.logger.info('更新轮询池配置', { poolName });

    // 创建新的池配置
    const currentConfig = this.extractConfigFromPool(existingPool);
    const newConfig = { ...currentConfig, ...config };

    // 验证新配置
    this.validatePoolConfig(newConfig);

    // 创建新池实例
    const newPool = existingPool.updateConfig(config);

    // 停止旧池的健康检查
    this.stopHealthCheck(existingPool);

    // 更新池
    this.pools.set(poolName, newPool);

    // 启动新池的健康检查
    this.startHealthCheck(newPool);

    this.logger.info('轮询池配置更新成功', { poolName });

    return newPool;
  }

  /**
   * 删除轮询池
   */
  public async deletePool(poolName: string): Promise<boolean> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      return false;
    }

    this.logger.info('删除轮询池', { poolName });

    // 停止健康检查
    this.stopHealthCheck(pool);

    // 清理资源
    pool.stopHealthCheck();

    // 从映射中移除
    this.pools.delete(poolName);

    this.logger.info('轮询池删除成功', { poolName });

    return true;
  }

  /**
   * 获取池统计信息
   */
  public async getPoolStatistics(poolName: string): Promise<PoolStatistics> {
    const pool = await this.getPool(poolName);
    if (!pool) {
      throw new PoolNotFoundException(poolName);
    }

    return pool.getStatistics();
  }

  /**
   * 执行全局健康检查
   */
  public async globalHealthCheck(): Promise<Record<string, PoolHealthStatus>> {
    const results: Record<string, PoolHealthStatus> = {};

    for (const [poolName, pool] of this.pools.entries()) {
      try {
        results[poolName] = await pool.healthCheck();
      } catch (error) {
        this.logger.error('池健康检查失败', error as Error, { poolName });
        results[poolName] = {
          healthy: false,
          healthyInstances: 0,
          totalInstances: pool.getInstanceCount(),
          healthRatio: 0,
          lastChecked: new Date(),
          errors: [(error as Error).message]
        };
      }
    }

    return results;
  }

  /**
   * 获取所有池的统计信息
   */
  public async getAllPoolStatistics(): Promise<Record<string, PoolStatistics>> {
    const results: Record<string, PoolStatistics> = {};

    for (const [poolName, pool] of this.pools.entries()) {
      try {
        results[poolName] = pool.getStatistics();
      } catch (error) {
        this.logger.error('获取池统计信息失败', error as Error, { poolName });
      }
    }

    return results;
  }

  /**
   * 重启池
   */
  public async restartPool(poolName: string): Promise<void> {
    const pool = await this.getPool(poolName);
    if (!pool) {
      throw new PoolNotFoundException(poolName);
    }

    this.logger.info('重启轮询池', { poolName });

    // 停止健康检查
    this.stopHealthCheck(pool);

    // 重启池
    pool.stopHealthCheck();
    pool.startHealthCheck();

    // 重新启动健康检查
    this.startHealthCheck(pool);

    this.logger.info('轮询池重启成功', { poolName });
  }

  /**
   * 关闭服务
   */
  public async shutdown(): Promise<void> {
    this.logger.info('关闭轮询池服务');

    // 停止所有健康检查
    for (const pool of this.pools.values()) {
      this.stopHealthCheck(pool);
      pool.stopHealthCheck();
    }

    // 清理所有池
    this.pools.clear();
    this.healthCheckIntervals.clear();

    this.logger.info('轮询池服务已关闭');
  }

  private validatePoolConfig(config: PoolConfig): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new PoolConfigurationException('轮询池名称不能为空');
    }

    if (!config.taskGroups || config.taskGroups.length === 0) {
      throw new PoolConfigurationException('轮询池必须包含至少一个任务组');
    }

    if (config.healthCheckInterval <= 0) {
      throw new PoolConfigurationException('健康检查间隔必须大于0');
    }

    if (config.failureThreshold <= 0) {
      throw new PoolConfigurationException('故障阈值必须大于0');
    }

    if (config.recoveryTime <= 0) {
      throw new PoolConfigurationException('恢复时间必须大于0');
    }

    // 验证轮询策略
    if (!config.rotationStrategy || !config.rotationStrategy.type) {
      throw new PoolConfigurationException('轮询策略配置无效');
    }

    // 验证降级配置
    if (!config.fallbackConfig || !config.fallbackConfig.strategy) {
      throw new PoolConfigurationException('降级配置无效');
    }
  }

  private async initializePoolInstances(pool: Pool, config: PoolConfig): Promise<void> {
    // 这里应该根据配置创建实际的池实例
    // 暂时跳过具体实现
    this.logger.debug('初始化池实例', { 
      poolName: config.name,
      taskGroups: config.taskGroups 
    });
  }

  private startHealthCheck(pool: Pool): void {
    const interval = setInterval(async () => {
      try {
        await pool.healthCheck();
      } catch (error) {
        this.logger.error('池健康检查失败', error as Error, { 
          poolName: pool.getName() 
        });
      }
    }, pool.getHealthCheckInterval() * 1000);

    this.healthCheckIntervals.set(pool.getName(), interval);
  }

  private stopHealthCheck(pool: Pool): void {
    const interval = this.healthCheckIntervals.get(pool.getName());
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(pool.getName());
    }
  }

  private extractConfigFromPool(pool: Pool): PoolConfig {
    return {
      name: pool.getName(),
      description: pool.getDescription(),
      taskGroups: pool.getTaskGroups(),
      rotationStrategy: pool.getRotationStrategy(),
      healthCheckInterval: pool.getHealthCheckInterval(),
      failureThreshold: pool.getFailureThreshold(),
      recoveryTime: pool.getRecoveryTime(),
      fallbackConfig: pool.getFallbackConfig(),
      rateLimiting: pool.getRateLimiting()
    };
  }
}