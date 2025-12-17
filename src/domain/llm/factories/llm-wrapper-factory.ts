import { 
  ILLMWrapperFactory, 
  ILLMWrapper, 
  WrapperConfiguration,
  HealthStatus,
  WrapperStatistics,
  ManagerStatistics
} from '../interfaces/llm-wrapper.interface';
import { PoolWrapper } from '../wrappers/pool-wrapper';
import { TaskGroupWrapper } from '../wrappers/task-group-wrapper';
import { IPoolService } from '../../application/llm/services/pool.service';
import { ITaskGroupService } from '../../application/llm/services/task-group.service';
import { ILLMClient } from '../interfaces/llm-client.interface';
import { 
  WrapperNotFoundException,
  WrapperAlreadyExistsException,
  UnsupportedWrapperTypeException,
  WrapperConfigurationException
} from '../exceptions';
import { ILogger } from '@shared/types/logger';

/**
 * LLM包装器工厂实现
 * 
 * 负责创建、管理和协调不同类型的LLM包装器
 */
export class LLMWrapperFactory implements ILLMWrapperFactory {
  private readonly wrappers: Map<string, ILLMWrapper> = new Map();
  private readonly wrapperTypes: Map<string, WrapperTypeFactory> = new Map();
  private readonly logger: ILogger;

  constructor(
    private readonly poolService: IPoolService,
    private readonly taskGroupService: ITaskGroupService,
    private readonly clientFactory: (config: any) => Promise<ILLMClient>,
    logger: ILogger
  ) {
    this.logger = logger.child({ factory: 'LLMWrapperFactory' });
    this.registerDefaultWrapperTypes();
  }

  /**
   * 创建包装器
   */
  public async createWrapper(config: WrapperConfiguration): Promise<ILLMWrapper> {
    this.logger.info('创建包装器', { name: config.name, type: config.type });

    // 检查包装器是否已存在
    if (this.wrappers.has(config.name)) {
      throw new WrapperAlreadyExistsException(config.name);
    }

    // 验证配置
    this.validateWrapperConfig(config);

    // 获取包装器工厂函数
    const factory = this.wrapperTypes.get(config.type);
    if (!factory) {
      throw new UnsupportedWrapperTypeException(config.type);
    }

    try {
      // 创建包装器
      const wrapper = await factory(config);
      
      // 初始化包装器
      await wrapper.initialize();
      
      // 保存包装器
      this.wrappers.set(config.name, wrapper);

      this.logger.info('包装器创建成功', { name: config.name, type: config.type });
      
      return wrapper;
    } catch (error) {
      this.logger.error('包装器创建失败', error as Error, { 
        name: config.name, 
        type: config.type 
      });
      throw error;
    }
  }

  /**
   * 获取包装器
   */
  public async getWrapper(name: string): Promise<ILLMWrapper | null> {
    return this.wrappers.get(name) || null;
  }

  /**
   * 获取所有包装器
   */
  public async getAllWrappers(): Promise<Map<string, ILLMWrapper>> {
    return new Map(this.wrappers);
  }

  /**
   * 删除包装器
   */
  public async removeWrapper(name: string): Promise<boolean> {
    const wrapper = this.wrappers.get(name);
    if (!wrapper) {
      return false;
    }

    this.logger.info('删除包装器', { name });

    try {
      // 关闭包装器
      await wrapper.close();
      
      // 从映射中移除
      this.wrappers.delete(name);

      this.logger.info('包装器删除成功', { name });
      
      return true;
    } catch (error) {
      this.logger.error('包装器删除失败', error as Error, { name });
      return false;
    }
  }

  /**
   * 注册包装器类型
   */
  public registerWrapperType(
    type: string,
    factory: (config: WrapperConfiguration) => Promise<ILLMWrapper>
  ): void {
    this.logger.info('注册包装器类型', { type });
    this.wrapperTypes.set(type, factory);
  }

  /**
   * 批量创建包装器
   */
  public async createWrappers(configs: WrapperConfiguration[]): Promise<Map<string, ILLMWrapper>> {
    const results = new Map<string, ILLMWrapper>();
    const errors: Array<{ name: string; error: Error }> = [];

    this.logger.info('批量创建包装器', { count: configs.length });

    for (const config of configs) {
      try {
        const wrapper = await this.createWrapper(config);
        results.set(config.name, wrapper);
      } catch (error) {
        errors.push({ name: config.name, error: error as Error });
        this.logger.error('包装器创建失败', error as Error, { 
          name: config.name 
        });
      }
    }

    this.logger.info('批量创建包装器完成', { 
      success: results.size, 
      failed: errors.length 
    });

    if (errors.length > 0) {
      this.logger.warn('部分包装器创建失败', { 
        errors: errors.map(e => ({ name: e.name, error: e.error.message })) 
      });
    }

    return results;
  }

  /**
   * 执行健康检查
   */
  public async healthCheckAll(): Promise<Map<string, HealthStatus>> {
    const results = new Map<string, HealthStatus>();

    for (const [name, wrapper] of this.wrappers.entries()) {
      try {
        const status = await wrapper.healthCheck();
        results.set(name, status);
      } catch (error) {
        results.set(name, {
          status: 'unhealthy',
          message: (error as Error).message,
          lastChecked: new Date()
        });
      }
    }

    return results;
  }

