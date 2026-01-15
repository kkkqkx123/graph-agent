import { ValueObject } from '../../../common/value-objects/value-object';

/**
 * 检查点范围枚举
 */
export enum CheckpointScopeValue {
  THREAD = 'thread',
  SESSION = 'session',
  GLOBAL = 'global',
}

/**
 * 检查点范围属性接口
 */
export interface CheckpointScopeProps {
  value: CheckpointScopeValue;
}

/**
 * 检查点范围值对象
 *
 * 表示检查点的适用范围：线程、会话或全局
 */
export class CheckpointScope extends ValueObject<CheckpointScopeProps> {
  private constructor(props: CheckpointScopeProps) {
    super(props);
  }

  /**
   * 创建线程范围
   */
  public static thread(): CheckpointScope {
    return new CheckpointScope({ value: CheckpointScopeValue.THREAD });
  }

  /**
   * 创建会话范围
   */
  public static session(): CheckpointScope {
    return new CheckpointScope({ value: CheckpointScopeValue.SESSION });
  }

  /**
   * 创建全局范围
   */
  public static global(): CheckpointScope {
    return new CheckpointScope({ value: CheckpointScopeValue.GLOBAL });
  }

  /**
   * 从字符串创建
   */
  public static fromString(value: string): CheckpointScope {
    const scopeValue = Object.values(CheckpointScopeValue).find(
      (v) => v === value
    );
    if (!scopeValue) {
      throw new Error(`无效的检查点范围: ${value}`);
    }
    return new CheckpointScope({ value: scopeValue });
  }

  /**
   * 获取值
   */
  public getValue(): CheckpointScopeValue {
    return this.props.value;
  }

  /**
   * 检查是否为线程范围
   */
  public isThread(): boolean {
    return this.props.value === CheckpointScopeValue.THREAD;
  }

  /**
   * 检查是否为会话范围
   */
  public isSession(): boolean {
    return this.props.value === CheckpointScopeValue.SESSION;
  }

  /**
   * 检查是否为全局范围
   */
  public isGlobal(): boolean {
    return this.props.value === CheckpointScopeValue.GLOBAL;
  }

  /**
   * 检查是否需要目标ID
   */
  public requiresTargetId(): boolean {
    return this.props.value === CheckpointScopeValue.THREAD ||
           this.props.value === CheckpointScopeValue.SESSION;
  }

  /**
   * 获取范围描述
   */
  public getDescription(): string {
    switch (this.props.value) {
      case CheckpointScopeValue.THREAD:
        return '线程';
      case CheckpointScopeValue.SESSION:
        return '会话';
      case CheckpointScopeValue.GLOBAL:
        return '全局';
      default:
        return '未知';
    }
  }

  /**
   * 转换为字符串
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 检查是否相等
   */
  public override equals(other: CheckpointScope): boolean {
    return this.props.value === other.props.value;
  }

  /**
   * 验证值对象
   */
  public override validate(): void {
    if (!this.props.value) {
      throw new Error('检查点范围不能为空');
    }

    const validValues = Object.values(CheckpointScopeValue);
    if (!validValues.includes(this.props.value)) {
      throw new Error(`无效的检查点范围: ${this.props.value}`);
    }
  }
}