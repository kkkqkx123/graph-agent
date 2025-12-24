import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';
import { ThreadStatus } from '../value-objects/thread-status';
import { ThreadPriority } from '../value-objects/thread-priority';
import { ThreadDefinition } from '../value-objects/thread-definition';
import { ThreadExecution } from '../value-objects/thread-execution';
import { ThreadCreatedEvent } from '../events/thread-created-event';
import { ThreadStatusChangedEvent } from '../events/thread-status-changed-event';
import { Workflow } from '../../workflow/entities/workflow';
import { IExecutionContext } from '../../workflow/execution/execution-context.interface';
import { ExecutionResult, ExecutionStatus } from '../../workflow/execution/types';
import { ExecutionStep } from '../../workflow/services/workflow-execution-service';

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
  readonly executionContext: IExecutionContext;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly isDeleted: boolean;
}

/**
 * Thread实体
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
  private workflow?: Workflow;

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

    // 创建线程执行值对象
    const execution = ThreadExecution.create(threadId);

    // 创建执行上下文
    const executionContext: IExecutionContext = {
      executionId: threadId,
      workflowId,
      data: {},
      workflowState: {} as any,
      executionHistory: [],
      metadata: metadata || {},
      startTime: now,
      status: 'pending',
      getVariable: (path: string) => {
        const keys = path.split('.');
        let value: any = executionContext.data;
        for (const key of keys) {
          value = value?.[key];
        }
        return value;
      },
      setVariable: (path: string, value: any) => {
        const keys = path.split('.');
        let current: any = executionContext.data;
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          if (key && current[key] === undefined) {
            current[key] = {};
          }
          if (key) {
            current = current[key];
          }
        }
        const lastKey = keys[keys.length - 1];
        if (lastKey) {
          current[lastKey] = value;
        }
      },
      getAllVariables: () => executionContext.data,
      getAllMetadata: () => executionContext.metadata,
      getInput: () => executionContext.data,
      getExecutedNodes: () => [],
      getNodeResult: (nodeId: string) => undefined,
      getElapsedTime: () => 0,
      getWorkflow: () => undefined
    };

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
      executionContext,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };

    const thread = new Thread(props);

    // 添加线程创建事件
    thread.addDomainEvent(new ThreadCreatedEvent(
      threadId,
      sessionId,
      workflowId,
      threadPriority.getNumericValue(),
      title,
      description,
      metadata
    ));

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
   * 设置工作流
   * @param workflow 工作流
   */
  public setWorkflow(workflow: Workflow): void {
    if (this.props.status.isRunning()) {
      throw new DomainError('线程正在运行时不能更改工作流');
    }

    this.workflow = workflow;
  }

  /**
   * 串行执行工作流
   * @param inputData 输入数据
   * @returns 执行结果
   */
  public async executeSequentially(inputData: unknown): Promise<ExecutionResult> {
    if (!this.workflow) {
      throw new DomainError('线程未关联工作流');
    }

    try {
      // 1. 初始化执行状态
      this.start();
      this.prepareExecutionEnvironment(inputData);

      // 2. 验证执行条件
      this.validateExecutionConditions();

      // 3. 获取执行步骤
      const steps = this.getExecutionSteps();

      // 4. 串行执行每个步骤
      for (const step of steps) {
        await this.executeStep(step);

        // 5. 检查执行条件
        if (this.shouldPause()) {
          await this.pauseExecution();
          break;
        }

        if (this.shouldTerminate()) {
          await this.terminateExecution();
          break;
        }
      }

      // 6. 完成执行
      const result = this.completeExecution();
      this.complete();

      return result;

    } catch (error) {
      const result = this.handleExecutionError(error as Error);
      this.fail((error as Error).message);
      return result;
    }
  }

  /**
   * 执行单个步骤
   * @param step 执行步骤
   */
  private async executeStep(step: ExecutionStep): Promise<void> {
    // 更新当前步骤
    const stepId = typeof step === 'string' ? step : (step as any).stepId;
    this.updateProgress(this.props.execution.progress, stepId);

    // 执行步骤
    const result = await step.execute(this.props.executionContext);

    // 记录执行历史
    this.props.executionContext.executionHistory.push({
      nodeId: ID.fromString(stepId),
      timestamp: Timestamp.now(),
      result,
      status: 'success'
    });
  }

  /**
   * 获取执行步骤
   */
  private getExecutionSteps(): ExecutionStep[] {
    if (!this.workflow) {
      throw new DomainError('线程未关联工作流');
    }

    return this.workflow.getExecutionSteps();
  }

  /**
   * 验证执行条件
   */
  private validateExecutionConditions(): void {
    if (!this.props.status.canExecute()) {
      throw new DomainError(`线程当前状态不允许执行: ${this.props.status}`);
    }

    if (!this.workflow) {
      throw new DomainError('线程未关联工作流');
    }

    if (!this.workflow.status.canExecute()) {
      throw new DomainError(`工作流当前状态不允许执行: ${this.workflow.status}`);
    }
  }

  /**
   * 准备执行环境
   * @param inputData 输入数据
   */
  private prepareExecutionEnvironment(inputData: unknown): void {
    // 设置输入数据
    this.props.executionContext.data = {
      ...this.props.executionContext.data,
      input: inputData
    };

    // 初始化执行历史
    this.props.executionContext.executionHistory = [];
  }

  /**
   * 检查是否应该暂停
   */
  private shouldPause(): boolean {
    // 检查暂停条件
    return this.props.status.isPaused();
  }

  /**
   * 检查是否应该终止
   */
  private shouldTerminate(): boolean {
    // 检查终止条件
    return this.props.status.isCancelled();
  }

  /**
   * 暂停执行
   */
  private async pauseExecution(): Promise<void> {
    this.pause();
  }

  /**
   * 终止执行
   */
  private async terminateExecution(): Promise<void> {
    this.cancel();
  }

  /**
   * 完成执行
   */
  private completeExecution(): ExecutionResult {
    return {
      executionId: this.props.executionContext.executionId,
      status: ExecutionStatus.COMPLETED,
      data: this.props.executionContext.data,
      statistics: {
        totalTime: this.props.executionContext.getElapsedTime(),
        nodeExecutionTime: this.props.executionContext.getElapsedTime(),
        successfulNodes: this.props.executionContext.executionHistory.length,
        failedNodes: 0,
        skippedNodes: 0,
        retries: 0
      }
    };
  }

  /**
   * 处理执行错误
   * @param error 错误
   */
  private handleExecutionError(error: Error): ExecutionResult {
    return {
      executionId: this.props.executionContext.executionId,
      status: ExecutionStatus.FAILED,
      error,
      data: this.props.executionContext.data,
      statistics: {
        totalTime: this.props.executionContext.getElapsedTime(),
        nodeExecutionTime: this.props.executionContext.getElapsedTime(),
        successfulNodes: this.props.executionContext.executionHistory.length,
        failedNodes: 1,
        skippedNodes: 0,
        retries: 0
      }
    };
  }

  // 以下是原有的状态管理方法，保持不变

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
   * 获取执行上下文
   * @returns 执行上下文
   */
  public get executionContext(): IExecutionContext {
    return this.props.executionContext;
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
   * 更新线程标题
   * @param title 新标题
   */
  public updateTitle(title: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的线程');
    }

    if (!this.props.status.canOperate()) {
      throw new DomainError('无法更新非活跃状态的线程');
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
      throw new DomainError('无法更新已删除的线程');
    }

    if (!this.props.status.canOperate()) {
      throw new DomainError('无法更新非活跃状态的线程');
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
      throw new DomainError('无法更新已删除线程的优先级');
    }

    if (!this.props.status.canOperate()) {
      throw new DomainError('无法更新非活跃状态线程的优先级');
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
      throw new DomainError('无法更新已删除线程的元数据');
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
   * 启动线程
   * @param startedBy 启动者ID
   */
  public start(startedBy?: ID): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法启动已删除的线程');
    }

    if (!this.props.status.isPending()) {
      throw new DomainError('只能启动待执行状态的线程');
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

    // 添加状态变更事件
    this.addDomainEvent(new ThreadStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      startedBy,
      '线程启动'
    ));
  }

  /**
   * 暂停线程
   * @param pausedBy 暂停者ID
   * @param reason 暂停原因
   */
  public pause(pausedBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法暂停已删除的线程');
    }

    if (!this.props.status.isRunning()) {
      throw new DomainError('只能暂停运行中的线程');
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

    // 添加状态变更事件
    this.addDomainEvent(new ThreadStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      pausedBy,
      reason
    ));
  }

  /**
   * 恢复线程
   * @param resumedBy 恢复者ID
   * @param reason 恢复原因
   */
  public resume(resumedBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法恢复已删除的线程');
    }

    if (!this.props.status.isPaused()) {
      throw new DomainError('只能恢复暂停状态的线程');
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

    // 添加状态变更事件
    this.addDomainEvent(new ThreadStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      resumedBy,
      reason
    ));
  }

  /**
   * 完成线程
   * @param completedBy 完成者ID
   * @param reason 完成原因
   */
  public complete(completedBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法完成已删除的线程');
    }

    if (!this.props.status.isActive()) {
      throw new DomainError('只能完成活跃状态的线程');
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

    // 添加状态变更事件
    this.addDomainEvent(new ThreadStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      completedBy,
      reason
    ));
  }

  /**
   * 失败线程
   * @param errorMessage 错误信息
   * @param failedBy 失败者ID
   * @param reason 失败原因
   */
  public fail(errorMessage: string, failedBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法设置已删除线程为失败状态');
    }

    if (!this.props.status.isActive()) {
      throw new DomainError('只能设置活跃状态的线程为失败状态');
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

    // 添加状态变更事件
    this.addDomainEvent(new ThreadStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      failedBy,
      reason,
      errorMessage
    ));
  }

  /**
   * 取消线程
   * @param cancelledBy 取消者ID
   * @param reason 取消原因
   */
  public cancel(cancelledBy?: ID, reason?: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法取消已删除的线程');
    }

    if (this.props.status.isTerminal()) {
      throw new DomainError('无法取消已终止状态的线程');
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

    // 添加状态变更事件
    this.addDomainEvent(new ThreadStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus,
      cancelledBy,
      reason
    ));
  }

  /**
   * 更新执行进度
   * @param progress 进度（0-100）
   * @param currentStep 当前步骤
   */
  public updateProgress(progress: number, currentStep?: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除线程的进度');
    }

    if (!this.props.status.isActive()) {
      throw new DomainError('只能更新活跃状态的线程进度');
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
}