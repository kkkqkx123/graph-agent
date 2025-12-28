import { ValueObject } from '../../common/value-objects';

/**
 * 工作流状态枚举
 */
export enum WorkflowStatusValue {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

/**
 * 工作流状态值对象接口
 */
export interface WorkflowStatusProps {
  value: WorkflowStatusValue;
}

/**
 * 工作流状态值对象
 * 
 * 用于表示工作流的当前状态
 */
export class WorkflowStatus extends ValueObject<WorkflowStatusProps> {
  private constructor(props: WorkflowStatusProps) {
    super(props);
    // 在构造时验证一次，确保值对象始终有效
    if (!props.value) {
      throw new Error('工作流状态不能为空');
    }
    if (!Object.values(WorkflowStatusValue).includes(props.value)) {
      throw new Error(`无效的工作流状态: ${props.value}`);
    }
  }

  /**
   * 创建草稿状态
   * @returns 草稿状态实例
   */
  public static draft(): WorkflowStatus {
    return new WorkflowStatus({ value: WorkflowStatusValue.DRAFT });
  }

  /**
   * 创建活跃状态
   * @returns 活跃状态实例
   */
  public static active(): WorkflowStatus {
    return new WorkflowStatus({ value: WorkflowStatusValue.ACTIVE });
  }

  /**
   * 创建非活跃状态
   * @returns 非活跃状态实例
   */
  public static inactive(): WorkflowStatus {
    return new WorkflowStatus({ value: WorkflowStatusValue.INACTIVE });
  }

  /**
   * 创建归档状态
   * @returns 归档状态实例
   */
  public static archived(): WorkflowStatus {
    return new WorkflowStatus({ value: WorkflowStatusValue.ARCHIVED });
  }

  /**
   * 从字符串创建工作流状态
   * @param status 状态字符串
   * @returns 工作流状态实例
   */
  public static fromString(status: string): WorkflowStatus {
    if (!Object.values(WorkflowStatusValue).includes(status as WorkflowStatusValue)) {
      throw new Error(`无效的工作流状态: ${status}`);
    }
    return new WorkflowStatus({ value: status as WorkflowStatusValue });
  }

  /**
   * 获取状态值
   * @returns 状态值
   */
  public getValue(): WorkflowStatusValue {
    return this.props.value;
  }

  /**
   * 检查是否为草稿状态
   * @returns 是否为草稿状态
   */
  public isDraft(): boolean {
    return this.props.value === WorkflowStatusValue.DRAFT;
  }

  /**
   * 检查是否为活跃状态
   * @returns 是否为活跃状态
   */
  public isActive(): boolean {
    return this.props.value === WorkflowStatusValue.ACTIVE;
  }

  /**
   * 检查是否为非活跃状态
   * @returns 是否为非活跃状态
   */
  public isInactive(): boolean {
    return this.props.value === WorkflowStatusValue.INACTIVE;
  }

  /**
   * 检查是否为归档状态
   * @returns 是否为归档状态
   */
  public isArchived(): boolean {
    return this.props.value === WorkflowStatusValue.ARCHIVED;
  }

  /**
   * 检查是否可以进行操作
   * @returns 是否可以进行操作
   */
  public canOperate(): boolean {
    return this.props.value === WorkflowStatusValue.ACTIVE;
  }

  /**
   * 检查是否可以编辑
   * @returns 是否可以编辑
   */
  public canEdit(): boolean {
    return this.props.value === WorkflowStatusValue.DRAFT;
  }

  /**
   * 检查是否可以执行
   * @returns 是否可以执行
   */
  public canExecute(): boolean {
    return this.props.value === WorkflowStatusValue.ACTIVE;
  }

  /**
   * 比较两个工作流状态是否相等
   * @param status 另一个工作流状态
   * @returns 是否相等
   */
  public override equals(status?: WorkflowStatus): boolean {
    if (status === null || status === undefined) {
      return false;
    }
    return this.props.value === status.getValue();
  }


  /**
   * 获取工作流状态的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 验证实体的有效性（空实现，验证在构造时完成）
   */
  public validate(): void {
    // 验证在构造时已完成，这里不需要额外验证
  }
}