import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { InstanceStatus } from '../value-objects/pool-instance';
import { RotationStrategy } from '../value-objects/rotation-strategy';
import { LLMMessage } from '../value-objects/llm-message';
import { InstanceConfig } from '../value-objects/instance-config';
import { PoolConfig } from '../value-objects/pool-config';
import { ILLMClient } from '../interfaces/llm-client.interface';
import { ITaskGroupManager } from '../interfaces/task-group-manager.interface';
import { LLMRequest } from './llm-request';

/**
 * LLM实例实体
 */
export class LLMInstance extends Entity {
  constructor(
    id: ID,
    private readonly config: InstanceConfig,
    public readonly client: ILLMClient,
    public status: InstanceStatus = InstanceStatus.HEALTHY,
    public lastHealthCheck: Date = new Date(),
    public failureCount: number = 0,
    public successCount: number = 0,
    public avgResponseTime: number = 0.0,
    public currentLoad: number = 0,
    public lastUsed: Date | null = null
  ) {
    super(id, Timestamp.now(), Timestamp.now(), Version.initial());
  }

  /**
   * 获取实例ID
   */
  get instanceId(): string {
    return this.config.instanceId;
  }

  /**
   * 获取模型名称
   */
  get modelName(): string {
    return this.config.modelName;
  }

  /**
   * 获取组名称
   */
  get groupName(): string {
    return this.config.groupName;
  }

  /**
   * 获取层级
   */
  get echelon(): string {
    return this.config.echelon;
  }

  /**
   * 获取最大并发数
   */
  get maxConcurrency(): number {
    return this.config.maxConcurrency;
  }

  /**
   * 获取权重
   */
  get weight(): number {
    return this.config.weight;
  }

  /**
   * 验证实例有效性
   */
  validate(): void {
    this.config.validate();
  }

  /**
   * 检查实例是否可用
   */
  isAvailable(): boolean {
    return this.status === InstanceStatus.HEALTHY || this.status === InstanceStatus.DEGRADED;
  }

  /**
   * 检查实例是否能接受新请求
   */
  canAcceptRequest(): boolean {
    return this.isAvailable() && this.currentLoad < this.maxConcurrency;
  }

  /**
   * 更新性能指标
   */
  updatePerformance(responseTime: number, success: boolean): void {
    if (success) {
      this.successCount += 1;
      const totalRequests = this.successCount + this.failureCount;
      if (totalRequests === 1) {
        this.avgResponseTime = responseTime;
      } else {
        this.avgResponseTime =
          (this.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
      }
    } else {
      this.failureCount += 1;
    }

    this.lastUsed = new Date();
  }

  /**
   * 增加负载
   */
  increaseLoad(): void {
    this.currentLoad += 1;
  }

  /**
   * 减少负载
   */
  decreaseLoad(): void {
    if (this.currentLoad > 0) {
      this.currentLoad -= 1;
    }
  }

  /**
   * 更新健康状态
   */
  updateHealthStatus(isHealthy: boolean): void {
    if (isHealthy) {
      if (this.status === InstanceStatus.FAILED) {
        this.status = InstanceStatus.RECOVERING;
      } else if (this.status === InstanceStatus.RECOVERING) {
        this.status = InstanceStatus.HEALTHY;
      }
      this.failureCount = 0;
    } else {
      this.failureCount += 1;
      if (this.failureCount >= 3) {
        this.status = InstanceStatus.FAILED;
      } else if (this.status === InstanceStatus.HEALTHY) {
        this.status = InstanceStatus.DEGRADED;
      }
    }
    this.lastHealthCheck = new Date();
  }
}

/**
 * 轮询池实体
 */
export class PollingPool extends Entity {
  private instances: LLMInstance[] = [];
  private scheduler: any;
  private healthChecker: any;
  private concurrencyManager: any;

  constructor(
    id: ID,
    private readonly poolConfig: PoolConfig,
    private readonly taskGroupManager: ITaskGroupManager,
    private readonly clientProvider: (modelName: string) => ILLMClient
  ) {
    super(id, Timestamp.now(), Timestamp.now(), Version.initial());
  }