  /**
   * 获取所有包装器的统计信息
   */
  public async getAllStatistics(): Promise<Map<string, WrapperStatistics>> {
    const results = new Map<string, WrapperStatistics>();

    for (const [name, wrapper] of this.wrappers.entries()) {
      try {
        const stats = await wrapper.getStatistics();
        results.set(name, stats);
      } catch (error) {
        this.logger.error('获取包装器统计信息失败', error as Error, { name });
      }
    }

    return results;
  }

  /**
   * 重置所有包装器的统计信息
   */
  public async resetAllStatistics(): Promise<void> {
    this.logger.info('重置所有包装器统计信息');

    for (const [name, wrapper] of this.wrappers.entries()) {
      try {
        await wrapper.resetStatistics();
      } catch (error) {
        this.logger.error('重置包装器统计信息失败', error as Error, { name });
      }
    }

    this.logger.info('所有包装器统计信息重置完成');
  }

  /**
   * 关闭所有包装器
   */
  public async closeAll(): Promise<void> {
    this.logger.info('关闭所有包装器');

    for (const [name, wrapper] of this.wrappers.entries()) {
      try {
        await wrapper.close();
      } catch (error) {
        this.logger.error('关闭包装器失败', error as Error, { name });
      }
    }

    this.wrappers.clear();
    this.logger.info('所有包装器已关闭');
  }

  /**
   * 获取管理器统计信息
   */
  public async getManagerStatistics(): Promise<ManagerStatistics> {
    const healthStatuses = await this.healthCheckAll();
    const allStatistics = await this.getAllStatistics();

    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;

    for (const stats of allStatistics.values()) {
      totalRequests += stats.totalRequests;
      successfulRequests += stats.successfulRequests;
      failedRequests += stats.failedRequests;
      totalResponseTime += stats.totalResponseTime;
    }

    const healthyWrappers = Array.from(healthStatuses.values())
      .filter(status => status.status === 'healthy').length;
    
    const degradedWrappers = Array.from(healthStatuses.values())
      .filter(status => status.status === 'degraded').length;
    
    const unhealthyWrappers = Array.from(healthStatuses.values())
      .filter(status => status.status === 'unhealthy').length;

    return {
      totalWrappers: this.wrappers.size,
      activeWrappers: this.wrappers.size, // 假设所有包装器都是活跃的
      healthyWrappers,
      degradedWrappers,
      unhealthyWrappers,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      uptime: Date.now(), // 这里应该记录工厂启动时间
      lastHealthCheck: new Date()
    };
  }

  /**
   * 获取可用的包装器类型
   */
  public getAvailableTypes(): string[] {
    return Array.from(this.wrapperTypes.keys());
  }

  /**
   * 检查包装器类型是否支持
   */
  public isTypeSupported(type: string): boolean {
    return this.wrapperTypes.has(type);
  }

  private registerDefaultWrapperTypes(): void {
    // 注册轮询池包装器类型
    this.wrapperTypes.set('pool', async (config: WrapperConfiguration) => {
      const poolName = config.customSettings?.poolName as string;
      if (!poolName) {
        throw new WrapperConfigurationException('轮询池包装器必须指定poolName');
      }

      return PoolWrapper.create(
        config.name,
        poolName,
        this.poolService,
        config
      );
    });

    // 注册任务组包装器类型
    this.wrapperTypes.set('task_group', async (config: WrapperConfiguration) => {
      const groupName = config.customSettings?.groupName as string;
      if (!groupName) {
        throw new WrapperConfigurationException('任务组包装器必须指定groupName');
      }

      const echelon = config.customSettings?.echelon as string;

      return TaskGroupWrapper.create(
        config.name,
        groupName,
        this.taskGroupService,
        config,
        echelon
      );
    });

    // 注册直接包装器类型
    this.wrapperTypes.set('direct', async (config: WrapperConfiguration) => {
      // 这里应该实现直接包装器
      // 暂时抛出未实现异常
      throw new UnsupportedWrapperTypeException('direct');
    });
  }

  private validateWrapperConfig(config: WrapperConfiguration): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new WrapperConfigurationException('包装器名称不能为空');
    }

    if (!config.type || !this.wrapperTypes.has(config.type)) {
      throw new WrapperConfigurationException(`不支持的包装器类型: ${config.type}`);
    }

    if (config.timeout <= 0) {
      throw new WrapperConfigurationException('超时时间必须大于0');
    }

    if (config.maxRetries < 0) {
      throw new WrapperConfigurationException('最大重试次数不能为负数');
    }

    if (config.retryDelay < 0) {
      throw new WrapperConfigurationException('重试延迟不能为负数');
    }

    if (config.metricsInterval <= 0) {
      throw new WrapperConfigurationException('指标间隔必须大于0');
    }
  }
}

/**
 * 包装器类型工厂函数类型
 */
type WrapperTypeFactory = (config: WrapperConfiguration) => Promise<ILLMWrapper>;