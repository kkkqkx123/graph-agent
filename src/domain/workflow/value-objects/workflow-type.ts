import { ValueObject } from '../../common/value-objects';

/**
 * 工作流类型枚举
 */
export enum WorkflowTypeValue {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  CUSTOM = 'custom'
}

/**
 * 工作流类型值对象接口
 */
export interface WorkflowTypeProps {
  value: WorkflowTypeValue;
}

/**
 * 工作流类型值对象
 * 
 * 用于表示工作流的执行类型
 */
export class WorkflowType extends ValueObject<WorkflowTypeProps> {
  /**
   * 创建顺序类型
   * @returns 顺序类型实例
   */
  public static sequential(): WorkflowType {
    return new WorkflowType({ value: WorkflowTypeValue.SEQUENTIAL });
  }

  /**
   * 创建并行类型
   * @returns 并行类型实例
   */
  public static parallel(): WorkflowType {
    return new WorkflowType({ value: WorkflowTypeValue.PARALLEL });
  }

  /**
   * 创建条件类型
   * @returns 条件类型实例
   */
  public static conditional(): WorkflowType {
    return new WorkflowType({ value: WorkflowTypeValue.CONDITIONAL });
  }

  /**
   * 创建循环类型
   * @returns 循环类型实例
   */
  public static loop(): WorkflowType {
    return new WorkflowType({ value: WorkflowTypeValue.LOOP });
  }

  /**
   * 创建自定义类型
   * @returns 自定义类型实例
   */
  public static custom(): WorkflowType {
    return new WorkflowType({ value: WorkflowTypeValue.CUSTOM });
  }

  /**
   * 从字符串创建工作流类型
   * @param type 类型字符串
   * @returns 工作流类型实例
   */
  public static fromString(type: string): WorkflowType {
    if (!Object.values(WorkflowTypeValue).includes(type as WorkflowTypeValue)) {
      throw new Error(`无效的工作流类型: ${type}`);
    }
    return new WorkflowType({ value: type as WorkflowTypeValue });
  }

  /**
   * 获取类型值
   * @returns 类型值
   */
  public getValue(): WorkflowTypeValue {
    return this.props.value;
  }

  /**
   * 检查是否为顺序类型
   * @returns 是否为顺序类型
   */
  public isSequential(): boolean {
    return this.props.value === WorkflowTypeValue.SEQUENTIAL;
  }

  /**
   * 检查是否为并行类型
   * @returns 是否为并行类型
   */
  public isParallel(): boolean {
    return this.props.value === WorkflowTypeValue.PARALLEL;
  }

  /**
   * 检查是否为条件类型
   * @returns 是否为条件类型
   */
  public isConditional(): boolean {
    return this.props.value === WorkflowTypeValue.CONDITIONAL;
  }

  /**
   * 检查是否为循环类型
   * @returns 是否为循环类型
   */
  public isLoop(): boolean {
    return this.props.value === WorkflowTypeValue.LOOP;
  }

  /**
   * 检查是否为自定义类型
   * @returns 是否为自定义类型
   */
  public isCustom(): boolean {
    return this.props.value === WorkflowTypeValue.CUSTOM;
  }

  /**
   * 检查是否支持并行执行
   * @returns 是否支持并行执行
   */
  public supportsParallelExecution(): boolean {
    return this.isParallel() || this.isCustom();
  }

  /**
   * 检查是否支持条件分支
   * @returns 是否支持条件分支
   */
  public supportsConditionalBranching(): boolean {
    return this.isConditional() || this.isCustom();
  }

  /**
   * 检查是否支持循环
   * @returns 是否支持循环
   */
  public supportsLooping(): boolean {
    return this.isLoop() || this.isCustom();
  }

  /**
   * 比较两个工作流类型是否相等
   * @param type 另一个工作流类型
   * @returns 是否相等
   */
  public override equals(type?: WorkflowType): boolean {
    if (type === null || type === undefined) {
      return false;
    }
    return this.props.value === type.getValue();
  }

  /**
   * 验证工作流类型的有效性
   */
  public validate(): void {
    if (!this.props.value) {
      throw new Error('工作流类型不能为空');
    }

    if (!Object.values(WorkflowTypeValue).includes(this.props.value)) {
      throw new Error(`无效的工作流类型: ${this.props.value}`);
    }
  }

  /**
   * 获取工作流类型的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 获取工作流类型的描述
   * @returns 类型描述
   */
  public getDescription(): string {
    const descriptions: Record<WorkflowTypeValue, string> = {
      [WorkflowTypeValue.SEQUENTIAL]: '顺序执行，按节点定义的顺序依次执行',
      [WorkflowTypeValue.PARALLEL]: '并行执行，多个节点可以同时执行',
      [WorkflowTypeValue.CONDITIONAL]: '条件执行，根据条件选择执行路径',
      [WorkflowTypeValue.LOOP]: '循环执行，重复执行特定节点或子图',
      [WorkflowTypeValue.CUSTOM]: '自定义执行，根据特定逻辑执行'
    };

    return descriptions[this.props.value];
  }
}