import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version, Metadata, DeletionStatus } from '../../common/value-objects';
import { ThreadPriority } from '../value-objects';
import { ThreadStatusValue } from '../value-objects/thread-status';
import { State } from '../../state/entities/state';
import { StateEntityType } from '../../state/value-objects/state-entity-type';
import { ExecutionContext, ExecutionConfig } from '../value-objects/execution-context';

/**
 * Thread实体属性接口
 */
export interface ThreadProps {
  readonly id: ID;
  readonly sessionId: ID;
  readonly workflowId: ID;
  readonly priority: ThreadPriority;
  readonly title?: string;
  readonly description?: string;
  readonly metadata: Metadata;
  readonly deletionStatus: DeletionStatus;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly state: State;
  readonly executionContext: ExecutionContext;
  readonly executionConfig: ExecutionConfig;
}

/**
 * Thread聚合根
 *
 * 线程聚合根，专注于串行执行流程协调
 * 职责：
 * - 串行执行流程协调
 * - 单线程内的状态管理（通过State实体）
 * - 执行步骤的顺序控制
 * - 错误处理和恢复
 */
export class Thread extends Entity {
  private readonly props: ThreadProps;

  /**
   * 构造函数
   * @param props 线程属性
   */
  private constructor(props: ThreadProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新线程
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param priority 线程优先级
   * @param title 线程标题
   * @param description 线程描述
   * @param metadata 元数据
   * @returns 新线程实例
   */
  public static create(
    sessionId: ID,
    workflowId: ID,
    priority?: ThreadPriority,
    title?: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): Thread {
    const now = Timestamp.now();
    const threadId = ID.generate();
    const threadPriority = priority || ThreadPriority.normal();

    // 创建统一状态管理
    const state = State.create(
      threadId,
      StateEntityType.thread(),
      {
        status: 'pending',
        execution: {
          progress: 0,
          currentStep: undefined,
          startedAt: undefined,
          completedAt: undefined,
          errorMessage: undefined,
          retryCount: 0,
          lastActivityAt: now.toISOString(),
        },
        context: {
          variables: {},
          nodeContexts: {},
          promptContext: {},
        },
      },
      {
        workflowId: workflowId.value,
        sessionId: sessionId.value,
      }
    );

    // 创建执行上下文
    const executionContext = ExecutionContext.create();

    // 创建执行配置
    const executionConfig: ExecutionConfig = {};

    const props: ThreadProps = {
      id: threadId,
      sessionId,
      workflowId,
      priority: threadPriority,
      title,
      description,
      metadata: Metadata.create(metadata || {}),
      deletionStatus: DeletionStatus.active(),
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      state,
      executionContext,
      executionConfig,
    };

    const thread = new Thread(props);

    return thread;
  }

  /**
   * 从已有属性重建线程
   * @param props 线程属性
   * @returns 线程实例
   */
  public static fromProps(props: ThreadProps): Thread {
    return new Thread(props);
  }

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  public get threadId(): ID {
    return this.props.id;
  }

  /**
   * 获取会话ID
   * @returns 会话ID
   */
  public get sessionId(): ID {
    return this.props.sessionId;
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get workflowId(): ID {
    return this.props.workflowId;
  }

  /**
   * 获取线程状态值
   * @returns 状态值
   */
  public get status(): ThreadStatusValue {
    return this.props.state.data.getValue('status') as ThreadStatusValue;
  }

  /**
   * 获取线程优先级
   * @returns 线程优先级
   */
  public get priority(): ThreadPriority {
    return this.props.priority;
  }

  /**
   * 获取线程标题
   * @returns 线程标题
   */
  public get title(): string | undefined {
    return this.props.title;
  }

  /**
   * 获取线程描述
   * @returns 线程描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Metadata {
    return this.props.metadata;
  }

  /**
   * 获取执行信息
   * @returns 执行信息对象
   */
  public get execution(): Record<string, unknown> {
    return this.props.state.data.getValue('execution') as Record<string, unknown>;
  }

  /**
   * 获取开始时间
   * @returns 开始时间
   */
  public get startedAt(): Timestamp | undefined {
    const startedAt = this.execution['startedAt'];
    return startedAt ? Timestamp.fromString(startedAt as string) : undefined;
  }

  /**
   * 获取完成时间
   * @returns 完成时间
   */
  public get completedAt(): Timestamp | undefined {
    const completedAt = this.execution['completedAt'];
    return completedAt ? Timestamp.fromString(completedAt as string) : undefined;
  }

  /**
   * 获取错误信息
   * @returns 错误信息
   */
  public get errorMessage(): string | undefined {
    return this.execution['errorMessage'] as string | undefined;
  }

  /**
   * 获取进度
   * @returns 进度（0-100）
   */
  public get progress(): number {
    return this.execution['progress'] as number;
  }

  /**
   * 获取当前步骤
   * @returns 当前步骤
   */
  public get currentStep(): string | undefined {
    return this.execution['currentStep'] as string | undefined;
  }

  /**
   * 获取重试次数
   * @returns 重试次数
   */
  public get retryCount(): number {
    return this.execution['retryCount'] as number;
  }

  /**
   * 获取状态实体
   * @returns 状态实体
   */
  public get state(): State {
    return this.props.state;
  }

  /**
   * 获取执行上下文
   * @returns 执行上下文
   */
  public get executionContext(): ExecutionContext {
    return this.props.executionContext;
  }

  /**
   * 获取执行配置
   * @returns 执行配置
   */
  public get executionConfig(): ExecutionConfig {
    return { ...this.props.executionConfig };
  }

  /**
   * 更新执行上下文
   * @param context 新的执行上下文
   * @returns 新线程实例
   */
  public updateExecutionContext(context: ExecutionContext): Thread {
    return new Thread({
      ...this.props,
      executionContext: context,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新执行配置
   * @param config 新的执行配置
   * @returns 新线程实例
   */
  public updateExecutionConfig(config: ExecutionConfig): Thread {
    return new Thread({
      ...this.props,
      executionConfig: { ...this.props.executionConfig, ...config },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 设置变量
   * @param key 变量名
   * @param value 变量值
   * @returns 新线程实例
   */
  public setVariable(key: string, value: unknown): Thread {
    const newContext = this.props.executionContext.setVariable(key, value);
    return this.updateExecutionContext(newContext);
  }

  /**
   * 获取变量
   * @param key 变量名
   * @returns 变量值
   */
  public getVariable(key: string): unknown | undefined {
    return this.props.executionContext.getVariable(key);
  }

  /**
   * 批量设置变量
   * @param variables 变量映射
   * @returns 新线程实例
   */
  public setVariables(variables: Map<string, unknown>): Thread {
    const newContext = this.props.executionContext.setVariables(variables);
    return this.updateExecutionContext(newContext);
  }

  /**
   * 删除变量
   * @param key 变量名
   * @returns 新线程实例
   */
  public deleteVariable(key: string): Thread {
    const newContext = this.props.executionContext.deleteVariable(key);
    return this.updateExecutionContext(newContext);
  }

  /**
   * 更新状态
   * @param updates 状态更新
   * @returns 新线程实例
   */
  public updateState(updates: Record<string, unknown>): Thread {
    const newState = this.props.state.updateData(updates);

    return new Thread({
      ...this.props,
      state: newState,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新线程标题
   * @param title 新标题
   * @returns 新线程实例
   */
  public updateTitle(title: string): Thread {
    this.props.deletionStatus.ensureActive();

    return new Thread({
      ...this.props,
      title,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新线程描述
   * @param description 新描述
   * @returns 新线程实例
   */
  public updateDescription(description: string): Thread {
    this.props.deletionStatus.ensureActive();

    return new Thread({
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新线程优先级
   * @param priority 新优先级
   * @returns 新线程实例
   */
  public updatePriority(priority: ThreadPriority): Thread {
    this.props.deletionStatus.ensureActive();

    return new Thread({
      ...this.props,
      priority,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @returns 新线程实例
   */
  public updateMetadata(metadata: Record<string, unknown>): Thread {
    this.props.deletionStatus.ensureActive();

    return new Thread({
      ...this.props,
      metadata: Metadata.create(metadata),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 标记线程为已删除
   * @returns 新线程实例
   */
  public markAsDeleted(): Thread {
    if (this.props.deletionStatus.isDeleted()) {
      return this;
    }

    return new Thread({
      ...this.props,
      deletionStatus: this.props.deletionStatus.markAsDeleted(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 检查线程是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.deletionStatus.isDeleted();
  }

  /**
   * 检查线程是否活跃
   * @returns 是否活跃
   */
  public isActive(): boolean {
    const status = this.status;
    return status === 'running' || status === 'pending';
  }

  /**
   * 检查状态是否为已完成
   * @returns 是否已完成
   */
  public isCompleted(): boolean {
    return this.status === 'completed';
  }

  /**
   * 检查状态是否为失败
   * @returns 是否失败
   */
  public isFailed(): boolean {
    return this.status === 'failed';
  }

  /**
   * 检查状态是否为已取消
   * @returns 是否已取消
   */
  public isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  /**
   * 检查状态是否为待执行
   * @returns 是否待执行
   */
  public isPending(): boolean {
    return this.status === ThreadStatusValue.PENDING;
  }

  /**
   * 检查状态是否为运行中
   * @returns 是否运行中
   */
  public isRunning(): boolean {
    return this.status === ThreadStatusValue.RUNNING;
  }

  /**
   * 检查状态是否为暂停
   * @returns 是否暂停
   */
  public isPaused(): boolean {
    return this.status === ThreadStatusValue.PAUSED;
  }

  /**
   * 检查状态是否为终止状态
   * @returns 是否终止
   */
  public isTerminal(): boolean {
    return (
      this.status === ThreadStatusValue.COMPLETED ||
      this.status === ThreadStatusValue.FAILED ||
      this.status === ThreadStatusValue.CANCELLED
    );
  }

  /**
   * 启动线程
   * @returns 新线程实例
   */
  public start(): Thread {
    if (this.status !== ThreadStatusValue.PENDING) {
      throw new Error(`只能启动待执行状态的线程，当前状态: ${this.status}`);
    }

    const now = Timestamp.now();
    const newExecution = {
      ...this.execution,
      startedAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
    };

    const newState = this.props.state.updateData({
      status: ThreadStatusValue.RUNNING,
      execution: newExecution,
    });

    return new Thread({
      ...this.props,
      state: newState,
      updatedAt: now,
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 完成线程
   * @returns 新线程实例
   */
  public complete(): Thread {
    if (!this.isActive()) {
      throw new Error(`只能完成活跃状态的线程，当前状态: ${this.status}`);
    }

    const now = Timestamp.now();
    const newExecution = {
      ...this.execution,
      progress: 100,
      completedAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
    };

    const newState = this.props.state.updateData({
      status: ThreadStatusValue.COMPLETED,
      execution: newExecution,
    });

    return new Thread({
      ...this.props,
      state: newState,
      updatedAt: now,
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 失败线程
   * @param errorMessage 错误信息
   * @returns 新线程实例
   */
  public fail(errorMessage: string): Thread {
    if (!this.isActive()) {
      throw new Error(`只能标记活跃状态的线程为失败，当前状态: ${this.status}`);
    }

    const now = Timestamp.now();
    const newExecution = {
      ...this.execution,
      errorMessage,
      lastActivityAt: now.toISOString(),
    };

    const newState = this.props.state.updateData({
      status: ThreadStatusValue.FAILED,
      execution: newExecution,
    });

    return new Thread({
      ...this.props,
      state: newState,
      updatedAt: now,
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 暂停线程
   * @returns 新线程实例
   */
  public pause(): Thread {
    if (this.status !== ThreadStatusValue.RUNNING) {
      throw new Error(`只能暂停运行中的线程，当前状态: ${this.status}`);
    }

    const now = Timestamp.now();
    const newExecution = {
      ...this.execution,
      lastActivityAt: now.toISOString(),
    };

    const newState = this.props.state.updateData({
      status: ThreadStatusValue.PAUSED,
      execution: newExecution,
    });

    return new Thread({
      ...this.props,
      state: newState,
      updatedAt: now,
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 恢复线程
   * @returns 新线程实例
   */
  public resume(): Thread {
    if (this.status !== ThreadStatusValue.PAUSED && this.status !== ThreadStatusValue.FAILED) {
      throw new Error(`只能恢复暂停或失败状态的线程，当前状态: ${this.status}`);
    }

    const now = Timestamp.now();
    const newExecution = {
      ...this.execution,
      lastActivityAt: now.toISOString(),
    };

    const newState = this.props.state.updateData({
      status: ThreadStatusValue.RUNNING,
      execution: newExecution,
    });

    return new Thread({
      ...this.props,
      state: newState,
      updatedAt: now,
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 取消线程
   * @param userId 用户ID
   * @param reason 取消原因
   * @returns 新线程实例
   */
  public cancel(userId?: ID, reason?: string): Thread {
    if (this.isTerminal()) {
      throw new Error(`无法取消已终止状态的线程，当前状态: ${this.status}`);
    }

    const now = Timestamp.now();
    const newExecution = {
      ...this.execution,
      errorMessage: reason || '线程已取消',
      lastActivityAt: now.toISOString(),
    };

    const newState = this.props.state.updateData({
      status: ThreadStatusValue.CANCELLED,
      execution: newExecution,
    });

    return new Thread({
      ...this.props,
      state: newState,
      updatedAt: now,
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新进度
   * @param progress 进度（0-100）
   * @param currentStep 当前步骤
   * @returns 新线程实例
   */
  public updateProgress(progress: number, currentStep?: string): Thread {
    if (!this.isActive()) {
      throw new Error(`只能更新活跃状态的线程进度，当前状态: ${this.status}`);
    }

    if (progress < 0 || progress > 100) {
      throw new Error(`进度值必须在0-100之间，当前值: ${progress}`);
    }

    const now = Timestamp.now();
    const newExecution = {
      ...this.execution,
      progress,
      currentStep,
      lastActivityAt: now.toISOString(),
    };

    const newState = this.props.state.updateData({
      execution: newExecution,
    });

    return new Thread({
      ...this.props,
      state: newState,
      updatedAt: now,
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `thread:${this.props.id.toString()}`;
  }
}