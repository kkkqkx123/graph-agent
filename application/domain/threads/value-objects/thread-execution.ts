import { ValueObject, ID, Timestamp } from '../../common/value-objects';
import { ThreadStatus } from './thread-status';
import { NodeId } from '../../workflow/value-objects';
import { ExecutionHistory } from '../../workflow/value-objects/execution';
import { NodeExecution } from './node-execution';
import { ThreadExecutionContext } from './execution-context';
import { ThreadWorkflowState } from './thread-workflow-state';
import { ValidationError } from '../../common/exceptions';

/**
 * 操作记录接口
 */
export interface OperationRecord {
  readonly operationId: ID;
  readonly operationType:
  | 'start'
  | 'pause'
  | 'resume'
  | 'complete'
  | 'fail'
  | 'cancel'
  | 'fork'
  | 'copy';
  readonly timestamp: Timestamp;
  readonly operatorId?: ID;
  readonly reason?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Fork信息接口
 */
export interface ForkInfo {
  readonly forkId: ID;
  readonly parentThreadId: ID;
  readonly forkPoint: NodeId;
  readonly forkedAt: Timestamp;
  readonly forkStrategy: string;
}

/**
 * Copy信息接口
 */
export interface CopyInfo {
  readonly copyId: ID;
  readonly sourceThreadId: ID;
  readonly copiedAt: Timestamp;
  readonly copyScope: 'full' | 'partial';
}

/**
 * ThreadExecution值对象属性接口
 */
export interface ThreadExecutionProps {
  readonly threadId: ID;
  readonly status: ThreadStatus;
  readonly progress: number;
  readonly currentStep?: string;
  readonly startedAt?: Timestamp;
  readonly completedAt?: Timestamp;
  readonly errorMessage?: string;
  readonly retryCount: number;
  readonly lastActivityAt: Timestamp;
  readonly nodeExecutions: Map<string, NodeExecution>;
  readonly context: ThreadExecutionContext;
  readonly operationHistory: OperationRecord[];
  readonly forkInfo?: ForkInfo;
  readonly copyInfo?: CopyInfo;
  readonly workflowState?: ThreadWorkflowState;
}

/**
 * ThreadExecution值对象
 *
 * 表示线程的执行状态信息，是不可变的
 * 包含执行进度、状态变化、节点级状态和操作历史
 */
export class ThreadExecution extends ValueObject<ThreadExecutionProps> {
  /**
   * 创建线程执行值对象
   * @param threadId 线程ID
   * @param context 执行上下文
   * @returns 线程执行值对象
   */
  public static create(threadId: ID, context: ThreadExecutionContext): ThreadExecution {
    const now = Timestamp.now();
    const threadStatus = ThreadStatus.pending();

    return new ThreadExecution({
      threadId,
      status: threadStatus,
      progress: 0,
      retryCount: 0,
      lastActivityAt: now,
      nodeExecutions: new Map(),
      context,
      operationHistory: [],
    });
  }

  /**
   * 从已有属性重建线程执行
   * @param props 线程执行属性
   * @returns 线程执行值对象
   */
  public static fromProps(props: ThreadExecutionProps): ThreadExecution {
    return new ThreadExecution(props);
  }

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  public get threadId(): ID {
    return this.props.threadId;
  }

  /**
   * 获取线程状态
   * @returns 线程状态
   */
  public get status(): ThreadStatus {
    return this.props.status;
  }

  /**
   * 获取执行进度
   * @returns 执行进度（0-100）
   */
  public get progress(): number {
    return this.props.progress;
  }

  /**
   * 获取当前步骤
   * @returns 当前步骤
   */
  public get currentStep(): string | undefined {
    return this.props.currentStep;
  }

  /**
   * 获取开始时间
   * @returns 开始时间
   */
  public get startedAt(): Timestamp | undefined {
    return this.props.startedAt;
  }

  /**
   * 获取完成时间
   * @returns 完成时间
   */
  public get completedAt(): Timestamp | undefined {
    return this.props.completedAt;
  }

  /**
   * 获取错误信息
   * @returns 错误信息
   */
  public get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  /**
   * 获取重试次数
   * @returns 重试次数
   */
  public get retryCount(): number {
    return this.props.retryCount;
  }

  /**
   * 获取最后活动时间
   * @returns 最后活动时间
   */
  public get lastActivityAt(): Timestamp {
    return this.props.lastActivityAt;
  }

