import { ValueObject } from '../../../common/value-objects';

/**
 * 子工作流类型枚举
 */
export enum SubWorkflowTypeValue {
  /** 基础子工作流：不需要start/end节点，通过入度/出度确定入口/出口 */
  BASE = 'base',
  /** 功能子工作流：需要start/end节点，完整的子工作流 */
  FEATURE = 'feature',
}

/**
 * 子工作流类型值对象
 */
export class SubWorkflowType extends ValueObject<{ value: SubWorkflowTypeValue }> {
  private constructor(props: { value: SubWorkflowTypeValue }) {
    super(props);
  }

  /**
   * 创建基础子工作流类型
   */
  public static base(): SubWorkflowType {
    return new SubWorkflowType({ value: SubWorkflowTypeValue.BASE });
  }

  /**
   * 创建功能子工作流类型
   */
  public static feature(): SubWorkflowType {
    return new SubWorkflowType({ value: SubWorkflowTypeValue.FEATURE });
  }

  /**
   * 从字符串创建子工作流类型
   */
  public static fromString(type: string): SubWorkflowType {
    if (type === SubWorkflowTypeValue.BASE) {
      return SubWorkflowType.base();
    }
    if (type === SubWorkflowTypeValue.FEATURE) {
      return SubWorkflowType.feature();
    }
    throw new Error(`无效的子工作流类型: ${type}`);
  }

  /**
   * 获取类型值
   */
  public getValue(): SubWorkflowTypeValue {
    return this.props.value;
  }

  /**
   * 检查是否为基础子工作流
   */
  public isBase(): boolean {
    return this.props.value === SubWorkflowTypeValue.BASE;
  }

  /**
   * 检查是否为功能子工作流
   */
  public isFeature(): boolean {
    return this.props.value === SubWorkflowTypeValue.FEATURE;
  }

  /**
   * 比较两个类型是否相等
   */
  public override equals(type?: SubWorkflowType): boolean {
    if (type === null || type === undefined) {
      return false;
    }
    return this.props.value === type.getValue();
  }

  /**
   * 获取字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 获取类型描述
   */
  public getDescription(): string {
    const descriptions: Record<SubWorkflowTypeValue, string> = {
      [SubWorkflowTypeValue.BASE]: '基础子工作流：不需要start/end节点，通过入度/出度确定入口/出口',
      [SubWorkflowTypeValue.FEATURE]: '功能子工作流：需要start/end节点，完整的子工作流',
    };
    return descriptions[this.props.value];
  }
}