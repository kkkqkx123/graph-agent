import { ValueObject } from '../../common/value-objects';

// 轮询策略枚举
export enum RotationStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_RECENTLY_USED = 'least_recently_used',
  WEIGHTED = 'weighted',
}

/**
 * 轮询策略值对象
 */
export class RotationStrategyVO extends ValueObject<{
  strategy: RotationStrategy;
  config: Record<string, any>;
}> {
  constructor(
    public readonly strategy: RotationStrategy,
    public readonly config: Record<string, any>
  ) {
    super({ strategy, config });
  }

  validate(): void {
    // 验证逻辑
  }

  /**
   * 检查策略是否有效
   */
  isValid(): boolean {
    return Object.values(RotationStrategy).includes(this.strategy);
  }

  /**
   * 获取策略描述
   */
  getDescription(): string {
    switch (this.strategy) {
      case RotationStrategy.ROUND_ROBIN:
        return '轮询策略 - 按顺序选择实例';
      case RotationStrategy.LEAST_RECENTLY_USED:
        return '最少使用策略 - 选择最少使用的实例';
      case RotationStrategy.WEIGHTED:
        return '加权策略 - 根据权重选择实例';
      default:
        return '未知策略';
    }
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): Record<string, any> {
    switch (this.strategy) {
      case RotationStrategy.ROUND_ROBIN:
        return { currentIndex: 0 };
      case RotationStrategy.LEAST_RECENTLY_USED:
        return {};
      case RotationStrategy.WEIGHTED:
        return {
          baseWeight: 1.0,
          performanceWeight: 1.0,
          reliabilityWeight: 1.0,
          loadWeight: 1.0,
        };
      default:
        return {};
    }
  }

  /**
   * 合并配置
   */
  mergeConfig(userConfig: Record<string, any>): Record<string, any> {
    const defaultConfig = this.getDefaultConfig();
    return { ...defaultConfig, ...userConfig };
  }

  /**
   * 比较两个策略
   */
  override equals(other: RotationStrategyVO): boolean {
    return this.strategy === other.strategy;
  }

  /**
   * 转换为JSON
   */
  toJSON(): Record<string, any> {
    return {
      strategy: this.strategy,
      description: this.getDescription(),
      valid: this.isValid(),
      config: this.config,
      defaultConfig: this.getDefaultConfig(),
    };
  }
}

/**
 * 轮询策略工厂
 */
export class RotationStrategyFactory {
  /**
   * 创建轮询策略
   */
  static create(strategy: RotationStrategy, config?: Record<string, any>): RotationStrategyVO {
    const defaultConfig = this.getDefaultConfig(strategy);
    const mergedConfig = { ...defaultConfig, ...(config || {}) };

    return new RotationStrategyVO(strategy, mergedConfig);
  }

  /**
   * 从字符串创建轮询策略
   */
  static fromString(strategyString: string, config?: Record<string, any>): RotationStrategyVO {
    const strategy = Object.values(RotationStrategy).find(
      s => s === strategyString
    ) as RotationStrategy;

    if (!strategy) {
      throw new Error(`不支持的轮询策略: ${strategyString}`);
    }

    return this.create(strategy, config);
  }

  /**
   * 获取默认配置
   */
  private static getDefaultConfig(strategy: RotationStrategy): Record<string, any> {
    switch (strategy) {
      case RotationStrategy.ROUND_ROBIN:
        return { currentIndex: 0 };
      case RotationStrategy.LEAST_RECENTLY_USED:
        return {};
      case RotationStrategy.WEIGHTED:
        return {
          baseWeight: 1.0,
          performanceWeight: 1.0,
          reliabilityWeight: 1.0,
          loadWeight: 1.0,
        };
      default:
        return {};
    }
  }

  /**
   * 验证配置
   */
  static validateConfig(strategy: RotationStrategy, config: Record<string, any>): boolean {
    switch (strategy) {
      case RotationStrategy.ROUND_ROBIN:
        return typeof config['currentIndex'] === 'number';
      case RotationStrategy.LEAST_RECENTLY_USED:
        return true; // 无特殊配置要求
      case RotationStrategy.WEIGHTED:
        return (
          typeof config['baseWeight'] === 'number' &&
          typeof config['performanceWeight'] === 'number' &&
          typeof config['reliabilityWeight'] === 'number' &&
          typeof config['loadWeight'] === 'number'
        );
      default:
        return false;
    }
  }
}
