import { ValueObject } from '../../common/value-objects';

/**
 * 快照类型枚举
 */
export enum SnapshotTypeValue {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  ERROR = 'error',
}

/**
 * 快照类型值对象接口
 */
export interface SnapshotTypeProps {
  value: SnapshotTypeValue;
}

/**
 * 快照类型值对象
 *
 * 用于表示快照的创建类型
 */
export class SnapshotType extends ValueObject<SnapshotTypeProps> {
  /**
   * 创建自动快照类型
   * @returns 自动快照类型实例
   */
  public static automatic(): SnapshotType {
    return new SnapshotType({ value: SnapshotTypeValue.AUTOMATIC });
  }

  /**
   * 创建手动快照类型
   * @returns 手动快照类型实例
   */
  public static manual(): SnapshotType {
    return new SnapshotType({ value: SnapshotTypeValue.MANUAL });
  }

  /**
   * 创建定时快照类型
   * @returns 定时快照类型实例
   */
  public static scheduled(): SnapshotType {
    return new SnapshotType({ value: SnapshotTypeValue.SCHEDULED });
  }

  /**
   * 创建错误快照类型
   * @returns 错误快照类型实例
   */
  public static error(): SnapshotType {
    return new SnapshotType({ value: SnapshotTypeValue.ERROR });
  }

  /**
   * 从字符串创建快照类型
   * @param type 类型字符串
   * @returns 快照类型实例
   */
  public static fromString(type: string): SnapshotType {
    if (!Object.values(SnapshotTypeValue).includes(type as SnapshotTypeValue)) {
      throw new Error(`无效的快照类型: ${type}`);
    }
    return new SnapshotType({ value: type as SnapshotTypeValue });
  }

  /**
   * 获取类型值
   * @returns 类型值
   */
  public getValue(): SnapshotTypeValue {
    return this.props.value;
  }

  /**
   * 检查是否为自动快照
   * @returns 是否为自动快照
   */
  public isAutomatic(): boolean {
    return this.props.value === SnapshotTypeValue.AUTOMATIC;
  }

  /**
   * 检查是否为手动快照
   * @returns 是否为手动快照
   */
  public isManual(): boolean {
    return this.props.value === SnapshotTypeValue.MANUAL;
  }

  /**
   * 检查是否为定时快照
   * @returns 是否为定时快照
   */
  public isScheduled(): boolean {
    return this.props.value === SnapshotTypeValue.SCHEDULED;
  }

  /**
   * 检查是否为错误快照
   * @returns 是否为错误快照
   */
  public isError(): boolean {
    return this.props.value === SnapshotTypeValue.ERROR;
  }

  /**
   * 检查是否为用户创建的快照
   * @returns 是否为用户创建的快照
   */
  public isUserCreated(): boolean {
    return this.isManual();
  }

  /**
   * 检查是否为系统创建的快照
   * @returns 是否为系统创建的快照
   */
  public isSystemCreated(): boolean {
    return this.isAutomatic() || this.isScheduled() || this.isError();
  }

  /**
   * 比较两个快照类型是否相等
   * @param type 另一个快照类型
   * @returns 是否相等
   */
  public override equals(type?: SnapshotType): boolean {
    if (type === null || type === undefined) {
      return false;
    }
    return this.props.value === type.getValue();
  }

  /**
   * 验证快照类型的有效性
   */
  public validate(): void {
    if (!this.props.value) {
      throw new Error('快照类型不能为空');
    }

    if (!Object.values(SnapshotTypeValue).includes(this.props.value)) {
      throw new Error(`无效的快照类型: ${this.props.value}`);
    }
  }

  /**
   * 获取快照类型的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 获取快照类型的描述
   * @returns 类型描述
   */
  public getDescription(): string {
    const descriptions: Record<SnapshotTypeValue, string> = {
      [SnapshotTypeValue.AUTOMATIC]: '自动快照，由系统自动创建',
      [SnapshotTypeValue.MANUAL]: '手动快照，由用户手动创建',
      [SnapshotTypeValue.SCHEDULED]: '定时快照，按计划定时创建',
      [SnapshotTypeValue.ERROR]: '错误快照，在发生错误时自动创建',
    };

    return descriptions[this.props.value];
  }
}