  /**
   * 获取节点执行状态
   * @returns 节点执行状态映射
   */
  public get nodeExecutions(): Map<string, NodeExecution> {
    return new Map(this.props.nodeExecutions);
  }

  /**
   * 获取执行上下文
   * @returns 执行上下文
   */
  public get context(): ThreadExecutionContext {
    return this.props.context;
  }

  /**
   * 获取操作历史
   * @returns 操作历史数组
   */
  public get operationHistory(): OperationRecord[] {
    return [...this.props.operationHistory];
  }

  /**
   * 获取Fork信息
   * @returns Fork信息
   */
  public get forkInfo(): ForkInfo | undefined {
    return this.props.forkInfo;
  }

  /**
   * 获取Copy信息
   * @returns Copy信息
   */
  public get copyInfo(): CopyInfo | undefined {
    return this.props.copyInfo;
  }

  /**
   * 获取节点执行状态
   * @param nodeId 节点ID
   * @returns 节点执行状态
   */
  public getNodeExecution(nodeId: NodeId): NodeExecution | undefined {
    return this.props.nodeExecutions.get(nodeId.toString());
  }

  /**
   * 检查节点执行状态是否存在
   * @param nodeId 节点ID
   * @returns 是否存在
   */
  public hasNodeExecution(nodeId: NodeId): boolean {
    return this.props.nodeExecutions.has(nodeId.toString());
  }

  /**
   * 启动执行（创建新实例）
   * @returns 新的线程执行值对象
   */
  public start(): ThreadExecution {
    if (!this.props.status.isPending()) {
      throw new ValidationError('只能启动待执行状态的线程');
    }

    const operationRecord: OperationRecord = {
      operationId: ID.generate(),
      operationType: 'start',
      timestamp: Timestamp.now(),
    };

    return new ThreadExecution({
      ...this.props,
      status: ThreadStatus.running(),
      startedAt: Timestamp.now(),
      lastActivityAt: Timestamp.now(),
      operationHistory: [...this.props.operationHistory, operationRecord],
    });
  }

  /**
   * 暂停执行（创建新实例）
   * @returns 新的线程执行值对象
   */
  public pause(): ThreadExecution {
    if (!this.props.status.isRunning()) {
      throw new ValidationError('只能暂停运行中的线程');
    }

    const operationRecord: OperationRecord = {
      operationId: ID.generate(),
      operationType: 'pause',
      timestamp: Timestamp.now(),
    };

    return new ThreadExecution({
      ...this.props,
      status: ThreadStatus.paused(),
      lastActivityAt: Timestamp.now(),
      operationHistory: [...this.props.operationHistory, operationRecord],
    });
  }

  /**
   * 恢复执行（创建新实例）
   * @returns 新的线程执行值对象
   */
  public resume(): ThreadExecution {
    if (!this.props.status.isPaused()) {
      throw new ValidationError('只能恢复暂停状态的线程');
    }

    const operationRecord: OperationRecord = {
      operationId: ID.generate(),
      operationType: 'resume',
      timestamp: Timestamp.now(),
    };

    return new ThreadExecution({
      ...this.props,
      status: ThreadStatus.running(),
      lastActivityAt: Timestamp.now(),
      operationHistory: [...this.props.operationHistory, operationRecord],
    });
  }

  /**
   * 完成执行（创建新实例）
   * @returns 新的线程执行值对象
   */
  public complete(): ThreadExecution {
    if (!this.props.status.isActive()) {
      throw new ValidationError('只能完成活跃状态的线程');
    }

    const operationRecord: OperationRecord = {
      operationId: ID.generate(),
      operationType: 'complete',
      timestamp: Timestamp.now(),
    };

    return new ThreadExecution({
      ...this.props,
      status: ThreadStatus.completed(),
      progress: 100,
      completedAt: Timestamp.now(),
      lastActivityAt: Timestamp.now(),
      operationHistory: [...this.props.operationHistory, operationRecord],
    });
  }

