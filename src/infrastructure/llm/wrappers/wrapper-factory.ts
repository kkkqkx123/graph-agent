import { injectable, inject } from 'inversify';
import { ILLMWrapperFactory, ILLMWrapper } from '../../../domain/llm/interfaces/llm-wrapper.interface';
import { PollingPoolWrapper } from '../../../domain/llm/entities/wrapper';
import { TaskGroupWrapper } from '../../../domain/llm/entities/wrapper';
import { DirectLLMWrapper } from '../../../domain/llm/entities/wrapper';
import { ID } from '../../../domain/common/value-objects/id';

/**
 * LLM包装器工厂
 * 
 * 实现包装器创建的具体逻辑
 */
@injectable()
export class LLMWrapperFactory implements ILLMWrapperFactory {
  private wrappers: Map<string, ILLMWrapper> = new Map();

  constructor(
    @inject('IPollingPoolManager') private poolManager: any,
    @inject('ITaskGroupManager') private taskGroupManager: any
  ) {}

  /**
   * 创建轮询池包装器
   */
  async createPollingPoolWrapper(poolName: string, config?: Record<string, any>): Promise<ILLMWrapper> {
    const pool = await this.poolManager.getPool(poolName);
    if (!pool) {
      throw new Error(`轮询池不存在: ${poolName}`);
    }

    const wrapper = new PollingPoolWrapper(
      ID.generate(),
      poolName,
      config || {},
      pool
    );

    this.wrappers.set(poolName, wrapper);
    return wrapper;
  }

  /**
   * 创建任务组包装器
   */
  async createTaskGroupWrapper(groupName: string, config?: Record<string, any>): Promise<ILLMWrapper> {
    const wrapper = new TaskGroupWrapper(
      ID.generate(),
      groupName,
      config || {},
      this.taskGroupManager
    );

    this.wrappers.set(groupName, wrapper);
    return wrapper;
  }

  /**
   * 创建直接LLM包装器
   */
  async createDirectLLMWrapper(client: any, config?: Record<string, any>): Promise<ILLMWrapper> {
    const wrapper = new DirectLLMWrapper(
      ID.generate(),
      client.getClientName(),
      config || {},
      client
    );

    this.wrappers.set(client.getClientName(), wrapper);
    return wrapper;
  }

  /**
   * 获取所有包装器
   */
  async getAllWrappers(): Promise<ILLMWrapper[]> {
    return Array.from(this.wrappers.values());
  }

  /**
   * 关闭所有包装器
   */
  async closeAll(): Promise<void> {
    for (const wrapper of this.wrappers.values()) {
      await wrapper.close();
    }
    this.wrappers.clear();
  }

  /**
   * 获取包装器
   */
  async getWrapper(name: string): Promise<ILLMWrapper | null> {
    return this.wrappers.get(name) || null;
  }

  /**
   * 删除包装器
   */
  async removeWrapper(name: string): Promise<void> {
    const wrapper = this.wrappers.get(name);
    if (wrapper) {
      await wrapper.close();
      this.wrappers.delete(name);
    }
  }

  /**
   * 检查包装器是否存在
   */
  async hasWrapper(name: string): Promise<boolean> {
    return this.wrappers.has(name);
  }

  /**
   * 获取包装器列表
   */
  async listWrappers(): Promise<string[]> {
    return Array.from(this.wrappers.keys());
  }

  /**
   * 重新创建包装器
   */
  async recreateWrapper(name: string, config?: Record<string, any>): Promise<ILLMWrapper> {
    await this.removeWrapper(name);

    // 根据名称判断包装器类型
    if (await this.poolManager.hasPool(name)) {
      return this.createPollingPoolWrapper(name, config);
    } else if (await this.taskGroupManager.validateGroupReference(name)) {
      return this.createTaskGroupWrapper(name, config);
    } else {
      throw new Error(`无法确定包装器类型: ${name}`);
    }
  }

  /**
   * 获取包装器统计信息
   */
  async getWrapperStatistics(name: string): Promise<Record<string, any>> {
    const wrapper = await this.getWrapper(name);
    if (!wrapper) {
      throw new Error(`包装器不存在: ${name}`);
    }

    const status = await wrapper.getStatus();
    const stats = status['stats'] as Record<string, any>;
    return {
      name,
      totalRequests: stats?.['totalRequests'] || 0,
      successfulRequests: stats?.['successfulRequests'] || 0,
      failedRequests: stats?.['failedRequests'] || 0,
      avgResponseTime: stats?.['avgResponseTime'] || 0,
      successRate: (stats?.['totalRequests'] as number) > 0 ? 
        ((stats['successfulRequests'] as number) / (stats['totalRequests'] as number)) : 0,
      available: await wrapper.isAvailable()
    };
  }

  /**
   * 获取所有包装器统计信息
   */
  async getAllWrappersStatistics(): Promise<Record<string, any>> {
    const allWrappers = await this.getAllWrappers();
    const statistics: Record<string, any> = {};

    for (const wrapper of allWrappers) {
      statistics[wrapper.getName()] = await this.getWrapperStatistics(wrapper.getName());
    }

    return statistics;
  }

  /**
   * 健康检查所有包装器
   */
  async healthCheckAll(): Promise<Record<string, any>> {
    const healthStatus: Record<string, any> = {};

    for (const wrapper of this.wrappers.values()) {
      try {
        const available = await wrapper.isAvailable();
        const status = await wrapper.getStatus();

        healthStatus[wrapper.getName()] = {
          status: available ? 'healthy' : 'unhealthy',
          available,
          stats: status['stats'],
          lastChecked: new Date()
        };
      } catch (error) {
        healthStatus[wrapper.getName()] = {
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
    const allStatistics = await this.getAllWrappersStatistics();
    const totalWrappers = Object.keys(allStatistics).length;
    const totalRequests = Object.values(allStatistics).reduce(
      (sum, stats) => sum + stats.totalRequests, 0
    );
    const successfulRequests = Object.values(allStatistics).reduce(
      (sum, stats) => sum + stats.successfulRequests, 0
    );

    const overallSuccessRate = totalRequests > 0 ? 
      successfulRequests / totalRequests : 0;

    return {
      totalWrappers,
      totalRequests,
      successfulRequests,
      overallSuccessRate,
      wrappers: allStatistics,
      timestamp: new Date()
    };
  }

  /**
   * 批量创建包装器
   */
  async batchCreateWrappers(wrapperConfigs: Array<{
    name: string;
    type: 'polling_pool' | 'task_group' | 'direct_llm';
    config?: Record<string, any>;
  }>): Promise<ILLMWrapper[]> {
    const wrappers: ILLMWrapper[] = [];

    for (const config of wrapperConfigs) {
      let wrapper: ILLMWrapper;

      switch (config.type) {
        case 'polling_pool':
          wrapper = await this.createPollingPoolWrapper(config.name, config.config);
          break;
        case 'task_group':
          wrapper = await this.createTaskGroupWrapper(config.name, config.config);
          break;
        case 'direct_llm':
          // 需要传入实际的LLM客户端
          throw new Error('直接LLM包装器创建需要传入LLM客户端');
        default:
          throw new Error(`不支持的包装器类型: ${config.type}`);
      }

      wrappers.push(wrapper);
    }

    return wrappers;
  }
}