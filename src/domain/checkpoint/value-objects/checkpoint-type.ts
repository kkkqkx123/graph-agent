import { ValueObject } from '../../common/value-objects/value-object';
import { DomainError } from '../../common/errors/domain-error';

/**
 * 检查点类型枚举
 */
export enum CheckpointTypeValue {
  AUTO = 'auto',
  MANUAL = 'manual',
  ERROR = 'error',
  MILESTONE = 'milestone'
}

/**
 * 检查点类型值对象接口
 */
export interface CheckpointTypeProps {
  value: CheckpointTypeValue;
}

/**
 * 检查点类型值对象
 * 
 * 用于表示检查点的类型
 */
export class CheckpointType extends ValueObject<CheckpointTypeProps> {
  /**
   * 创建自动检查点类型
   * @returns 自动检查点类型实例
   */
  public static auto(): CheckpointType {
    return new CheckpointType({ value: CheckpointTypeValue.AUTO });
  }

  /**
   * 创建手动检查点类型
   * @returns 手动检查点类型实例
   */
  public static manual(): CheckpointType {
    return new CheckpointType({ value: CheckpointTypeValue.MANUAL });
  }

  /**
   * 创建错误检查点类型
   * @returns 错误检查点类型实例
   */
  public static error(): CheckpointType {
    return new CheckpointType({ value: CheckpointTypeValue.ERROR });
  }

  /**
   * 创建里程碑检查点类型
   * @returns 里程碑检查点类型实例
   */
  public static milestone(): CheckpointType {
    return new CheckpointType({ value: CheckpointTypeValue.MILESTONE });
  }

  /**
   * 从字符串创建检查点类型
   * @param type 类型字符串
   * @returns 检查点类型实例
   */
  public static fromString(type: string): CheckpointType {
    if (!Object.values(CheckpointTypeValue).includes(type as CheckpointTypeValue)) {
      throw new DomainError(`无效的检查点类型: ${type}`);
    }
    return new CheckpointType({ value: type as CheckpointTypeValue });
  }

  /**
   * 获取类型值
   * @returns 类型值
   */
  public getValue(): CheckpointTypeValue {
    return this.props.value;
  }

  /**
   * 检查是否为自动检查点
   * @returns 是否为自动检查点
   */
  public isAuto(): boolean {
    return this.props.value === CheckpointTypeValue.AUTO;
  }

  /**
   * 检查是否为手动检查点
   * @returns 是否为手动检查点
   */
  public isManual(): boolean {
    return this.props.value === CheckpointTypeValue.MANUAL;
  }

  /**
   * 检查是否为错误检查点
   * @returns 是否为错误检查点
   */
  public isError(): boolean {
    return this.props.value === CheckpointTypeValue.ERROR;
  }

  /**
   * 检查是否为里程碑检查点
   * @returns 是否为里程碑检查点
   */
  public isMilestone(): boolean {
    return this.props.value === CheckpointTypeValue.MILESTONE;
  }

  /**
   * 检查是否为用户创建的检查点
   * @returns 是否为用户创建的检查点
   */
  public isUserCreated(): boolean {
    return this.isManual() || this.isMilestone();
  }

  /**
   * 比较两个检查点类型是否相等
   * @param type 另一个检查点类型
   * @returns 是否相等
   */
  public override equals(type?: CheckpointType): boolean {
    if (type === null || type === undefined) {
      return false;
    }
    return this.props.value === type.getValue();
  }

  /**
   * 验证检查点类型的有效性
   */
  public validate(): void {
    if (!this.props.value) {
      throw new DomainError('检查点类型不能为空');
    }

    if (!Object.values(CheckpointTypeValue).includes(this.props.value)) {
      throw new DomainError(`无效的检查点类型: ${this.props.value}`);
    }
  }

  /**
   * 获取检查点类型的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 获取检查点类型的描述
   * @returns 类型描述
   */
  public getDescription(): string {
    const descriptions: Record<CheckpointTypeValue, string> = {
      [CheckpointTypeValue.AUTO]: '自动检查点，由系统自动创建',
      [CheckpointTypeValue.MANUAL]: '手动检查点，由用户手动创建',
      [CheckpointTypeValue.ERROR]: '错误检查点，在发生错误时自动创建',
      [CheckpointTypeValue.MILESTONE]: '里程碑检查点，标记重要的执行节点'
    };

    return descriptions[this.props.value];
  }
}