  /**
   * 失败执行（创建新实例）
   * @param errorMessage 错误信息
   * @returns 新的线程执行值对象
   */
  public fail(errorMessage: string): ThreadExecution {
    if (!this.props.status.isActive()) {
      throw new ValidationError('只能设置活跃状态的线程为失败状态');
    }

    const operationRecord: OperationRecord = {
      operationId: ID.generate(),
      operationType: 'fail',
      timestamp: Timestamp.now(),
      reason: errorMessage,
    };

    return new ThreadExecution({
      ...this.props,
      status: ThreadStatus.failed(),
      errorMessage,
      completedAt: Timestamp.now(),
      lastActivityAt: Timestamp.now(),
      operationHistory: [...this.props.operationHistory, operationRecord],
    });
  }

  /**
   * 取消执行（创建新实例）
   * @returns 新的线程执行值对象
   */
  public cancel(): ThreadExecution {
    if (this.props.status.isTerminal()) {
      throw new ValidationError('无法取消已终止状态的线程');
    }

    const operationRecord: OperationRecord = {
      operationId: ID.generate(),
      operationType: 'cancel',
      timestamp: Timestamp.now(),
    };

    return new ThreadExecution({
      ...this.props,
      status: ThreadStatus.cancelled(),
      completedAt: Timestamp.now(),
      lastActivityAt: Timestamp.now(),
      operationHistory: [...this.props.operationHistory, operationRecord],
    });
  }

  /**
   * 更新执行进度（创建新实例）
   * @param progress 新进度（0-100）
   * @param currentStep 当前步骤
   * @returns 新的线程执行值对象
   */
  public updateProgress(progress: number, currentStep?: string): ThreadExecution {
    if (progress < 0 || progress > 100) {
      throw new ValidationError('进度必须在0-100之间');
    }

    if (!this.props.status.isActive()) {
      throw new ValidationError('只能更新活跃状态的线程进度');
    }

    return new ThreadExecution({
      ...this.props,
      progress,
      currentStep,
      lastActivityAt: Timestamp.now(),
    });
  }

  /**
   * 增加重试次数（创建新实例）
   * @returns 新的线程执行值对象
   */
  public incrementRetryCount(): ThreadExecution {
    return new ThreadExecution({
      ...this.props,
      retryCount: this.props.retryCount + 1,
      lastActivityAt: Timestamp.now(),
    });
  }

  /**
   * 更新最后活动时间（创建新实例）
   * @returns 新的线程执行值对象
   */
  public updateLastActivity(): ThreadExecution {
    return new ThreadExecution({
      ...this.props,
      lastActivityAt: Timestamp.now(),
    });
  }

  /**
   * 添加节点执行状态
   * @param nodeExecution 节点执行状态
   * @returns 新的线程执行值对象
   */
  public addNodeExecution(nodeExecution: NodeExecution): ThreadExecution {
    const newNodeExecutions = new Map(this.props.nodeExecutions);
    newNodeExecutions.set(nodeExecution.nodeId.toString(), nodeExecution);

    return new ThreadExecution({
      ...this.props,
      nodeExecutions: newNodeExecutions,
      lastActivityAt: Timestamp.now(),
    });
  }

  /**
   * 更新节点执行状态
   * @param nodeExecution 节点执行状态
   * @returns 新的线程执行值对象
   */
  public updateNodeExecution(nodeExecution: NodeExecution): ThreadExecution {
    if (!this.props.nodeExecutions.has(nodeExecution.nodeId.toString())) {
      throw new ValidationError(`节点执行状态不存在: ${nodeExecution.nodeId.toString()}`);
    }

    const newNodeExecutions = new Map(this.props.nodeExecutions);
    newNodeExecutions.set(nodeExecution.nodeId.toString(), nodeExecution);

    return new ThreadExecution({
      ...this.props,
      nodeExecutions: newNodeExecutions,
      lastActivityAt: Timestamp.now(),
    });
  }

  /**
   * 更新执行上下文
   * @param context 新的执行上下文
   * @returns 新的线程执行值对象
   */
  public updateContext(context: ThreadExecutionContext): ThreadExecution {
    return new ThreadExecution({
      ...this.props,
      context,
      lastActivityAt: Timestamp.now(),
    });
  }

  /**
   * 添加Fork信息
   * @param forkInfo Fork信息
   * @returns 新的线程执行值对象
   */
  public addForkInfo(forkInfo: ForkInfo): ThreadExecution {
    const operationRecord: OperationRecord = {
      operationId: ID.generate(),
      operationType: 'fork',
      timestamp: Timestamp.now(),
      metadata: { forkId: forkInfo.forkId.toString() },
    };

    return new ThreadExecution({
      ...this.props,
      forkInfo,
      operationHistory: [...this.props.operationHistory, operationRecord],
      lastActivityAt: Timestamp.now(),
    });
  }

