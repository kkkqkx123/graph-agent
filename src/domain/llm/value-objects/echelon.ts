import { ValueObject } from '../../common/value-objects/value-object';

/**
 * 层级值对象
 */
export class Echelon extends ValueObject<{
  name: string;
  priority: number;
  models: string[];
  config: Record<string, any>;
}> {
  constructor(
    public readonly name: string,
    public readonly priority: number,
    public readonly models: string[],
    public readonly config: Record<string, any>
  ) {
    super({ name, priority, models, config });
  }

  validate(): void {
    // 验证逻辑
  }

  /**
   * 检查层级是否可用
   */
  isAvailable(): boolean {
    return this.models.length > 0;
  }

  /**
   * 获取模型数量
   */
  getModelCount(): number {
    return this.models.length;
  }

  /**
   * 获取层级权重
   */
  getWeight(): number {
    // 优先级越高（数字越小），权重越大
    const priorityWeight = Math.max(0, 100 - this.priority * 10);
    
    // 模型数量权重
    const modelWeight = Math.min(50, this.models.length * 5);
    
    return priorityWeight + modelWeight;
  }

  /**
   * 比较两个层级
   */
  override equals(other: Echelon): boolean {
    return this.name === other.name;
  }

  /**
   * 比较优先级
   */
  comparePriority(other: Echelon): number {
    return this.priority - other.priority;
  }

  /**
   * 转换为JSON
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      priority: this.priority,
      models: this.models,
      modelCount: this.getModelCount(),
      available: this.isAvailable(),
      weight: this.getWeight(),
      config: this.config
    };
  }
}

/**
 * 层级配置值对象
 */
export class EchelonConfig extends ValueObject<{
  groupName: string;
  echelonName: string;
  models: string[];
  priority: number;
  fallbackStrategy: string;
  maxAttempts: number;
  retryDelay: number;
}> {
  constructor(
    public readonly groupName: string,
    public readonly echelonName: string,
    public readonly models: string[],
    public readonly priority: number,
    public readonly fallbackStrategy: string,
    public readonly maxAttempts: number,
    public readonly retryDelay: number
  ) {
    super({ groupName, echelonName, models, priority, fallbackStrategy, maxAttempts, retryDelay });
  }

  validate(): void {
    // 验证逻辑
  }

  /**
   * 检查配置是否有效
   */
  isValid(): boolean {
    return (
      this.groupName.length > 0 &&
      this.echelonName.length > 0 &&
      this.models.length > 0 &&
      this.priority >= 0 &&
      this.maxAttempts > 0 &&
      this.retryDelay >= 0
    );
  }

  /**
   * 获取完整的层级引用
   */
  getFullReference(): string {
    return `${this.groupName}.${this.echelonName}`;
  }

  /**
   * 比较两个配置
   */
  override equals(other: EchelonConfig): boolean {
    return (
      this.groupName === other.groupName &&
      this.echelonName === other.echelonName
    );
  }

  /**
   * 转换为JSON
   */
  toJSON(): Record<string, any> {
    return {
      groupName: this.groupName,
      echelonName: this.echelonName,
      fullReference: this.getFullReference(),
      models: this.models,
      priority: this.priority,
      fallbackStrategy: this.fallbackStrategy,
      maxAttempts: this.maxAttempts,
      retryDelay: this.retryDelay,
      valid: this.isValid()
    };
  }
}