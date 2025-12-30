import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version } from '../../common/value-objects';
import { ThreadStatus, ThreadPriority, ThreadDefinition, ThreadExecution, ExecutionContext } from '../value-objects';
import { PromptContext } from '../../workflow/value-objects/context';
/**
 * Thread实体属性接口
 */
export interface ThreadProps {
  readonly id: ID;
  readonly sessionId: ID;
  readonly workflowId: ID;
  readonly status: ThreadStatus;
  readonly priority: ThreadPriority;
  readonly title?: string;
  readonly description?: string;
  readonly metadata: Record<string, unknown>;
  readonly definition: ThreadDefinition;
  readonly execution: ThreadExecution;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly isDeleted: boolean;
}

/**
 * Thread聚合根
 * 
 * 线程聚合根，专注于串行执行流程协调
 * 职责：
 * - 串行执行流程协调
 * - 单线程内的状态管理
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
    const threadStatus = ThreadStatus.pending();

    // 创建线程定义值对象
    const definition = ThreadDefinition.create(
      threadId,
      sessionId,
      workflowId,
      threadPriority,
      title,
      description,
      metadata
    );

    // 创建执行上下文
    const promptContext = PromptContext.create('');
    const context = ExecutionContext.create(promptContext);

    // 创建线程执行值对象
    const execution = ThreadExecution.create(threadId, context);

    const props: ThreadProps = {
      id: threadId,
      sessionId,
      workflowId,
      status: threadStatus,
      priority: threadPriority,
      title,
      description,
      metadata: metadata || {},
      definition,
      execution,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
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

  // 状态管理方法

  /**
   * 启动线程
   * @param startedBy 启动者ID
   */
  public start(startedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new Error('无法启动已删除的线程');
    }

    if (!this.props.status.isPending()) {
      throw new Error('只能启动待执行状态的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.running();
    const newExecution = this.props.execution.start();

    const newProps = {
      ...this.props,
      status: newStatus,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 暂停线程
   * @param pausedBy 暂停者ID
   * @param reason 暂停原因
   */
  public pause(pausedBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法暂停已删除的线程');
    }

    if (!this.props.status.isRunning()) {
      throw new Error('只能暂停运行中的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.paused();
    const newExecution = this.props.execution.pause();

    const newProps = {
      ...this.props,
      status: newStatus,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 恢复线程
   * @param resumedBy 恢复者ID
   * @param reason 恢复原因
   */
  public resume(resumedBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法恢复已删除的线程');
    }

    if (!this.props.status.isPaused()) {
      throw new Error('只能恢复暂停状态的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.running();
    const newExecution = this.props.execution.resume();

    const newProps = {
      ...this.props,
      status: newStatus,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 完成线程
   * @param completedBy 完成者ID
   * @param reason 完成原因
   */
  public complete(completedBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法完成已删除的线程');
    }

    if (!this.props.status.isActive()) {
      throw new Error('只能完成活跃状态的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.completed();
    const newExecution = this.props.execution.complete();

    const newProps = {
      ...this.props,
      status: newStatus,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 失败线程
   * @param errorMessage 错误信息
   * @param failedBy 失败者ID
   * @param reason 失败原因
   */
  public fail(errorMessage: string, failedBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法设置已删除线程为失败状态');
    }

    if (!this.props.status.isActive()) {
      throw new Error('只能设置活跃状态的线程为失败状态');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.failed();
    const newExecution = this.props.execution.fail(errorMessage);

    const newProps = {
      ...this.props,
      status: newStatus,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 取消线程
   * @param cancelledBy 取消者ID
   * @param reason 取消原因
   */
  public cancel(cancelledBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法取消已删除的线程');
    }

    if (this.props.status.isTerminal()) {
      throw new Error('无法取消已终止状态的线程');
    }

    const oldStatus = this.props.status;
    const newStatus = ThreadStatus.cancelled();
    const newExecution = this.props.execution.cancel();

    const newProps = {
      ...this.props,
      status: newStatus,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新线程标题
   * @param title 新标题
   */
  public updateTitle(title: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除的线程');
    }

    if (!this.props.status.canOperate()) {
      throw new Error('无法更新非活跃状态的线程');
    }

    const newDefinition = this.props.definition.updateTitle(title);
    const newProps = {
      ...this.props,
      title,
      definition: newDefinition,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新线程描述
   * @param description 新描述
   */
  public updateDescription(description: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除的线程');
    }

    if (!this.props.status.canOperate()) {
      throw new Error('无法更新非活跃状态的线程');
    }

    const newDefinition = this.props.definition.updateDescription(description);
    const newProps = {
      ...this.props,
      description,
      definition: newDefinition,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新线程优先级
   * @param priority 新优先级
   */
  public updatePriority(priority: ThreadPriority): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除线程的优先级');
    }

    if (!this.props.status.canOperate()) {
      throw new Error('无法更新非活跃状态线程的优先级');
    }

    const newDefinition = this.props.definition.updatePriority(priority);
    const newProps = {
      ...this.props,
      priority,
      definition: newDefinition,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   */
  public updateMetadata(metadata: Record<string, unknown>): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除线程的元数据');
    }

    const newDefinition = this.props.definition.updateMetadata(metadata);
    const newProps = {
      ...this.props,
      metadata: { ...metadata },
      definition: newDefinition,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新执行进度
   * @param progress 进度（0-100）
   * @param currentStep 当前步骤
   */
  public updateProgress(progress: number, currentStep?: string): void {
    if (this.props.isDeleted) {
      throw new Error('无法更新已删除线程的进度');
    }

    if (!this.props.status.isActive()) {
      throw new Error('只能更新活跃状态的线程进度');
    }

    const newExecution = this.props.execution.updateProgress(progress, currentStep);

    const newProps = {
      ...this.props,
      execution: newExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 标记线程为已删除
   */
  public markAsDeleted(): void {
    if (this.props.isDeleted) {
      return;
    }

    const newProps = {
      ...this.props,
      isDeleted: true,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  // 属性访问器

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
   * 获取线程状态
   * @returns 线程状态
   */
  public get status(): ThreadStatus {
    return this.props.status;
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
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取线程定义
   * @returns 线程定义
   */
  public get definition(): ThreadDefinition {
    return this.props.definition;
  }

  /**
   * 获取线程执行
   * @returns 线程执行
   */
  public get execution(): ThreadExecution {
    return this.props.execution;
  }

  /**
   * 获取开始时间
   * @returns 开始时间
   */
  public get startedAt(): Timestamp | undefined {
    return this.props.execution.startedAt;
  }

  /**
   * 获取完成时间
   * @returns 完成时间
   */
  public get completedAt(): Timestamp | undefined {
    return this.props.execution.completedAt;
  }

  /**
   * 获取错误信息
   * @returns 错误信息
   */
  public get errorMessage(): string | undefined {
    return this.props.execution.errorMessage;
  }

  /**
   * 检查线程是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.isDeleted;
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `thread:${this.props.id.toString()}`;
  }

  // 状态管理方法

  /**
   * 从Checkpoint恢复Thread状态
   * @param checkpointData Checkpoint数据
   */
  public restoreFromCheckpoint(checkpointData: Record<string, unknown>): void {
    if (this.props.isDeleted) {
      throw new Error('无法恢复已删除的线程');
    }

    // 验证Checkpoint数据
    if (!checkpointData || Object.keys(checkpointData).length === 0) {
      throw new Error('Checkpoint数据不能为空');
    }

    // 验证Checkpoint是否属于当前Thread
    const checkpointThreadId = checkpointData['threadId'] as string;
    if (checkpointThreadId !== this.props.id.value) {
      throw new Error(`Checkpoint不属于当前线程: ${checkpointThreadId} !== ${this.props.id.value}`);
    }

    // 恢复ThreadExecution
    const executionData = checkpointData['execution'] as Record<string, unknown>;
    if (!executionData) {
      throw new Error('Checkpoint数据中缺少execution信息');
    }

    const restoredExecution = this.restoreExecution(executionData);

    // 恢复状态
    const statusValue = checkpointData['status'] as string;
    let restoredStatus: ThreadStatus;
    
    switch (statusValue) {
      case 'pending':
        restoredStatus = ThreadStatus.pending();
        break;
      case 'running':
        restoredStatus = ThreadStatus.running();
        break;
      case 'paused':
        restoredStatus = ThreadStatus.paused();
        break;
      case 'completed':
        restoredStatus = ThreadStatus.completed();
        break;
      case 'failed':
        restoredStatus = ThreadStatus.failed();
        break;
      case 'cancelled':
        restoredStatus = ThreadStatus.cancelled();
        break;
      default:
        throw new Error(`无效的线程状态: ${statusValue}`);
    }

    const newProps = {
      ...this.props,
      status: restoredStatus,
      execution: restoredExecution,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 获取Thread状态快照
   * @returns 状态快照数据
   */
  public getStateSnapshot(): Record<string, unknown> {
    return {
      threadId: this.props.id.value,
      sessionId: this.props.sessionId.value,
      workflowId: this.props.workflowId.value,
      status: this.props.status.value,
      priority: this.props.priority.value,
      title: this.props.title,
      description: this.props.description,
      metadata: this.props.metadata,
      execution: this.getExecutionSnapshot(),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString()
    };
  }

  /**
   * 恢复ThreadExecution
   * @param executionData 执行数据
   * @returns 恢复后的ThreadExecution
   */
  private restoreExecution(executionData: Record<string, unknown>): ThreadExecution {
    // 解析status
    const statusValue = executionData['status'] as string;
    let status: ThreadStatus;
    
    switch (statusValue) {
      case 'pending':
        status = ThreadStatus.pending();
        break;
      case 'running':
        status = ThreadStatus.running();
        break;
      case 'paused':
        status = ThreadStatus.paused();
        break;
      case 'completed':
        status = ThreadStatus.completed();
        break;
      case 'failed':
        status = ThreadStatus.failed();
        break;
      case 'cancelled':
        status = ThreadStatus.cancelled();
        break;
      default:
        throw new Error(`无效的执行状态: ${statusValue}`);
    }

    // 解析progress
    const progress = executionData['progress'] as number || 0;

    // 解析currentStep
    const currentStep = executionData['currentStep'] as string | undefined;

    // 解析startedAt
    const startedAtValue = executionData['startedAt'] as string | undefined;
    const startedAt = startedAtValue ? Timestamp.fromISOString(startedAtValue) : undefined;

    // 解析completedAt
    const completedAtValue = executionData['completedAt'] as string | undefined;
    const completedAt = completedAtValue ? Timestamp.fromISOString(completedAtValue) : undefined;

    // 解析errorMessage
    const errorMessage = executionData['errorMessage'] as string | undefined;

    // 解析retryCount
    const retryCount = executionData['retryCount'] as number || 0;

    // 解析lastActivityAt
    const lastActivityAtValue = executionData['lastActivityAt'] as string;
    const lastActivityAt = Timestamp.fromISOString(lastActivityAtValue);

    // 解析context
    const contextData = executionData['context'] as Record<string, unknown> || {};
    const promptContext = PromptContext.create(contextData['prompt'] as string || '');
    const context = ExecutionContext.create(promptContext);

    // 创建新的ThreadExecution
    return ThreadExecution.fromProps({
      threadId: this.props.id,
      status,
      progress,
      currentStep,
      startedAt,
      completedAt,
      errorMessage,
      retryCount,
      lastActivityAt,
      nodeExecutions: new Map(),
      context,
      operationHistory: []
    });
  }

  /**
   * 获取ThreadExecution快照
   * @returns 执行快照数据
   */
  private getExecutionSnapshot(): Record<string, unknown> {
    return {
      status: this.props.execution.status.value,
      progress: this.props.execution.progress,
      currentStep: this.props.execution.currentStep,
      startedAt: this.props.execution.startedAt?.toISOString(),
      completedAt: this.props.execution.completedAt?.toISOString(),
      errorMessage: this.props.execution.errorMessage,
      retryCount: this.props.execution.retryCount,
      lastActivityAt: this.props.execution.lastActivityAt.toISOString(),
      context: {
        prompt: this.props.execution.context.promptContext?.value || ''
      }
    };
  }
}