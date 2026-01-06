import { ValueObject } from '../../common/value-objects';

/**
 * 快照范围枚举
 */
export enum SnapshotScopeValue {
  SESSION = 'session',
  THREAD = 'thread',
  GLOBAL = 'global',
}

/**
 * 快照范围值对象接口
 */
export interface SnapshotScopeProps {
  value: SnapshotScopeValue;
}

/**
 * 快照范围值对象
 *
 * 用于表示快照的作用范围
 */
export class SnapshotScope extends ValueObject<SnapshotScopeProps> {
  /**
   * 创建会话范围
   * @returns 会话范围实例
   */
  public static session(): SnapshotScope {
    return new SnapshotScope({ value: SnapshotScopeValue.SESSION });
  }

  /**
   * 创建线程范围
   * @returns 线程范围实例
   */
  public static thread(): SnapshotScope {
    return new SnapshotScope({ value: SnapshotScopeValue.THREAD });
  }

  /**
   * 创建全局范围
   * @returns 全局范围实例
   */
  public static global(): SnapshotScope {
    return new SnapshotScope({ value: SnapshotScopeValue.GLOBAL });
  }

  /**
   * 从字符串创建快照范围
   * @param scope 范围字符串
   * @returns 快照范围实例
   */
  public static fromString(scope: string): SnapshotScope {
    if (!Object.values(SnapshotScopeValue).includes(scope as SnapshotScopeValue)) {
      throw new Error(`无效的快照范围: ${scope}`);
    }
    return new SnapshotScope({ value: scope as SnapshotScopeValue });
  }

  /**
   * 获取范围值
   * @returns 范围值
   */
  public getValue(): SnapshotScopeValue {
    return this.props.value;
  }

  /**
   * 检查是否为会话范围
   * @returns 是否为会话范围
   */
  public isSession(): boolean {
    return this.props.value === SnapshotScopeValue.SESSION;
  }

  /**
   * 检查是否为线程范围
   * @returns 是否为线程范围
   */
  public isThread(): boolean {
    return this.props.value === SnapshotScopeValue.THREAD;
  }

  /**
   * 检查是否为全局范围
   * @returns 是否为全局范围
   */
  public isGlobal(): boolean {
    return this.props.value === SnapshotScopeValue.GLOBAL;
  }

  /**
   * 检查是否需要目标ID
   * @returns 是否需要目标ID
   */
  public requiresTargetId(): boolean {
    return this.isSession() || this.isThread();
  }

  /**
   * 比较两个快照范围是否相等
   * @param scope 另一个快照范围
   * @returns 是否相等
   */
  public override equals(scope?: SnapshotScope): boolean {
    if (scope === null || scope === undefined) {
      return false;
    }
    return this.props.value === scope.getValue();
  }

  /**
   * 验证快照范围的有效性
   */
  public validate(): void {
    if (!this.props.value) {
      throw new Error('快照范围不能为空');
    }

    if (!Object.values(SnapshotScopeValue).includes(this.props.value)) {
      throw new Error(`无效的快照范围: ${this.props.value}`);
    }
  }

  /**
   * 获取快照范围的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 获取快照范围的描述
   * @returns 范围描述
   */
  public getDescription(): string {
    const descriptions: Record<SnapshotScopeValue, string> = {
      [SnapshotScopeValue.SESSION]: '会话范围，包含会话内所有线程的状态',
      [SnapshotScopeValue.THREAD]: '线程范围，包含单个线程的状态',
      [SnapshotScopeValue.GLOBAL]: '全局范围，包含整个系统的状态',
    };

    return descriptions[this.props.value];
  }
}
