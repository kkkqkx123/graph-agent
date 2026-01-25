import { ID } from '../../common/value-objects';
import { ValueObject } from '../../common/value-objects/value-object';
import { ValidationError } from '../../common/exceptions';

/**
 * 子工作流引用属性接口
 */
export interface WorkflowReferenceProps {
  /** 引用ID（在工作流内唯一标识） */
  readonly referenceId: string;
  /** 引用的工作流ID */
  readonly workflowId: ID;
  /** 版本号（可选） */
  readonly version?: string;
  /** 输入映射（源变量 -> 目标变量） */
  readonly inputMapping: Map<string, string>;
  /** 输出映射（源变量 -> 目标变量） */
  readonly outputMapping: Map<string, string>;
  /** 描述 */
  readonly description?: string;
}

/**
 * 子工作流引用值对象
 *
 * 表示对另一个工作流的引用，用于子工作流节点
 */
export class WorkflowReference extends ValueObject<WorkflowReferenceProps> {
  /**
   * 创建子工作流引用
   * @param props 引用属性
   * @returns 引用实例
   */
  public static create(props: WorkflowReferenceProps): WorkflowReference {
    return new WorkflowReference(props);
  }

  /**
   * 获取引用ID
   */
  public get referenceId(): string {
    return this.props.referenceId;
  }

  /**
   * 获取工作流ID
   */
  public get workflowId(): ID {
    return this.props.workflowId;
  }

  /**
   * 获取版本号
   */
  public get version(): string | undefined {
    return this.props.version;
  }

  /**
   * 获取输入映射
   */
  public get inputMapping(): Map<string, string> {
    return new Map(this.props.inputMapping);
  }

  /**
   * 获取输出映射
   */
  public get outputMapping(): Map<string, string> {
    return new Map(this.props.outputMapping);
  }

  /**
   * 获取描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 比较两个引用是否相等
   */
  public override equals(reference?: WorkflowReference): boolean {
    if (reference === null || reference === undefined) {
      return false;
    }

    return (
      this.props.referenceId === reference.referenceId &&
      this.props.workflowId.equals(reference.workflowId) &&
      this.props.version === reference.version
    );
  }

  /**
   * 获取引用的字符串表示
   */
  public override toString(): string {
    return `WorkflowReference(${this.props.referenceId} -> ${this.props.workflowId.toString()})`;
  }

  /**
   * 验证引用的有效性
   */
  public validate(): void {
    if (!this.props.referenceId || typeof this.props.referenceId !== 'string') {
      throw new ValidationError('referenceId 必须是有效的字符串');
    }

    if (!this.props.workflowId) {
      throw new ValidationError('workflowId 是必需的');
    }

    if (this.props.version !== undefined && typeof this.props.version !== 'string') {
      throw new ValidationError('version 必须是字符串');
    }
  }
}