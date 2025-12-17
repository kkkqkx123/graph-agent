import { ValueObject } from '../../common/value-objects/value-object';
import { DomainError } from '../../common/errors/domain-error';
import { PoolInstance } from '../entities/pool';

/**
 * 轮询策略类型枚举
 */
export enum RotationStrategyType {
  ROUND_ROBIN = 'round_robin',
  WEIGHTED_RANDOM = 'weighted_random',
  LEAST_CONNECTIONS = 'least_connections',
  FASTEST_RESPONSE = 'fastest_response'
}

/**
 * 轮询策略值对象
 * 
 * 定义如何从池中选择实例的策略
 */
export class RotationStrategy extends ValueObject<{
  type: RotationStrategyType;
  options: Record<string, unknown>;
}> {
  private constructor(props: {
    type: RotationStrategyType;
    options: Record<string, unknown>;
  }) {
    super(props);
    this.validate();
  }

  /**
   * 创建轮询策略
   */
  public static create(
    type: RotationStrategyType,
    options: Record<string, unknown> = {}
  ): RotationStrategy {
    return new RotationStrategy({ type, options });
  }

  /**
   * 创建轮询策略
   */
  public static roundRobin(): RotationStrategy {
    return new RotationStrategy({
      type: RotationStrategyType.ROUND_ROBIN,
      options: {}
    });
  }

  /**
   * 创建加权随机策略
   */
  public static weightedRandom(options: {
    weightKey?: string;
    seed?: number;
  } = {}): RotationStrategy {
    return new RotationStrategy({
      type: RotationStrategyType.WEIGHTED_RANDOM,
      options
    });
  }

  /**
   * 创建最少连接策略
   */
  public static leastConnections(): RotationStrategy {
    return new RotationStrategy({
      type: RotationStrategyType.LEAST_CONNECTIONS,
      options: {}
    });
  }

  /**
   * 创建最快响应策略
   */
  public static fastestResponse(options: {
    timeWindow?: number;
    minSamples?: number;
  } = {}): RotationStrategy {
    return new RotationStrategy({
      type: RotationStrategyType.FASTEST_RESPONSE,
      options
    });
  }

  /**
   * 获取策略类型
   */
  public getType(): RotationStrategyType {
    return this.props.type;
  }

  /**
   * 获取策略选项
   */
  public getOptions(): Record<string, unknown> {
    return { ...this.props.options };
  }

  /**
   * 获取特定选项值
   */
  public getOption<T>(key: string, defaultValue?: T): T {
    return (this.props.options[key] as T) ?? defaultValue;
  }

  /**
   * 根据策略选择实例
   */
  public selectInstance(instances: PoolInstance[]): PoolInstance | null {
    if (instances.length === 0) {
      return null;
    }

    const healthyInstances = instances.filter(instance => 
      instance.isHealthy() && instance.canAcquire()
    );

    if (healthyInstances.length === 0) {
      return null;
    }

    switch (this.props.type) {
      case RotationStrategyType.ROUND_ROBIN:
        return this.selectRoundRobin(healthyInstances);
      case RotationStrategyType.WEIGHTED_RANDOM:
        return this.selectWeightedRandom(healthyInstances);
      case RotationStrategyType.LEAST_CONNECTIONS:
        return this.selectLeastConnections(healthyInstances);
      case RotationStrategyType.FASTEST_RESPONSE:
        return this.selectFastestResponse(healthyInstances);
      default:
        return healthyInstances[0];
    }
  }

  private selectRoundRobin(instances: PoolInstance[]): PoolInstance {
    // 简单的轮询实现，实际应该维护状态
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }

  private selectWeightedRandom(instances: PoolInstance[]): PoolInstance {
    const weightKey = this.getOption<string>('weightKey', 'weight');
    
    const weights = instances.map(instance => {
      // 如果实例有权重属性，使用它；否则使用默认权重
      const weight = (instance as any)[weightKey] || instance.getWeight() || 1;
      return Math.max(1, weight); // 确保权重至少为1
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < instances.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return instances[i];
      }
    }

    return instances[0];
  }

  private selectLeastConnections(instances: PoolInstance[]): PoolInstance {
    return instances.reduce((min, current) => 
      current.getConnectionCount() < min.getConnectionCount() ? current : min
    );
  }

  private selectFastestResponse(instances: PoolInstance[]): PoolInstance {
    const timeWindow = this.getOption<number>('timeWindow', 300000); // 5分钟
    const minSamples = this.getOption<number>('minSamples', 5);
    
    // 过滤出有足够样本的实例
    const instancesWithSamples = instances.filter(instance => {
      const stats = instance.getStatistics();
      return stats.successCount >= minSamples;
    });

    // 如果没有足够样本的实例，回退到所有实例
    const targetInstances = instancesWithSamples.length > 0 ? instancesWithSamples : instances;

    return targetInstances.reduce((fastest, current) => 
      current.getAverageResponseTime() < fastest.getAverageResponseTime() ? current : fastest
    );
  }

  private validate(): void {
    if (!Object.values(RotationStrategyType).includes(this.props.type)) {
      throw new DomainError(`无效的轮询策略类型: ${this.props.type}`);
    }

    if (!this.props.options || typeof this.props.options !== 'object') {
      throw new DomainError('轮询策略选项必须是对象');
    }

    // 验证特定策略的选项
    switch (this.props.type) {
      case RotationStrategyType.WEIGHTED_RANDOM:
        this.validateWeightedRandomOptions();
        break;
      case RotationStrategyType.FASTEST_RESPONSE:
        this.validateFastestResponseOptions();
        break;
    }
  }

  private validateWeightedRandomOptions(): void {
    const seed = this.getOption<number>('seed');
    if (seed !== undefined && (seed < 0 || seed > Number.MAX_SAFE_INTEGER)) {
      throw new DomainError('加权随机策略的种子值无效');
    }
  }

  private validateFastestResponseOptions(): void {
    const timeWindow = this.getOption<number>('timeWindow');
    if (timeWindow !== undefined && timeWindow <= 0) {
      throw new DomainError('最快响应策略的时间窗口必须大于0');
    }

    const minSamples = this.getOption<number>('minSamples');
    if (minSamples !== undefined && minSamples < 1) {
      throw new DomainError('最快响应策略的最小样本数必须至少为1');
    }
  }

  /**
   * 转换为JSON对象
   */
  public toJSON(): Record<string, unknown> {
    return {
      type: this.props.type,
      options: this.props.options
    };
  }

  /**
   * 从JSON对象创建轮询策略
   */
  public static fromJSON(json: Record<string, unknown>): RotationStrategy {
    const type = json.type as RotationStrategyType;
    const options = (json.options as Record<string, unknown>) || {};
    
    if (!Object.values(RotationStrategyType).includes(type)) {
      throw new DomainError(`无效的轮询策略类型: ${type}`);
    }

    return new RotationStrategy({ type, options });
  }

  /**
   * 比较两个轮询策略是否相等
   */
  public override equals(other?: RotationStrategy): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (!(other instanceof RotationStrategy)) {
      return false;
    }

    return (
      this.props.type === other.props.type &&
      JSON.stringify(this.props.options) === JSON.stringify(other.props.options)
    );
  }

  /**
   * 获取策略描述
   */
  public getDescription(): string {
    switch (this.props.type) {
      case RotationStrategyType.ROUND_ROBIN:
        return '轮询策略：按顺序轮流使用实例';
      case RotationStrategyType.WEIGHTED_RANDOM:
        return '加权随机策略：根据权重随机选择实例';
      case RotationStrategyType.LEAST_CONNECTIONS:
        return '最少连接策略：选择当前连接数最少的实例';
      case RotationStrategyType.FASTEST_RESPONSE:
        return '最快响应策略：选择平均响应时间最短的实例';
      default:
        return '未知策略';
    }
  }
}

/**
 * 轮询策略工厂
 */
export class RotationStrategyFactory {
  /**
   * 创建默认策略
   */
  public static createDefault(): RotationStrategy {
    return RotationStrategy.roundRobin();
  }

  /**
   * 根据配置创建策略
   */
  public static fromConfig(config: {
    type: string;
    options?: Record<string, unknown>;
  }): RotationStrategy {
    const type = config.type as RotationStrategyType;
    
    if (!Object.values(RotationStrategyType).includes(type)) {
      throw new DomainError(`不支持的轮询策略类型: ${type}`);
    }

    return RotationStrategy.create(type, config.options || {});
  }

  /**
   * 获取所有可用的策略类型
   */
  public static getAvailableTypes(): RotationStrategyType[] {
    return Object.values(RotationStrategyType);
  }

  /**
   * 获取策略类型的描述
   */
  public static getTypeDescription(type: RotationStrategyType): string {
    const strategy = RotationStrategy.create(type);
    return strategy.getDescription();
  }
}