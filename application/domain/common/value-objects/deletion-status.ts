import { ValueObject } from '.';
import { ValidationError } from '../exceptions';

/**
 * 删除状态值对象接口
 */
export interface DeletionStatusProps {
  isDeleted: boolean;
}

/**
 * 删除状态值对象
 *
 * 用于封装实体的删除状态
 * 职责：
 * - 删除状态的封装和访问
 * - 删除状态的验证
 * - 删除状态的不可变操作
 */
export class DeletionStatus extends ValueObject<DeletionStatusProps> {
  private constructor(props: DeletionStatusProps) {
    super(props);
    this.validate();
  }

  /**
   * 创建活跃状态（未删除）
   * @returns 活跃状态实例
   */
  public static active(): DeletionStatus {
    const status = new DeletionStatus({ isDeleted: false });
    return status;
  }

  /**
   * 创建已删除状态
   * @returns 已删除状态实例
   */
  public static deleted(): DeletionStatus {
    const status = new DeletionStatus({ isDeleted: true });
    return status;
  }

  /**
   * 从布尔值创建删除状态
   * @param isDeleted 是否已删除
   * @returns 删除状态实例
   */
  public static fromBoolean(isDeleted: boolean): DeletionStatus {
    const status = new DeletionStatus({ isDeleted });
    return status;
  }

  /**
   * 标记为已删除
   * @returns 新的删除状态实例
   */
  public markAsDeleted(): DeletionStatus {
    if (this.props.isDeleted) {
      return this;
    }
    return new DeletionStatus({ isDeleted: true });
  }

  /**
   * 恢复为活跃状态
   * @returns 新的删除状态实例
   */
  public restore(): DeletionStatus {
    if (!this.props.isDeleted) {
      return this;
    }
    return new DeletionStatus({ isDeleted: false });
  }

  /**
   * 检查是否为活跃状态
   * @returns 是否为活跃状态
   */
  public isActive(): boolean {
    return !this.props.isDeleted;
  }

  /**
   * 检查是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.isDeleted;
  }

  /**
   * 确保为活跃状态，如果已删除则抛出异常
   * @throws Error 如果已删除
   */
  public ensureActive(): void {
    if (this.props.isDeleted) {
      throw new ValidationError('无法操作已删除的实体');
    }
  }

  /**
   * 比较两个删除状态是否相等
   * @param other 其他删除状态
   * @returns 是否相等
   */
  public override equals(other?: DeletionStatus): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return this.props.isDeleted === other.props.isDeleted;
  }

  /**
   * 获取删除状态的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.isDeleted ? 'DeletionStatus(deleted)' : 'DeletionStatus(active)';
  }

  /**
   * 获取删除状态的描述
   * @returns 状态描述
   */
  public getDescription(): string {
    return this.props.isDeleted ? '已删除' : '活跃';
  }

  /**
   * 验证删除状态的有效性
   */
  public validate(): void {
    if (this.props.isDeleted === null || this.props.isDeleted === undefined) {
      throw new ValidationError('删除状态不能为空');
    }

    if (typeof this.props.isDeleted !== 'boolean') {
      throw new ValidationError('删除状态必须是布尔值');
    }
  }
}