import { ValueObject } from '../../common/value-objects';
/**
 * 会话状态枚举
 */
export enum SessionStatusValue {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

/**
 * 会话状态值对象接口
 */
export interface SessionStatusProps {
  value: SessionStatusValue;
}

/**
 * 会话状态值对象
 *
 * 用于表示会话的当前状态
 */
export class SessionStatus extends ValueObject<SessionStatusProps> {
  private constructor(props: SessionStatusProps) {
    super(props);
    // 在构造时验证一次，确保值对象始终有效
    if (!props.value) {
      throw new Error('会话状态不能为空');
    }
    if (!Object.values(SessionStatusValue).includes(props.value)) {
      throw new Error(`无效的会话状态: ${props.value}`);
    }
  }

  /**
   * 创建活跃状态
   * @returns 活跃状态实例
   */
  public static active(): SessionStatus {
    return new SessionStatus({ value: SessionStatusValue.ACTIVE });
  }

  /**
   * 创建非活跃状态
   * @returns 非活跃状态实例
   */
  public static inactive(): SessionStatus {
    return new SessionStatus({ value: SessionStatusValue.INACTIVE });
  }

  /**
   * 创建暂停状态
   * @returns 暂停状态实例
   */
  public static suspended(): SessionStatus {
    return new SessionStatus({ value: SessionStatusValue.SUSPENDED });
  }

  /**
   * 创建终止状态
   * @returns 终止状态实例
   */
  public static terminated(): SessionStatus {
    return new SessionStatus({ value: SessionStatusValue.TERMINATED });
  }

  /**
   * 从字符串创建会话状态
   * @param status 状态字符串
   * @returns 会话状态实例
   */
  public static fromString(status: string): SessionStatus {
    if (!Object.values(SessionStatusValue).includes(status as SessionStatusValue)) {
      throw new Error(`无效的会话状态: ${status}`);
    }
    return new SessionStatus({ value: status as SessionStatusValue });
  }

  /**
   * 获取状态值
   * @returns 状态值
   */
  public getValue(): SessionStatusValue {
    return this.props.value;
  }

  /**
   * 检查是否为活跃状态
   * @returns 是否为活跃状态
   */
  public isActive(): boolean {
    return this.props.value === SessionStatusValue.ACTIVE;
  }

  /**
   * 检查是否为非活跃状态
   * @returns 是否为非活跃状态
   */
  public isInactive(): boolean {
    return this.props.value === SessionStatusValue.INACTIVE;
  }

  /**
   * 检查是否为暂停状态
   * @returns 是否为暂停状态
   */
  public isSuspended(): boolean {
    return this.props.value === SessionStatusValue.SUSPENDED;
  }

  /**
   * 检查是否为终止状态
   * @returns 是否为终止状态
   */
  public isTerminated(): boolean {
    return this.props.value === SessionStatusValue.TERMINATED;
  }

  /**
   * 检查是否可以进行操作
   * @returns 是否可以进行操作
   */
  public canOperate(): boolean {
    return this.props.value === SessionStatusValue.ACTIVE;
  }

  /**
   * 比较两个会话状态是否相等
   * @param status 另一个会话状态
   * @returns 是否相等
   */
  public override equals(status?: SessionStatus): boolean {
    if (status === null || status === undefined) {
      return false;
    }
    return this.props.value === status.getValue();
  }

  /**
   * 获取会话状态的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 验证实体的有效性（空实现，验证在构造时完成）
   */
  public validate(): void {
    // 验证在构造时已完成，这里不需要额外验证
  }
}