  /**
   * 添加Copy信息
   * @param copyInfo Copy信息
   * @returns 新的线程执行值对象
   */
  public addCopyInfo(copyInfo: CopyInfo): ThreadExecution {
    const operationRecord: OperationRecord = {
      operationId: ID.generate(),
      operationType: 'copy',
      timestamp: Timestamp.now(),
      metadata: { copyId: copyInfo.copyId.toString() },
    };

    return new ThreadExecution({
      ...this.props,
      copyInfo,
      operationHistory: [...this.props.operationHistory, operationRecord],
      lastActivityAt: Timestamp.now(),
    });
  }

  /**
   * 更新工作流状态
   * @param workflowState 新的工作流状态
   * @returns 新的线程执行实例
   */
  public updateWorkflowState(workflowState: ThreadWorkflowState): ThreadExecution {
    return new ThreadExecution({
      ...this.props,
      workflowState,
      lastActivityAt: Timestamp.now(),
    });
  }

  /**
   * 设置工作流数据
   * @param key 键名
   * @param value 键值
   * @returns 新的线程执行实例
   */
  public setWorkflowData(key: string, value: any): ThreadExecution {
    const currentState = this.props.workflowState;
    if (!currentState) {
      throw new ValidationError('工作流状态不存在');
    }

    // 使用展开运算符更新状态
    const newStateProps = {
      ...currentState.toProps(),
      data: { ...currentState.data, [key]: value },
      updatedAt: Timestamp.now()
    };
    const newState = ThreadWorkflowState.fromProps(newStateProps);
    return this.updateWorkflowState(newState);
  }

  /**
   * 更新当前节点
   * @param nodeId 节点ID
   * @returns 新的线程执行实例
   */
  public updateCurrentNode(nodeId: ID): ThreadExecution {
    const currentState = this.props.workflowState;
    if (!currentState) {
      throw new ValidationError('工作流状态不存在');
    }

    // 使用展开运算符更新状态
    const newStateProps = {
      ...currentState.toProps(),
      currentNodeId: nodeId,
      updatedAt: Timestamp.now()
    };
    const newState = ThreadWorkflowState.fromProps(newStateProps);
    return this.updateWorkflowState(newState);
  }

  /**
   * 添加执行历史记录
   * @param history 执行历史
   * @returns 新的线程执行实例
   */
  public addExecutionHistory(history: ExecutionHistory): ThreadExecution {
    const currentState = this.props.workflowState;
    if (!currentState) {
      throw new ValidationError('工作流状态不存在');
    }

    // 使用展开运算符更新状态
    const newStateProps = {
      ...currentState.toProps(),
      history: [...currentState.history, history],
      updatedAt: Timestamp.now()
    };
    const newState = ThreadWorkflowState.fromProps(newStateProps);
    return this.updateWorkflowState(newState);
  }

  /**
   * 获取工作流状态
   * @returns 工作流状态
   */
  public getWorkflowState(): ThreadWorkflowState | undefined {
    return this.props.workflowState;
  }

  /**
   * 验证线程执行的有效性
   */
  public validate(): void {
    if (!this.props.threadId) {
      throw new ValidationError('线程ID不能为空');
    }

    if (!this.props.status) {
      throw new ValidationError('线程状态不能为空');
    }

    if (this.props.progress < 0 || this.props.progress > 100) {
      throw new ValidationError('进度必须在0-100之间');
    }

    if (this.props.retryCount < 0) {
      throw new ValidationError('重试次数不能为负数');
    }

    // 验证时间逻辑
    if (this.props.startedAt && this.props.completedAt) {
      if (this.props.startedAt.isAfter(this.props.completedAt)) {
        throw new ValidationError('开始时间不能晚于完成时间');
      }
    }

    // 验证状态与时间的一致性
    if (this.props.status.isRunning() && !this.props.startedAt) {
      throw new ValidationError('运行中的线程必须有开始时间');
    }

    if (this.props.status.isTerminal() && !this.props.completedAt) {
      throw new ValidationError('已终止的线程必须有完成时间');
    }

    if (this.props.status.isTerminal() && this.props.progress < 100) {
      throw new ValidationError('已终止的线程进度必须为100');
    }
  }
}
