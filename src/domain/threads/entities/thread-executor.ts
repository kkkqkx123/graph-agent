import { AggregateRoot } from '../../common/base/aggregate-root';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';
import { ThreadStatus } from '../value-objects/thread-status';
import { ThreadPriority } from '../value-objects/thread-priority';
import { ThreadCreatedEvent } from '../events/thread-created-event';
import { ThreadStatusChangedEvent } from '../events/thread-status-changed-event';
import { Workflow } from '../../workflow/entities/workflow';
import { IExecutionContext, ExecutionResult, ExecutionStatus } from '../../workflow/execution';
import { ExecutionStep } from '../../workflow/services/executor';
import { AbstractBaseExecutor } from '../../../infrastructure/common/execution/base-executor';

/**
 * Thread执行器接口
 */
export interface ThreadExecutorProps {
  readonly id: ID;
  readonly sessionId: ID;
  readonly workflowId?: ID;
  readonly status: ThreadStatus;
  readonly priority: ThreadPriority;
  readonly title?: string;
  readonly description?: string;
  readonly executionContext: IExecutionContext;
  readonly executionState: ThreadExecutionState;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly createdBy?: ID;
  readonly updatedBy?: ID;
}

/**
 * Thread执行器实体
 *
 * 根据最终架构设计，ThreadExecutor专注于：
 * 1. 单线程串行执行
 * 2. 执行上下文管理
 * 3. 执行状态跟踪
 * 4. 错误处理和恢复
 *
 * 不再负责：
 * - 工作流定义和业务逻辑
 * - 多线程协调
 * - 资源分配和调度
 */
export class ThreadExecutor extends AggregateRoot {
  private readonly props: ThreadExecutorProps;
  private workflow?: Workflow;
  private deleted: boolean = false;

