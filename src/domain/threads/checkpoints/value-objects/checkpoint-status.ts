import { ValueObject } from '../../../common/value-objects';
import { ValidationError } from '../../../../common/exceptions';
/**
 * 检查点状态枚举值
 */
export type CheckpointStatusValue = 'active' | 'expired' | 'corrupted' | 'archived';

/**
 * 检查点状态值对象
 *
 * 表示检查点的当前状态
 */
export class CheckpointStatus extends ValueObject<CheckpointStatusValue> {
  /**
   * 构造函数
   * @param value 状态值
   */
  private constructor(value: CheckpointStatusValue) {
    super(value);
  }

  /**
   * 创建活跃状态
   */
  public static active(): CheckpointStatus {
    return new CheckpointStatus('active');
  }

  /**
   * 创建过期状态
   */
  public static expired(): CheckpointStatus {
    return new CheckpointStatus('expired');
  }

  /**
   * 创建损坏状态
   */
  public static corrupted(): CheckpointStatus {
    return new CheckpointStatus('corrupted');
  }

  /**
   * 创建归档状态
   */
  public static archived(): CheckpointStatus {
    return new CheckpointStatus('archived');
  }

  /**
   * 从值创建状态
   */
  public static fromValue(value: CheckpointStatusValue): CheckpointStatus {
    switch (value) {
      case 'active':
      case 'expired':
      case 'corrupted':
      case 'archived':
        return new CheckpointStatus(value);
      default:
        throw new ValidationError(`无效的检查点状态: ${value}`);
    }
  }

  /**
   * 从字符串创建状态
   */
  public static fromString(value: string): CheckpointStatus {
    return this.fromValue(value as CheckpointStatusValue);
  }

  /**
   * 获取状态值
   */
  public get statusValue(): CheckpointStatusValue {
    return this.props;
  }

  /**
   * 检查是否为活跃状态
   */
  public isActive(): boolean {
    return this.props === 'active';
  }

  /**
   * 检查是否为过期状态
   */
  public isExpired(): boolean {
    return this.props === 'expired';
  }

  /**
   * 检查是否为损坏状态
   */
  public isCorrupted(): boolean {
    return this.props === 'corrupted';
  }

  /**
   * 检查是否为归档状态
   */
  public isArchived(): boolean {
    return this.props === 'archived';
  }

  /**
   * 检查是否为终端状态（无法恢复）
   */
  public isTerminal(): boolean {
    return this.props === 'corrupted' || this.props === 'archived';
  }

  /**
   * 检查是否可以恢复
   */
  public canRestore(): boolean {
    return this.props === 'active';
  }

  /**
   * 获取状态描述
   */
  public getDescription(): string {
    switch (this.props) {
      case 'active':
        return '活跃';
      case 'expired':
        return '已过期';
      case 'corrupted':
        return '已损坏';
      case 'archived':
        return '已归档';
      default:
        return '未知状态';
    }
  }

  /**
   * 转换为字符串
   */
  public override toString(): string {
    return this.props;
  }

  /**
   * 转换为JSON
   */
  public toJSON(): CheckpointStatusValue {
    return this.props;
  }

  /**
   * 验证值对象
   */
  public validate(): void {
    if (!this.props) {
      throw new ValidationError('检查点状态不能为空');
    }

    const validValues: CheckpointStatusValue[] = ['active', 'expired', 'corrupted', 'archived'];
    if (!validValues.includes(this.props)) {
      throw new ValidationError(`无效的检查点状态: ${this.props}`);
    }
  }

  /**
   * 相等性比较
   */
  public override equals(other: CheckpointStatus): boolean {
    return other instanceof CheckpointStatus && this.props === other.props;
  }
}
