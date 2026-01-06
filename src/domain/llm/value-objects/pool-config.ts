import { ValueObject } from '../../common/value-objects';
import { RotationStrategy } from './rotation-strategy';

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  interval: number;
  timeout?: number;
  maxFailures?: number;
}

/**
 * 轮询池配置值对象
 * 
 * 封装轮询池的配置信息，提供类型安全的配置管理
 */
export class PoolConfig extends ValueObject<{
  name: string;
  rotationStrategy: RotationStrategy;
  healthCheck: HealthCheckConfig;
  taskGroups: string[];
}> {
  private constructor(
    public readonly name: string,
    public readonly rotationStrategy: RotationStrategy,
    public readonly healthCheck: HealthCheckConfig,
    public readonly taskGroups: string[]
  ) {
    super({ name, rotationStrategy, healthCheck, taskGroups });
  }

  /**
   * 创建轮询池配置
   */
  static create(params: {
    name: string;
    rotationStrategy?: RotationStrategy;
    healthCheck?: Partial<HealthCheckConfig>;
    taskGroups?: string[];
  }): PoolConfig {
    return new PoolConfig(
      params.name,
      params.rotationStrategy ?? RotationStrategy.ROUND_ROBIN,
      {
        interval: params.healthCheck?.interval ?? 30,
        timeout: params.healthCheck?.timeout ?? 10,
        maxFailures: params.healthCheck?.maxFailures ?? 3,
      },
      params.taskGroups ?? []
    );
  }

  /**
   * 验证配置
   */
  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('轮询池名称不能为空');
    }
    if (this.healthCheck.interval <= 0) {
      throw new Error('健康检查间隔必须大于0');
    }
    if (this.taskGroups.length === 0) {
      throw new Error('轮询池至少需要一个任务组');
    }
  }

  /**
   * 转换为JSON
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      rotationStrategy: this.rotationStrategy,
      healthCheck: this.healthCheck,
      taskGroups: this.taskGroups,
    };
  }
}