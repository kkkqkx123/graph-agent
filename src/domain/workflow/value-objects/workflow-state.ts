import { ValueObject, ID, Timestamp } from '../../common/value-objects';

/**
 * 执行历史记录接口
 */
export interface ExecutionHistory {
  /** 节点ID */
  nodeId: ID;

  /** 执行时间 */
  timestamp: Timestamp;

  /** 执行结果 */
  result?: any;

  /** 执行状态 */
  status: 'success' | 'failure' | 'pending' | 'running';

  /** 执行元数据 */
  metadata?: Record<string, any>;
}

/**
 * WorkflowState值对象属性接口
 */
export interface WorkflowStateProps {
  readonly workflowId: ID;
  readonly currentNodeId?: ID;
  readonly data: Record<string, any>;
  readonly history: ExecutionHistory[];
  readonly metadata: Record<string, any>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/**
 * WorkflowState值对象
 *
 * 表示工作流执行过程中的状态信息，是不可变的
 * 包含当前节点、执行上下文数据、执行历史和元数据
 */
export class WorkflowState extends ValueObject<WorkflowStateProps> {
  private constructor(props: WorkflowStateProps) {
    super(props);
  }

  /**
   * 创建工作流状态值对象
   * @param props 工作流状态属性
   * @returns 工作流状态值对象
   */
  public static create(props: WorkflowStateProps): WorkflowState {
    return new WorkflowState(props);
  }

  /**
   * 从已有属性重建工作流状态
   * @param props 工作流状态属性
   * @returns 工作流状态值对象
   */
  public static fromProps(props: WorkflowStateProps): WorkflowState {
    return new WorkflowState(props);
  }

  /**
   * 创建初始工作流状态
   * @param workflowId 工作流ID
   * @returns 初始工作流状态
   */
  public static initial(workflowId: ID): WorkflowState {
    const now = Timestamp.now();
    return new WorkflowState({
      workflowId,
      data: {},
      history: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get workflowId(): ID {
    return this.props.workflowId;
  }

  /**
   * 获取当前节点ID
   * @returns 当前节点ID
   */
  public get currentNodeId(): ID | undefined {
    return this.props.currentNodeId;
  }

  /**
   * 获取执行上下文数据
   * @returns 执行上下文数据
   */
  public get data(): Record<string, any> {
    return { ...this.props.data };
  }

  /**
   * 获取执行历史
   * @returns 执行历史数组
   */
  public get history(): ExecutionHistory[] {
    return [...this.props.history];
  }

  /**
   * 获取执行元数据
   * @returns 执行元数据
   */
  public get metadata(): Record<string, any> {
    return { ...this.props.metadata };
  }

  /**
   * 获取创建时间
   * @returns 创建时间
   */
  public get createdAt(): Timestamp {
    return this.props.createdAt;
  }

  /**
   * 获取更新时间
   * @returns 更新时间
   */
  public get updatedAt(): Timestamp {
    return this.props.updatedAt;
  }

  /**
   * 获取数据
   * @param key 键名（可选）
   * @returns 键对应的值，如果未指定键则返回所有数据
   */
  public getData(key?: string): any {
    if (key === undefined) {
      return { ...this.props.data };
    }
    return this.props.data[key];
  }

  /**
   * 获取属性对象
   * @returns 属性对象
   */
  public toProps(): WorkflowStateProps {
    return {
      workflowId: this.props.workflowId,
      currentNodeId: this.props.currentNodeId,
      data: { ...this.props.data },
      history: [...this.props.history],
      metadata: { ...this.props.metadata },
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  /**
   * 验证工作流状态的有效性
   */
  public override validate(): void {
    if (!this.props.workflowId) {
      throw new Error('工作流ID不能为空');
    }

    if (!this.props.data) {
      throw new Error('执行上下文数据不能为空');
    }

    if (!this.props.history) {
      throw new Error('执行历史不能为空');
    }

    if (!this.props.metadata) {
      throw new Error('执行元数据不能为空');
    }

    if (!this.props.createdAt) {
      throw new Error('创建时间不能为空');
    }

    if (!this.props.updatedAt) {
      throw new Error('更新时间不能为空');
    }

    // 验证时间逻辑
    if (this.props.updatedAt.isBefore(this.props.createdAt)) {
      throw new Error('更新时间不能早于创建时间');
    }

    // 验证执行历史
    for (let i = 0; i < this.props.history.length; i++) {
      const history = this.props.history[i];
      if (!history) {
        throw new Error(`执行历史[${i}]不能为空`);
      }
      if (!history.nodeId) {
        throw new Error(`执行历史[${i}]的节点ID不能为空`);
      }
      if (!history.timestamp) {
        throw new Error(`执行历史[${i}]的时间戳不能为空`);
      }
      if (!history.status) {
        throw new Error(`执行历史[${i}]的状态不能为空`);
      }
    }
  }

  /**
   * 获取字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return `WorkflowState(workflowId=${this.props.workflowId.toString()}, currentNodeId=${this.props.currentNodeId?.toString() || 'none'}, dataKeys=${Object.keys(this.props.data).length}, historyCount=${this.props.history.length})`;
  }
}