  /**
   * 构造函数
   * @param props Thread执行器属性
   */
  private constructor(props: ThreadExecutorProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 标记线程为已删除
   */
  public markAsDeleted(): void {
    this.deleted = true;
    this.update();
  }

  /**
   * 检查线程是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.deleted;
  }

  /**
   * 获取线程的业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return this.props.id.toString();
  }

  /**
   * 验证聚合的不变性
   */
  public validateInvariants(): void {
    // 验证线程的基本不变性
    if (!this.props.id) {
      throw new Error('Thread ID cannot be empty');
    }

    if (!this.props.sessionId) {
      throw new Error('Session ID cannot be empty');
    }

    if (!this.props.status) {
      throw new Error('Thread status cannot be empty');
    }

    // 不能在已删除状态下执行操作
    if (this.isDeleted()) {
      throw new Error('Cannot perform operations on a deleted thread');
    }
  }

  /**
   * 创建Thread执行器
   * @param sessionId 会话ID
   * @param workflow 工作流（可选）
   * @param priority 优先级
   * @param title 标题
   * @param description 描述
   * @param metadata 元数据
   * @param createdBy 创建者ID
   * @returns Thread执行器实例
   */
  public static create(
    sessionId: ID,
    workflow?: Workflow,
    priority?: ThreadPriority,
    title?: string,
    description?: string,
    metadata?: Record<string, unknown>,
    createdBy?: ID
  ): ThreadExecutor {
    const now = Timestamp.now();
    const threadId = ID.generate();
    const threadStatus = ThreadStatus.pending();
    const threadPriority = priority || ThreadPriority.normal();

    // 创建执行上下文
    const executionContext: IExecutionContext = {
      executionId: ID.generate(),
      workflowId: workflow?.workflowId || ID.generate(),
      data: {},
      workflowState: {} as any, // TODO: 实现WorkflowState
      executionHistory: [],
      metadata: {},
      startTime: now,
      status: 'pending',
      // 添加缺失的方法实现
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
      getWorkflow: () => workflow
    };

    // 创建执行状态
    const executionState = ThreadExecutionState.initial();

    const props: ThreadExecutorProps = {
      id: threadId,
      sessionId,
      workflowId: workflow?.workflowId,
      status: threadStatus,
      priority: threadPriority,
      title,
      description,
      executionContext,
      executionState,
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      createdBy
    } as ThreadExecutorProps;

    const threadExecutor = new ThreadExecutor(props);

    // 如果提供了工作流，设置关联
    if (workflow) {
      threadExecutor.workflow = workflow;
    }

    // 添加Thread创建事件
    threadExecutor.addDomainEvent(new ThreadCreatedEvent(
      threadId,
      sessionId,
      workflow?.workflowId,
      threadPriority.getNumericValue(),
      title,
      description,
      metadata
    ));

    return threadExecutor;
  }

  /**
   * 从已有属性重建Thread执行器
   * @param props Thread执行器属性
   * @returns Thread执行器实例
   */
  public static fromProps(props: ThreadExecutorProps): ThreadExecutor {
    return new ThreadExecutor(props);
  }

  /**
   * 串行执行工作流
   * @param inputData 输入数据
   * @returns 执行结果
   */
  public async executeSequentially(inputData: unknown): Promise<ExecutionResult> {
    try {
      // 1. 初始化执行状态
      this.props.executionState.start();
      this.updateStatus(ThreadStatus.running());

      // 2. 验证执行条件
      this.validateExecutionConditions();

      // 3. 准备执行环境
      this.prepareExecutionEnvironment(inputData);

      // 4. 获取执行步骤
      const steps = this.getExecutionSteps();

      // 5. 串行执行每个步骤
      for (const step of steps) {
        await this.executeStep(step);

        // 6. 检查执行条件
        if (this.shouldPause()) {
          await this.pauseExecution();
          break;
        }

        if (this.shouldTerminate()) {
          await this.terminateExecution();
          break;
        }
      }

      // 7. 完成执行
      const result = this.props.executionState.complete();
      this.updateStatus(ThreadStatus.completed());

      return result;

    } catch (error) {
      const result = this.props.executionState.fail(error as Error);
      this.updateStatus(ThreadStatus.failed());
      return result;
    }
  }

  /**
   * 执行单个步骤
   * @param step 执行步骤
   */
  private async executeStep(step: ExecutionStep): Promise<void> {
    // 创建步骤上下文 - ExecutionContext 本身应该有 createStepContext 方法
    // 但现在我们直接使用执行上下文
    const result = await step.execute(this.props.executionContext);
    this.props.executionState.recordStepResult(step, result);
  }

  /**
   * 获取执行步骤
   */
  private getExecutionSteps(): ExecutionStep[] {
    if (!this.workflow) {
      throw new DomainError('Thread执行器未关联工作流');
    }

    return this.workflow.getExecutionSteps();
  }

  /**
   * 验证执行条件
   */
  private validateExecutionConditions(): void {
    if (!this.props.status.canExecute()) {
      throw new DomainError(`Thread执行器当前状态不允许执行: ${this.props.status}`);
    }

    if (!this.workflow) {
      throw new DomainError('Thread执行器未关联工作流');
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

    // 重置执行状态
    this.props.executionState.reset();
  }

  /**
   * 检查是否应该暂停
   */
  private shouldPause(): boolean {
    // 检查暂停条件
    return this.props.executionState.shouldPause();
  }

  /**
   * 检查是否应该终止
   */
  private shouldTerminate(): boolean {
    // 检查终止条件
    return this.props.executionState.shouldTerminate();
  }

  /**
   * 暂停执行
   */
  public async pauseExecution(): Promise<void> {
    this.updateStatus(ThreadStatus.paused());
    this.props.executionState.pause();
  }

  /**
   * 恢复执行
   */
  public async resumeExecution(): Promise<void> {
    this.updateStatus(ThreadStatus.running());
    this.props.executionState.resume();
  }

  /**
   * 终止执行
   */
  public async terminateExecution(): Promise<void> {
    this.updateStatus(ThreadStatus.cancelled());
    this.props.executionState.terminate();
  }

  /**
   * 更新状态
   * @param newStatus 新状态
   */
  private updateStatus(newStatus: ThreadStatus): void {
    const oldStatus = this.props.status;
    if (oldStatus.equals(newStatus)) {
      return;
    }

    // 更新状态
    (this.props as any).status = newStatus;

    // 添加状态变更事件
    this.addDomainEvent(new ThreadStatusChangedEvent(
      this.props.id,
      oldStatus,
      newStatus
    ));
  }

  /**
   * 获取执行状态（供SessionManager监控）
   */
  public getExecutionStatus(): ThreadExecutionStatus {
    return {
      threadId: this.props.id,
      status: this.props.executionState.getStatus(),
      progress: this.props.executionState.getProgress(),
      currentStep: this.props.executionState.getCurrentStep(),
      startTime: this.props.executionState.getStartTime(),
      estimatedCompletionTime: this.props.executionState.getEstimatedCompletionTime()
    };
  }

  /**
   * 设置工作流
   * @param workflow 工作流
   */
  public setWorkflow(workflow: Workflow): void {
    if (this.props.status.isRunning()) {
      throw new DomainError('Thread执行器正在运行时不能更改工作流');
    }

    this.workflow = workflow;

    // 更新工作流ID
    (this.props as any).workflowId = workflow.workflowId;
  }

  /**
   * 获取Thread执行器ID
   */
  public get threadId(): ID {
    return this.props.id;
  }

  /**
   * 获取会话ID
   */
  public get sessionId(): ID {
    return this.props.sessionId;
  }

  /**
   * 获取工作流ID
   */
  public get workflowId(): ID | undefined {
    return this.props.workflowId;
  }

  /**
   * 获取状态
   */
  public get status(): ThreadStatus {
    return this.props.status;
  }

  /**
   * 获取优先级
   */
  public get priority(): ThreadPriority {
    return this.props.priority;
  }

  /**
   * 获取标题
   */
  public get title(): string | undefined {
    return this.props.title;
  }

  /**
   * 获取描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取执行上下文
   */
  public get executionContext(): IExecutionContext {
    return this.props.executionContext;
  }

  /**
   * 获取执行状态
   */
  public get executionState(): ThreadExecutionState {
    return this.props.executionState;
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    if (!this.props.id) {
      throw new DomainError('Thread执行器ID不能为空');
    }

    if (!this.props.sessionId) {
      throw new DomainError('会话ID不能为空');
    }

    if (!this.props.status) {
      throw new DomainError('Thread执行器状态不能为空');
    }

    if (!this.props.priority) {
      throw new DomainError('Thread执行器优先级不能为空');
    }

    if (!this.props.executionContext) {
      throw new DomainError('执行上下文不能为空');
    }

    if (!this.props.executionState) {
      throw new DomainError('执行状态不能为空');
    }

    // 验证状态
    this.props.status.validate();
    this.props.priority.validate();
    this.props.executionState.validate();
  }
}

/**
 * Thread执行状态
 */
export class ThreadExecutionState {
  private status: 'initial' | 'running' | 'paused' | 'completed' | 'failed' | 'terminated';
  private startTime?: Timestamp;
  private endTime?: Timestamp;
  private currentStep?: string;
  private stepResults: Map<string, any>;
  private progress: number;
  private shouldPauseFlag: boolean;
  private shouldTerminateFlag: boolean;

  constructor() {
    this.status = 'initial';
    this.stepResults = new Map();
    this.progress = 0;
    this.shouldPauseFlag = false;
    this.shouldTerminateFlag = false;
  }

  /**
   * 创建初始状态
   */
  public static initial(): ThreadExecutionState {
    return new ThreadExecutionState();
  }

  /**
   * 开始执行
   */
  public start(): void {
    this.status = 'running';
    this.startTime = Timestamp.now();
    this.progress = 0;
    this.shouldPauseFlag = false;
    this.shouldTerminateFlag = false;
  }

  /**
   * 暂停执行
   */
  public pause(): void {
    this.status = 'paused';
  }

  /**
   * 恢复执行
   */
  public resume(): void {
    this.status = 'running';
    this.shouldPauseFlag = false;
  }

  /**
   * 完成执行
   */
  public complete(): ExecutionResult {
    this.status = 'completed';
    this.endTime = Timestamp.now();
    this.progress = 100;

    return {
      executionId: ID.generate(), // 应该从上下文获取
      status: ExecutionStatus.COMPLETED,
      data: {
        stepResults: Array.from(this.stepResults.entries()),
        progress: this.progress
      },
      statistics: {
        totalTime: this.getExecutionTime(),
        nodeExecutionTime: this.getExecutionTime(),
        successfulNodes: this.stepResults.size,
        failedNodes: 0,
        skippedNodes: 0,
        retries: 0
      }
    };
  }

  /**
   * 执行失败
   */
  public fail(error: Error): ExecutionResult {
    this.status = 'failed';
    this.endTime = Timestamp.now();

    return {
      executionId: ID.generate(), // 应该从上下文获取
      status: ExecutionStatus.FAILED,
      error,
      data: {
        stepResults: Array.from(this.stepResults.entries()),
        progress: this.progress
      },
      statistics: {
        totalTime: this.getExecutionTime(),
        nodeExecutionTime: this.getExecutionTime(),
        successfulNodes: this.stepResults.size,
        failedNodes: 1,
        skippedNodes: 0,
        retries: 0
      }
    };
  }

  /**
   * 终止执行
   */
  public terminate(): void {
    this.status = 'terminated';
    this.endTime = Timestamp.now();
  }

  /**
   * 记录步骤结果
   */
  public recordStepResult(step: ExecutionStep, result: any): void {
    const stepId = typeof step === 'string' ? step : (step as any).stepId;
    this.stepResults.set(stepId, result);
    this.currentStep = stepId;

    // 更新进度（简化计算）
    this.progress = Math.min(100, this.progress + (100 / 10)); // 假设总共10个步骤
  }

  /**
   * 重置状态
   */
  public reset(): void {
    this.status = 'initial';
    this.startTime = undefined;
    this.endTime = undefined;
    this.currentStep = undefined;
    this.stepResults.clear();
    this.progress = 0;
    this.shouldPauseFlag = false;
    this.shouldTerminateFlag = false;
  }

  /**
   * 设置暂停标志
   */
  public setShouldPause(): void {
    this.shouldPauseFlag = true;
  }

  /**
   * 设置终止标志
   */
  public setShouldTerminate(): void {
    this.shouldTerminateFlag = true;
  }

  /**
   * 获取状态
   */
  public getStatus(): string {
    return this.status;
  }

  /**
   * 获取进度
   */
  public getProgress(): number {
    return this.progress;
  }

  /**
   * 获取当前步骤
   */
  public getCurrentStep(): string | undefined {
    return this.currentStep;
  }

  /**
   * 获取开始时间
   */
  public getStartTime(): Timestamp | undefined {
    return this.startTime;
  }

  /**
   * 获取预估完成时间
   */
  public getEstimatedCompletionTime(): Timestamp | undefined {
    if (!this.startTime || this.progress === 0) {
      return undefined;
    }

    const elapsed = Date.now() - this.startTime.getMilliseconds();
    const estimatedTotal = (elapsed / this.progress) * 100;
    const estimatedEnd = this.startTime.getMilliseconds() + estimatedTotal;

    return Timestamp.fromMilliseconds(estimatedEnd);
  }

  /**
   * 检查是否应该暂停
   */
  public shouldPause(): boolean {
    return this.shouldPauseFlag;
  }

  /**
   * 检查是否应该终止
   */
  public shouldTerminate(): boolean {
    return this.shouldTerminateFlag;
  }

  /**
   * 获取执行时间
   */
  private getExecutionTime(): number {
    if (!this.startTime) {
      return 0;
    }

    const endTime = this.endTime || Timestamp.now();
    return endTime.getMilliseconds() - this.startTime.getMilliseconds();
  }

  /**
   * 验证状态
   */
  public validate(): void {
    if (!this.status) {
      throw new DomainError('执行状态不能为空');
    }

    if (this.progress < 0 || this.progress > 100) {
      throw new DomainError('进度必须在0-100之间');
    }
  }
}

/**
 * Thread执行状态接口
 */
export interface ThreadExecutionStatus {
  threadId: ID;
  status: string;
  progress: number;
  currentStep?: string;
  startTime?: Timestamp;
  estimatedCompletionTime?: Timestamp;
}