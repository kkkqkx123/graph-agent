import { ValueObject } from '../../common/value-objects';

/**
 * 状态实体类型枚举
 */
export enum StateEntityTypeValue {
  WORKFLOW = 'workflow',
  THREAD = 'thread',
  SESSION = 'session',
}

/**
 * 状态实体类型值对象接口
 */
export interface StateEntityTypeProps {
  value: StateEntityTypeValue;
}

/**
 * 状态实体类型值对象
 *
 * 用于表示状态所属的实体类型（Workflow、Thread或Session）
 */
export class StateEntityType extends ValueObject<StateEntityTypeProps> {
  private constructor(props: StateEntityTypeProps) {
    super(props);
  }

  /**
   * 创建工作流类型
   * @returns 工作流类型实例
   */
  public static workflow(): StateEntityType {
    return new StateEntityType({ value: StateEntityTypeValue.WORKFLOW });
  }

  /**
   * 创建线程类型
   * @returns 线程类型实例
   */
  public static thread(): StateEntityType {
    return new StateEntityType({ value: StateEntityTypeValue.THREAD });
  }

  /**
   * 创建会话类型
   * @returns 会话类型实例
   */
  public static session(): StateEntityType {
    return new StateEntityType({ value: StateEntityTypeValue.SESSION });
  }

  /**
   * 从字符串创建实体类型
   * @param value 类型字符串
   * @returns 实体类型实例
   */
  public static fromString(value: string): StateEntityType {
    if (!Object.values(StateEntityTypeValue).includes(value as StateEntityTypeValue)) {
      throw new Error(`无效的实体类型: ${value}`);
    }
    return new StateEntityType({ value: value as StateEntityTypeValue });
  }

  /**
   * 获取类型值
   * @returns 类型值
   */
  public getValue(): StateEntityTypeValue {
    return this.props.value;
  }

  /**
   * 检查是否为工作流类型
   * @returns 是否为工作流
   */
  public isWorkflow(): boolean {
    return this.props.value === StateEntityTypeValue.WORKFLOW;
  }

  /**
   * 检查是否为线程类型
   * @returns 是否为线程
   */
  public isThread(): boolean {
    return this.props.value === StateEntityTypeValue.THREAD;
  }

  /**
   * 检查是否为会话类型
   * @returns 是否为会话
   */
  public isSession(): boolean {
    return this.props.value === StateEntityTypeValue.SESSION;
  }

  /**
   * 获取类型描述
   * @returns 类型描述
   */
  public getDescription(): string {
    switch (this.props.value) {
      case StateEntityTypeValue.WORKFLOW:
        return 'Workflow';
      case StateEntityTypeValue.THREAD:
        return 'Thread';
      case StateEntityTypeValue.SESSION:
        return 'Session';
      default:
        return 'Unknown';
    }
  }

  /**
   * 验证值对象有效性
   */
  public override validate(): void {
    if (!this.props.value) {
      throw new Error('实体类型不能为空');
    }
    if (!Object.values(StateEntityTypeValue).includes(this.props.value)) {
      throw new Error(`无效的实体类型: ${this.props.value}`);
    }
  }
}