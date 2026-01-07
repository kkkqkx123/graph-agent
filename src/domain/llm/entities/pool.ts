import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { InstanceStatus } from '../value-objects/pool-instance';
import { InstanceConfig } from '../value-objects/instance-config';

/**
 * LLM实例实体
 * 
 * 纯领域实体，表示一个LLM实例的状态和配置
 */
export class LLMInstance extends Entity {
  constructor(
    id: ID,
    private readonly config: InstanceConfig,
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
 * 轮询策略枚举
 */
export enum RotationStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_RECENTLY_USED = 'least_recently_used',
  WEIGHTED = 'weighted',
}

/**
 * 轮询池配置
 */
export interface PollingPoolConfig {
  name: string;
  rotationStrategy: RotationStrategy;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  maxFailures: number;
}

/**
 * 轮询池实体
 * 
 * 纯领域实体，管理LLM实例集合和选择策略
 */
export class PollingPool extends Entity {
  private instances: LLMInstance[] = [];
  private currentIndex: number = 0;

  constructor(
    id: ID,
    private readonly config: PollingPoolConfig
  ) {
    super(id, Timestamp.now(), Timestamp.now(), Version.initial());
  }

  /**
   * 获取轮询池名称
   */
  get name(): string {
    return this.config.name;
  }

  /**
   * 获取轮询池配置
   */
  get poolConfig(): PollingPoolConfig {
    return this.config;
  }

  /**
   * 验证轮询池有效性
   */
  validate(): void {
    if (!this.config.name || this.config.name.trim().length === 0) {
      throw new Error('轮询池名称不能为空');
    }
    if (this.config.healthCheckInterval <= 0) {
      throw new Error('健康检查间隔必须大于0');
    }
  }

  /**
   * 添加实例
   */
  addInstance(instance: LLMInstance): void {
    this.instances.push(instance);
  }

  /**
   * 移除实例
   */
  removeInstance(instanceId: ID): void {
    this.instances = this.instances.filter(inst => !inst.id.equals(instanceId));
  }

  /**
   * 获取所有实例
   */
  getInstances(): LLMInstance[] {
    return [...this.instances];
  }

  /**
   * 根据ID获取实例
   */
  getInstanceById(instanceId: ID): LLMInstance | undefined {
    return this.instances.find(inst => inst.id.equals(instanceId));
  }

  /**
   * 选择可用实例
   */
  selectInstance(): LLMInstance | null {
    const availableInstances = this.instances.filter(inst => inst.canAcceptRequest());

    if (availableInstances.length === 0) {
      return null;
    }

    switch (this.config.rotationStrategy) {
      case RotationStrategy.ROUND_ROBIN:
        const instance = availableInstances[this.currentIndex % availableInstances.length];
        this.currentIndex = (this.currentIndex + 1) % availableInstances.length;
        return instance ?? null;

      case RotationStrategy.LEAST_RECENTLY_USED:
        return availableInstances.reduce((leastUsed, current) => {
          if (!leastUsed?.lastUsed || !current.lastUsed) return current;
          return current.lastUsed < leastUsed.lastUsed ? current : leastUsed;
        }, availableInstances[0]) ?? null;

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
        return availableInstances[0] ?? null;

      default:
        return availableInstances[0] ?? null;
    }
  }

  /**
   * 获取轮询池状态
   */
  getStatus(): Record<string, any> {
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
      currentLoad: this.instances.reduce((sum, inst) => sum + inst.currentLoad, 0),
      maxLoad: this.instances.reduce((sum, inst) => sum + inst.maxConcurrency, 0),
    };
  }

  /**
   * 获取健康检查配置
   */
  getHealthCheckConfig(): {
    interval: number;
    timeout: number;
    maxFailures: number;
  } {
    return {
      interval: this.config.healthCheckInterval,
      timeout: this.config.healthCheckTimeout,
      maxFailures: this.config.maxFailures,
    };
  }
}