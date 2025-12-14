import { ValueObject } from '../../common/value-objects/value-object';
import { DomainError } from '../../common/errors/domain-error';

/**
 * 边类型枚举
 */
export enum EdgeTypeValue {
  SEQUENCE = 'sequence',
  CONDITIONAL = 'conditional',
  DEFAULT = 'default',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  CUSTOM = 'custom'
}

/**
 * 边类型值对象接口
 */
export interface EdgeTypeProps {
  value: EdgeTypeValue;
}

/**
 * 边类型值对象
 * 
 * 用于表示边的类型
 */
export class EdgeType extends ValueObject<EdgeTypeProps> {
  /**
   * 创建顺序边类型
   * @returns 顺序边类型实例
   */
  public static sequence(): EdgeType {
    return new EdgeType({ value: EdgeTypeValue.SEQUENCE });
  }

  /**
   * 创建条件边类型
   * @returns 条件边类型实例
   */
  public static conditional(): EdgeType {
    return new EdgeType({ value: EdgeTypeValue.CONDITIONAL });
  }

  /**
   * 创建默认边类型
   * @returns 默认边类型实例
   */
  public static default(): EdgeType {
    return new EdgeType({ value: EdgeTypeValue.DEFAULT });
  }

  /**
   * 创建错误边类型
   * @returns 错误边类型实例
   */
  public static error(): EdgeType {
    return new EdgeType({ value: EdgeTypeValue.ERROR });
  }

  /**
   * 创建超时边类型
   * @returns 超时边类型实例
   */
  public static timeout(): EdgeType {
    return new EdgeType({ value: EdgeTypeValue.TIMEOUT });
  }

  /**
   * 创建自定义边类型
   * @returns 自定义边类型实例
   */
  public static custom(): EdgeType {
    return new EdgeType({ value: EdgeTypeValue.CUSTOM });
  }

  /**
   * 从字符串创建边类型
   * @param type 类型字符串
   * @returns 边类型实例
   */
  public static fromString(type: string): EdgeType {
    if (!Object.values(EdgeTypeValue).includes(type as EdgeTypeValue)) {
      throw new DomainError(`无效的边类型: ${type}`);
    }
    return new EdgeType({ value: type as EdgeTypeValue });
  }

  /**
   * 获取类型值
   * @returns 类型值
   */
  public getValue(): EdgeTypeValue {
    return this.props.value;
  }

  /**
   * 检查是否为顺序边
   * @returns 是否为顺序边
   */
  public isSequence(): boolean {
    return this.props.value === EdgeTypeValue.SEQUENCE;
  }

  /**
   * 检查是否为条件边
   * @returns 是否为条件边
   */
  public isConditional(): boolean {
    return this.props.value === EdgeTypeValue.CONDITIONAL;
  }

  /**
   * 检查是否为默认边
   * @returns 是否为默认边
   */
  public isDefault(): boolean {
    return this.props.value === EdgeTypeValue.DEFAULT;
  }

  /**
   * 检查是否为错误边
   * @returns 是否为错误边
   */
  public isError(): boolean {
    return this.props.value === EdgeTypeValue.ERROR;
  }

  /**
   * 检查是否为超时边
   * @returns 是否为超时边
   */
  public isTimeout(): boolean {
    return this.props.value === EdgeTypeValue.TIMEOUT;
  }

  /**
   * 检查是否为自定义边
   * @returns 是否为自定义边
   */
  public isCustom(): boolean {
    return this.props.value === EdgeTypeValue.CUSTOM;
  }

  /**
   * 检查是否为异常处理边
   * @returns 是否为异常处理边
   */
  public isExceptionHandling(): boolean {
    return this.isError() || this.isTimeout();
  }

  /**
   * 检查是否需要条件评估
   * @returns 是否需要条件评估
   */
  public requiresConditionEvaluation(): boolean {
    return this.isConditional();
  }

  /**
   * 检查是否为正常流程边
   * @returns 是否为正常流程边
   */
  public isNormalFlow(): boolean {
    return this.isSequence() || this.isDefault();
  }

  /**
   * 比较两个边类型是否相等
   * @param type 另一个边类型
   * @returns 是否相等
   */
  public override equals(type?: EdgeType): boolean {
    if (type === null || type === undefined) {
      return false;
    }
    return this.props.value === type.getValue();
  }

  /**
   * 验证边类型的有效性
   */
  public validate(): void {
    if (!this.props.value) {
      throw new DomainError('边类型不能为空');
    }

    if (!Object.values(EdgeTypeValue).includes(this.props.value)) {
      throw new DomainError(`无效的边类型: ${this.props.value}`);
    }
  }

  /**
   * 获取边类型的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 获取边类型的描述
   * @returns 类型描述
   */
  public getDescription(): string {
    const descriptions: Record<EdgeTypeValue, string> = {
      [EdgeTypeValue.SEQUENCE]: '顺序边，表示正常的执行流程',
      [EdgeTypeValue.CONDITIONAL]: '条件边，根据条件决定是否执行',
      [EdgeTypeValue.DEFAULT]: '默认边，条件不满足时的默认路径',
      [EdgeTypeValue.ERROR]: '错误边，处理异常情况',
      [EdgeTypeValue.TIMEOUT]: '超时边，处理超时情况',
      [EdgeTypeValue.CUSTOM]: '自定义边，根据特定逻辑执行'
    };

    return descriptions[this.props.value];
  }
}