  /**
   * 获取轮询池名称
   */
  get name(): string {
    return this.poolConfig.name;
  }

  /**
   * 获取轮询池配置
   */
  get config(): PoolConfig {
    return this.poolConfig;
  }

  /**
   * 验证轮询池有效性
   */
  validate(): void {
    this.poolConfig.validate();
  }

  /**
   * 初始化轮询池
   */
  async initialize(): Promise<void> {
    // 从任务组配置创建实例
    const taskGroups = this.config['taskGroups'] || [];

    for (const taskGroupRef of taskGroups) {
      await this.createInstancesFromTaskGroup(taskGroupRef);
    }

    // 创建调度器
    this.scheduler = this.createScheduler();

    // 创建健康检查器
    this.healthChecker = this.createHealthChecker();

    // 创建并发管理器
    this.concurrencyManager = this.createConcurrencyManager();

    // 启动健康检查
    await this.healthChecker.start(this.instances);
  }

  /**
   * 从任务组创建实例
   */
  private async createInstancesFromTaskGroup(taskGroupRef: string): Promise<void> {
    try {
      const models = await this.taskGroupManager.getModelsForGroup(taskGroupRef);

      for (const modelName of models) {
        // 根据模型名称创建实际的LLM客户端
        const client = this.clientProvider(modelName);

        // 解析任务组引用
        const parts = taskGroupRef.split('.');
        const groupName = parts[0] ?? '';
        const echelon = parts[1] ?? 'default';

        // 创建实例配置
        const instanceConfig = InstanceConfig.create({
          instanceId: `${taskGroupRef}_${modelName}`,
          modelName,
          groupName,
          echelon,
        });

        const instance = new LLMInstance(
          ID.generate(),
          instanceConfig,
          client
        );
        this.instances.push(instance);
      }
    } catch (error) {
      console.error(`从任务组 ${taskGroupRef} 创建实例失败:`, error);
    }
  }

  /**
   * 创建调度器
   */
  private createScheduler(): any {
    const strategy = this.poolConfig.rotationStrategy;
    let currentIndex = 0;

    return {
      selectInstance: (instances: LLMInstance[]) => {
        const availableInstances = instances.filter(inst => inst.canAcceptRequest());

        if (availableInstances.length === 0) {
          return null;
        }

        switch (strategy) {
          case RotationStrategy.ROUND_ROBIN:
            const instance = availableInstances[currentIndex % availableInstances.length];
            currentIndex = (currentIndex + 1) % availableInstances.length;
            return instance;

          case RotationStrategy.LEAST_RECENTLY_USED:
            return availableInstances.reduce((leastUsed, current) => {
              if (!leastUsed?.lastUsed || !current.lastUsed) return current;
              return current.lastUsed < leastUsed.lastUsed ? current : leastUsed;
            }, availableInstances[0]);

          case RotationStrategy.WEIGHTED:
            const totalWeight = availableInstances.reduce((sum, inst) => sum + inst.weight, 0);
            const randomValue = Math.random() * totalWeight;
            let weightSum = 0;

            for (const instance of availableInstances) {
              weightSum += instance.weight;
              if (randomValue <= weightSum) {
                return instance;
              }
            }
            return availableInstances[0];

          default:
            return availableInstances[0];
        }
      },
    };
  }

  /**
   * 创建健康检查器
   */
  private createHealthChecker(): any {
    const interval = this.poolConfig.healthCheck.interval;
    let healthCheckInterval: NodeJS.Timeout | null = null;

    return {
      start: async (instances: LLMInstance[]) => {
        console.log(`启动健康检查，间隔: ${interval}秒`);

        // 立即执行一次健康检查
        await this.performHealthCheck(instances);

        // 设置定期健康检查
        healthCheckInterval = setInterval(async () => {
          await this.performHealthCheck(instances);
        }, interval * 1000);
      },
      stop: () => {
        if (healthCheckInterval) {
          clearInterval(healthCheckInterval);
          healthCheckInterval = null;
        }
        console.log('停止健康检查');
      },
    };
  }

