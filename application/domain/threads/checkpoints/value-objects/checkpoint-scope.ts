import { ValueObject } from '../../../common/value-objects/value-object';
import { ValidationError } from '../../../common/exceptions';

/**
 * 检查点范围枚举
 * 
 * 注意：Checkpoint 只专注于 Thread 的状态记录
 * Session 的状态通过聚合其 Thread 的 checkpoint 获取
 */
export enum CheckpointScopeValue {
  THREAD = 'thread',
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
 * 表示检查点的适用范围：仅限线程
 * 
 * 设计原则：
 * - Thread 是唯一的执行引擎，负责实际的 workflow 执行和状态管理
 * - Session 是轻量级控制器，通过管理 Thread 来实现功能
 * - Checkpoint 只记录 Thread 的状态快照
 * - Session 的状态通过聚合其 Thread 的 checkpoint 间接获取
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
   * 从字符串创建
   */
  public static fromString(value: string): CheckpointScope {
    const scopeValue = Object.values(CheckpointScopeValue).find(
      (v) => v === value
    );
    if (!scopeValue) {
      throw new ValidationError(`无效的检查点范围: ${value}`);
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
   * 检查是否需要目标ID
   */
  public requiresTargetId(): boolean {
    return this.props.value === CheckpointScopeValue.THREAD;
  }

  /**
   * 获取范围描述
   */
  public getDescription(): string {
    switch (this.props.value) {
      case CheckpointScopeValue.THREAD:
        return '线程';
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
      throw new ValidationError('检查点范围不能为空');
    }

    const validValues = Object.values(CheckpointScopeValue);
    if (!validValues.includes(this.props.value)) {
      throw new ValidationError(`无效的检查点范围: ${this.props.value}`);
    }
  }
}