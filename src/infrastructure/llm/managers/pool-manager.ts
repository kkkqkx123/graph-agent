import { injectable, inject } from 'inversify';
import { PollingPool } from '../../../domain/llm/entities/pool';
import { PoolConfig } from '../../../domain/llm/value-objects/pool-config';
import { ID } from '../../../domain/common/value-objects/id';
import { LLMClientFactory } from '../clients/llm-client-factory';
import { TYPES } from '../../../di/service-keys';

/**
 * 轮询池管理器
 *
 * 实现轮询池管理的具体逻辑
 */
@injectable()
export class PollingPoolManager {
  private pools: Map<string, PollingPool> = new Map();

  constructor(
    @inject(TYPES.TaskGroupManager) private taskGroupManager: any,
    @inject(TYPES.LLMClientFactory) private llmClientFactory: LLMClientFactory
  ) {}

  /**
   * 获取轮询池
   */
  async getPool(name: string): Promise<PollingPool | null> {
    return this.pools.get(name) || null;
  }

  /**
   * 创建轮询池
   */
  async createPool(name: string, config: Record<string, any>): Promise<PollingPool> {
    if (this.pools.has(name)) {
      throw new Error(`轮询池已存在: ${name}`);
    }

    // 创建轮询池配置
    const poolConfig = PoolConfig.create({
      name,
      rotationStrategy: config['rotation']?.['strategy'],
      healthCheck: config['healthCheck'],
      taskGroups: config['taskGroups'] || [],
    });

    // 异步构建模型到提供商的映射
    const modelProviderMap = await this.buildModelProviderMap(config);

    // 验证所有模型都有提供商配置
    await this.validateModelProviderMapping(config, modelProviderMap);

    // 创建客户端提供器
    const clientProvider = (modelName: string) => {
      const provider = modelProviderMap.get(modelName);
      if (!provider) {
        throw new Error(`未找到模型 ${modelName} 的提供商配置`);
      }
      return this.llmClientFactory.createClient(provider, modelName);
    };

    const pool = new PollingPool(
      ID.generate(),
      poolConfig,
      this.taskGroupManager,
      clientProvider
    );

    await pool.initialize();
    this.pools.set(name, pool);

    return pool;
  }

  /**
   * 从配置构建模型到提供商的映射
   */
  private async buildModelProviderMap(config: Record<string, any>): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    
    // 优先从instances配置中提取模型到提供商的映射
    const instances = config['instances'] || [];
    for (const instance of instances) {
      const model = instance['model'];
      const provider = instance['provider'];
      if (model && provider) {
        map.set(model, provider);
      }
    }
    
    // 从任务组获取模型列表，支持provider:model格式
    const taskGroups = config['taskGroups'] || [];
    for (const taskGroupRef of taskGroups) {
      try {
        const models = await this.taskGroupManager.getModelsForGroup(taskGroupRef);
        for (const modelRef of models) {
          // 解析provider:model格式
          const parsed = this.parseModelReference(modelRef);
          if (parsed && !map.has(parsed.modelName)) {
            map.set(parsed.modelName, parsed.provider);
          }
        }
      } catch (error) {
        console.error(`获取任务组 ${taskGroupRef} 的模型列表失败:`, error);
      }
    }
    
    return map;
  }

  /**
   * 解析模型引用
   * 支持格式: "provider:model" 或 "model"
   */
  private parseModelReference(modelRef: string): { provider: string; modelName: string } | null {
    const parts = modelRef.split(':');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return {
        provider: parts[0],
        modelName: parts[1]
      };
    }
    // 如果没有provider前缀，返回null，需要从其他地方获取provider信息
    return null;
  }

  /**
   * 验证模型到提供商映射的完整性
   */
  private async validateModelProviderMapping(
    config: Record<string, any>,
    modelProviderMap: Map<string, string>
  ): Promise<void> {
    const taskGroups = config['taskGroups'] || [];
    const missingProviders: string[] = [];
    
    for (const taskGroupRef of taskGroups) {
      try {
        const models = await this.taskGroupManager.getModelsForGroup(taskGroupRef);
        for (const modelRef of models) {
          // 解析模型引用
          const parsed = this.parseModelReference(modelRef);
          const modelName = parsed ? parsed.modelName : modelRef;
          
          if (!modelProviderMap.has(modelName)) {
            missingProviders.push(modelName);
          }
        }
      } catch (error) {
        console.error(`获取任务组 ${taskGroupRef} 的模型列表失败:`, error);
      }
    }
    
    if (missingProviders.length > 0) {
      throw new Error(
        `以下模型缺少提供商配置: ${missingProviders.join(', ')}\n` +
        `请在pools配置的instances中添加对应的provider信息，` +
        `或在task_groups中使用provider:model格式`
      );
    }
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
      availabilityRate:
        status['totalInstances'] > 0
          ? ((status['healthyInstances'] as number) + (status['degradedInstances'] as number)) /
            (status['totalInstances'] as number)
          : 0,
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
        availabilityRate:
          status['totalInstances'] > 0
            ? ((status['healthyInstances'] as number) + (status['degradedInstances'] as number)) /
              (status['totalInstances'] as number)
            : 0,
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
          lastChecked: new Date(),
        };
      } catch (error) {
        healthStatus[name] = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          lastChecked: new Date(),
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
      (sum, stats) => sum + stats.totalInstances,
      0
    );
    const healthyInstances = Object.values(allStatistics).reduce(
      (sum, stats) => sum + stats.healthyInstances,
      0
    );

    const overallAvailability = totalInstances > 0 ? healthyInstances / totalInstances : 0;

    return {
      totalPools,
      totalInstances,
      healthyInstances,
      overallAvailability,
      pools: allStatistics,
      timestamp: new Date(),
    };
  }
}