  /**
   * 创建并发管理器
   */
  private createConcurrencyManager(): any {
    return {
      getStatus: () => ({
        enabled: false,
        currentLoad: this.instances.reduce((sum, inst) => sum + inst.currentLoad, 0),
        maxLoad: this.instances.reduce((sum, inst) => sum + inst.maxConcurrency, 0),
      }),
    };
  }

  /**
   * 获取可用实例
   */
  async getInstance(): Promise<LLMInstance | null> {
    const selectedInstance = this.scheduler.selectInstance(this.instances);

    if (selectedInstance) {
      selectedInstance.increaseLoad();
    }

    return selectedInstance;
  }

  /**
   * 释放实例
   */
  async releaseInstance(instance: LLMInstance): Promise<void> {
    instance.decreaseLoad();
  }

  /**
   * 调用LLM
   */
  async callLLM(prompt: string, kwargs?: Record<string, any>): Promise<any> {
    const instance = await this.getInstance();

    if (!instance) {
      throw new Error('没有可用的LLM实例');
    }

    try {
      const startTime = Date.now();

      // TODO: 实现实际的LLM调用
      const result = await this.callInstance(instance, prompt, kwargs);

      const responseTime = Date.now() - startTime;
      instance.updatePerformance(responseTime, true);

      return result;
    } catch (error) {
      instance.updatePerformance(0, false);
      throw error;
    } finally {
      await this.releaseInstance(instance);
    }
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(instances: LLMInstance[]): Promise<void> {
    for (const instance of instances) {
      try {
        // 简单的ping检查
        const isHealthy = await this.checkInstanceHealth(instance);
        instance.updateHealthStatus(isHealthy);

        if (isHealthy) {
          console.log(`实例 ${instance.instanceId} 健康检查通过`);
        } else {
          console.warn(`实例 ${instance.instanceId} 健康检查失败`);
        }
      } catch (error) {
        console.error(`实例 ${instance.instanceId} 健康检查异常:`, error);
        instance.updateHealthStatus(false);
      }
    }
  }

  /**
   * 检查实例健康状态
   */
  private async checkInstanceHealth(instance: LLMInstance): Promise<boolean> {
    try {
      // 使用客户端的健康检查方法
      const healthStatus = await instance.client.healthCheck();
      return healthStatus.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  /**
   * 调用具体实例
   */
  private async callInstance(
    instance: LLMInstance,
    prompt: string,
    kwargs?: Record<string, any>
  ): Promise<any> {
    // 创建LLM请求
    const request = LLMRequest.create(instance.modelName, [LLMMessage.createUser(prompt)], {
      temperature: kwargs?.['temperature'] ?? 0.7,
      maxTokens: kwargs?.['maxTokens'] ?? 1000,
      topP: kwargs?.['topP'] ?? 1.0,
      frequencyPenalty: kwargs?.['frequencyPenalty'] ?? 0.0,
      presencePenalty: kwargs?.['presencePenalty'] ?? 0.0,
      stop: kwargs?.['stop'],
      tools: kwargs?.['tools'],
      toolChoice: kwargs?.['toolChoice'],
      stream: kwargs?.['stream'] ?? false,
      metadata: kwargs?.['metadata'] || {},
    });

    // 调用LLM客户端
    const response = await instance.client.generateResponse(request);

    // 返回响应内容
    return response.getContent();
  }

  /**
   * 获取轮询池状态
   */
  async getStatus(): Promise<Record<string, any>> {
    const healthyInstances = this.instances.filter(
      inst => inst.status === InstanceStatus.HEALTHY
    ).length;
    const degradedInstances = this.instances.filter(
      inst => inst.status === InstanceStatus.DEGRADED
    ).length;
    const failedInstances = this.instances.filter(
      inst => inst.status === InstanceStatus.FAILED
    ).length;

    return {
      name: this.name,
      totalInstances: this.instances.length,
      healthyInstances,
      degradedInstances,
      failedInstances,
      concurrencyStatus: this.concurrencyManager.getStatus(),
    };
  }

  /**
   * 关闭轮询池
   */
  async shutdown(): Promise<void> {
    this.healthChecker.stop();
    console.log(`轮询池 ${this.name} 已关闭`);
  }
}
