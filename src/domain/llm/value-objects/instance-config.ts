import { ValueObject } from '../../common/value-objects';

/**
 * LLM实例配置值对象
 * 
 * 封装LLM实例的配置信息，提供类型安全的配置管理
 */
export class InstanceConfig extends ValueObject<{
  instanceId: string;
  modelName: string;
  groupName: string;
  echelon: string;
  maxConcurrency: number;
  weight: number;
}> {
  private constructor(
    public readonly instanceId: string,
    public readonly modelName: string,
    public readonly groupName: string,
    public readonly echelon: string,
    public readonly maxConcurrency: number,
    public readonly weight: number
  ) {
    super({ instanceId, modelName, groupName, echelon, maxConcurrency, weight });
  }

  /**
   * 创建实例配置
   */
  static create(params: {
    instanceId: string;
    modelName: string;
    groupName: string;
    echelon: string;
    maxConcurrency?: number;
    weight?: number;
  }): InstanceConfig {
    return new InstanceConfig(
      params.instanceId,
      params.modelName,
      params.groupName,
      params.echelon,
      params.maxConcurrency ?? 10,
      params.weight ?? 1.0
    );
  }

  /**
   * 验证配置
   */
  validate(): void {
    if (!this.instanceId || this.instanceId.trim().length === 0) {
      throw new Error('实例ID不能为空');
    }
    if (!this.modelName || this.modelName.trim().length === 0) {
      throw new Error('模型名称不能为空');
    }
    if (!this.groupName || this.groupName.trim().length === 0) {
      throw new Error('组名称不能为空');
    }
    if (this.maxConcurrency <= 0) {
      throw new Error('最大并发数必须大于0');
    }
    if (this.weight <= 0) {
      throw new Error('权重必须大于0');
    }
  }

  /**
   * 获取完整引用
   */
  getFullReference(): string {
    return `${this.groupName}.${this.echelon}.${this.modelName}`;
  }

  /**
   * 转换为JSON
   */
  toJSON(): Record<string, any> {
    return {
      instanceId: this.instanceId,
      modelName: this.modelName,
      groupName: this.groupName,
      echelon: this.echelon,
      maxConcurrency: this.maxConcurrency,
      weight: this.weight,
      fullReference: this.getFullReference(),
    };
  }
}