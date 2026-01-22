import { ValueObject } from '../../common/value-objects';
import { SubWorkflowType } from './subworkflow-type';

/**
 * 子工作流标准接口
 */
export interface SubWorkflowStandardProps {
  /** 子工作流类型 */
  type: SubWorkflowType;
  /** 最大入度 */
  maxInDegree: number;
  /** 最小入度 */
  minInDegree: number;
  /** 最大出度 */
  maxOutDegree: number;
  /** 最小出度 */
  minOutDegree: number;
  /** 是否需要start节点 */
  requiresStartNode: boolean;
  /** 是否需要end节点 */
  requiresEndNode: boolean;
}

/**
 * 子工作流标准值对象
 *
 * 定义子工作流必须符合的标准
 */
export class SubWorkflowStandard extends ValueObject<SubWorkflowStandardProps> {
  private constructor(props: SubWorkflowStandardProps) {
    super(props);
    this.validate();
  }

  /**
   * 验证值对象的有效性
   * 实现基类的抽象方法
   */
  public validate(): void {
    if (this.props.minInDegree < 0) {
      throw new Error('最小入度不能为负数');
    }
    if (this.props.maxInDegree < this.props.minInDegree) {
      throw new Error('最大入度不能小于最小入度');
    }
    if (this.props.minOutDegree < 0) {
      throw new Error('最小出度不能为负数');
    }
    if (this.props.maxOutDegree < this.props.minOutDegree) {
      throw new Error('最大出度不能小于最小出度');
    }
  }

  /**
   * 创建基础子工作流标准
   * - 不需要start/end节点
   * - 入度0，出度1（起始子工作流）
   * - 入度1，出度1（中间子工作流）
   * - 入度1，出度0（结束子工作流）
   */
  public static base(
    maxInDegree: number,
    minInDegree: number,
    maxOutDegree: number,
    minOutDegree: number
  ): SubWorkflowStandard {
    return new SubWorkflowStandard({
      type: SubWorkflowType.base(),
      maxInDegree,
      minInDegree,
      maxOutDegree,
      minOutDegree,
      requiresStartNode: false,
      requiresEndNode: false,
    });
  }

  /**
   * 创建功能子工作流标准
   * - 需要start/end节点
   * - 入度0，出度1（起始子工作流）
   * - 入度1，出度1（中间子工作流）
   * - 入度1，出度0（结束子工作流）
   */
  public static feature(
    maxInDegree: number,
    minInDegree: number,
    maxOutDegree: number,
    minOutDegree: number
  ): SubWorkflowStandard {
    return new SubWorkflowStandard({
      type: SubWorkflowType.feature(),
      maxInDegree,
      minInDegree,
      maxOutDegree,
      minOutDegree,
      requiresStartNode: true,
      requiresEndNode: true,
    });
  }

  /**
   * 验证工作流是否符合子工作流标准
   * @param entryInDegree 入口节点入度
   * @param entryOutDegree 入口节点出度
   * @param exitInDegree 出口节点入度
   * @param exitOutDegree 出口节点出度
   * @param hasStartNode 是否有start节点
   * @param hasEndNode 是否有end节点
   * @returns 验证结果
   */
  public validateSubWorkflow(
    entryInDegree: number,
    entryOutDegree: number,
    exitInDegree: number,
    exitOutDegree: number,
    hasStartNode: boolean,
    hasEndNode: boolean
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证入度
    if (entryInDegree < this.props.minInDegree || entryInDegree > this.props.maxInDegree) {
      errors.push(
        `入口节点入度不符合标准：期望[${this.props.minInDegree}, ${this.props.maxInDegree}]，实际${entryInDegree}`
      );
    }

    // 验证出度
    if (exitOutDegree < this.props.minOutDegree || exitOutDegree > this.props.maxOutDegree) {
      errors.push(
        `出口节点出度不符合标准：期望[${this.props.minOutDegree}, ${this.props.maxOutDegree}]，实际${exitOutDegree}`
      );
    }

    // 验证start节点
    if (this.props.requiresStartNode && !hasStartNode) {
      errors.push('子工作流缺少start节点');
    }

    // 验证end节点
    if (this.props.requiresEndNode && !hasEndNode) {
      errors.push('子工作流缺少end节点');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取子工作流类型
   */
  public getType(): SubWorkflowType {
    return this.props.type;
  }

  /**
   * 比较两个标准是否相等
   */
  public override equals(standard?: SubWorkflowStandard): boolean {
    if (standard === null || standard === undefined) {
      return false;
    }
    return (
      this.props.type.equals(standard.getType()) &&
      this.props.maxInDegree === standard.props.maxInDegree &&
      this.props.minInDegree === standard.props.minInDegree &&
      this.props.maxOutDegree === standard.props.maxOutDegree &&
      this.props.minOutDegree === standard.props.minOutDegree &&
      this.props.requiresStartNode === standard.props.requiresStartNode &&
      this.props.requiresEndNode === standard.props.requiresEndNode
    );
  }

  /**
   * 获取字符串表示
   */
  public override toString(): string {
    return `SubWorkflowStandard(type=${this.props.type.toString()}, inDegree=[${this.props.minInDegree},${this.props.maxInDegree}], outDegree=[${this.props.minOutDegree},${this.props.maxOutDegree}])`;
  }
}