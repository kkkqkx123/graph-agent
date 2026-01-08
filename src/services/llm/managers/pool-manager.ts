import { injectable, inject } from 'inversify';
import { PollingPool, LLMInstance } from '../../domain/llm/entities/pool';
import { InstanceConfig } from '../../domain/llm/value-objects/instance-config';
import { ID } from '../../domain/common/value-objects/id';
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
  ) { }

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

    // 构建模型到提供商的映射
    const modelProviderMap = this.buildModelProviderMap(config);

    // 验证所有模型都有提供商配置
    this.validateModelProviderMapping(config, modelProviderMap);

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
      {
        name,
        rotationStrategy: config['rotation']?.['strategy'] || 'round_robin',
        healthCheckInterval: config['healthCheck']?.interval || 30,
        healthCheckTimeout: config['healthCheck']?.timeout || 10,
        maxFailures: config['healthCheck']?.maxFailures || 3,
      }
    );

    // 从配置创建实例
    const instances = config['instances'] || [];
    for (const instanceConfig of instances) {
      const instance = this.createInstance(instanceConfig, clientProvider);
      pool.addInstance(instance);
    }

    this.pools.set(name, pool);

    return pool;
  }

  /**
   * 从配置构建模型到提供商的映射
   *
   * 新配置格式：只从instances配置中提取模型到提供商的映射
   * 每个实例必须明确指定provider和model字段
   */
  private buildModelProviderMap(config: Record<string, any>): Map<string, string> {
    const map = new Map<string, string>();

    // 从instances配置中提取模型到提供商的映射
    const instances = config['instances'] || [];
    for (const instance of instances) {
      const model = instance['model'];
      const provider = instance['provider'];
      if (model && provider) {
        map.set(model, provider);
      }
    }

    return map;
  }

  /**
   * 创建LLM实例
   */
  private createInstance(
    instanceConfig: Record<string, any>,
    clientProvider: (modelName: string) => any
  ): LLMInstance {
    const config = InstanceConfig.create({
      instanceId: instanceConfig['name'] || instanceConfig['instanceId'],
      modelName: instanceConfig['model'],
      groupName: instanceConfig['groupName'] || 'default',
      echelon: instanceConfig['echelon'] || 'default',
      maxConcurrency: instanceConfig['maxConcurrency'] || 10,
      weight: instanceConfig['weight'] || 1,
    });

    return new LLMInstance(
      ID.generate(),
      config
    );
  }

  /**
   * 验证模型到提供商映射的完整性
   *
   * 新配置格式：验证所有instances中的模型都有provider配置
   */
  private validateModelProviderMapping(
    config: Record<string, any>,
    modelProviderMap: Map<string, string>
  ): void {
    const instances = config['instances'] || [];
    const missingProviders: string[] = [];

    for (const instance of instances) {
      const model = instance['model'];
      const provider = instance['provider'];

      if (!model) {
        missingProviders.push(`实例 ${instance['name'] || 'unknown'} 缺少model字段`);
      } else if (!provider) {
        missingProviders.push(`模型 ${model} 缺少provider字段`);
      }
    }

    if (missingProviders.length > 0) {
      throw new Error(
        `配置验证失败:\n${missingProviders.map(msg => `  - ${msg}`).join('\n')}\n` +
        `请在pools配置的instances中为每个实例明确指定provider和model字段`
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
    // 清理轮询池
    this.pools.clear();
  }

  /**
   * 删除轮询池
   */
  async removePool(name: string): Promise<void> {
    this.pools.delete(name);
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

    // 删除现有池
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
