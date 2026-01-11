import { ValueObject, ID, Timestamp } from '../../common/value-objects';
import { ExecutionHistory } from '../../workflow/value-objects/execution';

/**
 * ThreadWorkflowState 值对象属性接口
 *
 * 纯值对象，不包含状态更新逻辑
 * 状态更新由Services层的ThreadStateManager负责
 */
export interface ThreadWorkflowStateProps {
  readonly workflowId: ID;
  readonly currentNodeId?: ID;
  readonly data: Record<string, any>;
  readonly history: ExecutionHistory[];
  readonly metadata: Record<string, any>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/**
 * ThreadWorkflowState 值对象
 *
 * 职责：
 * - 表示线程执行过程中的工作流状态
 * - 提供状态数据的只读访问
 * - 支持状态验证和快照
 *
 * 设计特点：
 * - 纯值对象，不包含状态更新逻辑
 * - 状态更新由Services层的ThreadStateManager负责
 * - 提供不可变的状态访问
 * - 支持状态快照和恢复
 */
export class ThreadWorkflowState extends ValueObject<ThreadWorkflowStateProps> {
  private constructor(props: ThreadWorkflowStateProps) {
    super(props);
  }

  /**
   * 创建新的工作流状态
   * @param props 状态属性
   * @returns 工作流状态实例
   */
  public static create(props: ThreadWorkflowStateProps): ThreadWorkflowState {
    return new ThreadWorkflowState(props);
  }

  /**
   * 从已有属性重建工作流状态
   * @param props 状态属性
   * @returns 工作流状态实例
   */
  public static fromProps(props: ThreadWorkflowStateProps): ThreadWorkflowState {
    return new ThreadWorkflowState(props);
  }

  /**
   * 创建初始工作流状态
   * @param workflowId 工作流ID
   * @returns 初始工作流状态
   */
  public static initial(workflowId: ID): ThreadWorkflowState {
    const now = Timestamp.now();
    return new ThreadWorkflowState({
      workflowId,
      currentNodeId: undefined,
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
   * 获取元数据
   * @returns 元数据
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
   * @returns 数据值或所有数据
   */
  public getData(key?: string): any {
    if (key) {
      return this.props.data[key];
    }
    return this.data;
  }

  /**
   * 检查数据是否存在
   * @param key 键名
   * @returns 是否存在
   */
  public hasData(key: string): boolean {
    return key in this.props.data;
  }


  /**
   * 转换为属性对象
   * @returns 属性对象
   */
  public toProps(): ThreadWorkflowStateProps {
    return {
      workflowId: this.props.workflowId,
      currentNodeId: this.props.currentNodeId,
      data: this.data,
      history: this.history,
      metadata: this.metadata,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  /**
   * 验证工作流状态的有效性
   */
  public validate(): void {
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
    for (const history of this.props.history) {
      if (!history.nodeId) {
        throw new Error('执行历史记录必须包含节点ID');
      }
      if (!history.timestamp) {
        throw new Error('执行历史记录必须包含时间戳');
      }
      if (!history.status) {
        throw new Error('执行历史记录必须包含状态');
      }
    }
  }

  /**
   * 创建快照
   * @returns 快照对象
   */
  public createSnapshot(): ThreadWorkflowStateSnapshot {
    return {
      workflowId: this.props.workflowId,
      currentNodeId: this.props.currentNodeId,
      data: this.data,
      history: this.history,
      metadata: this.metadata,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      snapshotAt: Timestamp.now(),
    };
  }

  /**
   * 从快照恢复
   * @param snapshot 快照对象
   * @returns 工作流状态实例
   */
  public static restoreFromSnapshot(snapshot: ThreadWorkflowStateSnapshot): ThreadWorkflowState {
    return new ThreadWorkflowState({
      workflowId: snapshot.workflowId,
      currentNodeId: snapshot.currentNodeId,
      data: snapshot.data,
      history: snapshot.history,
      metadata: snapshot.metadata,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    });
  }

  /**
   * 计算内存使用量
   * @returns 内存使用量（字节）
   */
  public calculateMemoryUsage(): number {
    let size = 0;

    // 计算 data 大小
    for (const key in this.props.data) {
      size += key.length * 2; // 字符串每个字符2字节
      size += JSON.stringify(this.props.data[key]).length * 2;
    }

    // 计算 history 大小
    for (const history of this.props.history) {
      size += JSON.stringify(history).length * 2;
    }

    // 计算 metadata 大小
    for (const key in this.props.metadata) {
      size += key.length * 2;
      size += JSON.stringify(this.props.metadata[key]).length * 2;
    }

    return size;
  }

  /**
   * 转换为字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return `ThreadWorkflowState(workflowId=${this.props.workflowId.toString()}, currentNodeId=${this.props.currentNodeId?.toString() || 'none'}, dataKeys=${Object.keys(this.props.data).length}, historyCount=${this.props.history.length})`;
  }

  /**
   * 检查是否相等
   * @param other 其他工作流状态
   * @returns 是否相等
   */
  public override equals(other: ThreadWorkflowState): boolean {
    if (!other) {
      return false;
    }

    return (
      this.props.workflowId.equals(other.props.workflowId) &&
      this.props.currentNodeId?.equals(other.props.currentNodeId || ID.empty()) ===
      (other.props.currentNodeId?.equals(this.props.currentNodeId || ID.empty()) || false) &&
      JSON.stringify(this.props.data) === JSON.stringify(other.props.data) &&
      JSON.stringify(this.props.history) === JSON.stringify(other.props.history) &&
      JSON.stringify(this.props.metadata) === JSON.stringify(other.props.metadata)
    );
  }
}

/**
 * ThreadWorkflowState 快照接口
 */
export interface ThreadWorkflowStateSnapshot {
  readonly workflowId: ID;
  readonly currentNodeId?: ID;
  readonly data: Record<string, any>;
  readonly history: ExecutionHistory[];
  readonly metadata: Record<string, any>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly snapshotAt: Timestamp;
}