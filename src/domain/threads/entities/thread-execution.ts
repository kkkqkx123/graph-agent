import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { ThreadStatus } from '../value-objects/thread-status';
import { ExecutionContext } from '../../workflow/execution';

/**
 * ThreadExecution实体属性接口
 */
export interface ThreadExecutionProps {
  readonly id: ID;
  readonly threadDefinitionId: ID;
  readonly status: ThreadStatus;
  readonly progress: number;
  readonly currentStep?: string;
  readonly startedAt?: Timestamp;
  readonly completedAt?: Timestamp;
  readonly estimatedCompletionTime?: Timestamp;
  readonly errorMessage?: string;
  readonly retryCount: number;
  readonly executionContext: ExecutionContext;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

/**
 * ThreadExecution实体
 * 
 * 职责：线程的执行状态和进度管理
 * 专注于：
 * - 执行状态管理
 * - 进度跟踪
 * - 错误处理
 * - 执行上下文管理
 */
export class ThreadExecution extends Entity {
  private readonly props: ThreadExecutionProps;

  /**
   * 构造函数
   * @param props 线程执行属性
   */
  private constructor(props: ThreadExecutionProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新线程执行
   * @param threadDefinitionId 线程定义ID
   * @param executionContext 执行上下文
   * @returns 新线程执行实例
   */
  public static create(
    threadDefinitionId: ID,
    executionContext: ExecutionContext
  ): ThreadExecution {
    const now = Timestamp.now();
    const executionId = ID.generate();
    const threadStatus = ThreadStatus.pending();

    const props: ThreadExecutionProps = {
      id: executionId,
      threadDefinitionId,
      status: threadStatus,
      progress: 0,
      retryCount: 0,
      executionContext,
      createdAt: now,
      updatedAt: now,
      version: Version.initial()
    };

    return new ThreadExecution(props);
  }

  /**
   * 从已有属性重建线程执行
   * @param props 线程执行属性
   * @returns 线程执行实例
   */
  public static fromProps(props: ThreadExecutionProps): ThreadExecution {
    return new ThreadExecution(props);
  }

  /**
   * 获取执行ID
   * @returns 执行ID
   */
  public get executionId(): ID {
    return this.props.id;
  }

  /**
   * 获取线程定义ID
   * @returns 线程定义ID
   */
  public get threadDefinitionId(): ID {
    return this.props.threadDefinitionId;
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
   * 获取预计完成时间
   * @returns 预计完成时间
   */
  public get estimatedCompletionTime(): Timestamp | undefined {
    return this.props.estimatedCompletionTime;
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
   * 获取执行上下文
   * @returns 执行上下文
   */
  public get executionContext(): ExecutionContext {
    return this.props.executionContext;
  }

  /**
   * 启动线程执行
   */
  public start(): void {
    if (!this.props.status.isPending()) {
      throw new Error('只能启动待执行状态的线程');
    }

    const newProps: ThreadExecutionProps = {
      ...this.props,
      status: ThreadStatus.running(),
      startedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 暂停线程执行
   */
  public pause(): void {
    if (!this.props.status.isRunning()) {
      throw new Error('只能暂停运行中的线程');
    }

    const newProps: ThreadExecutionProps = {
      ...this.props,
      status: ThreadStatus.paused(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 恢复线程执行
   */
  public resume(): void {
    if (!this.props.status.isPaused()) {
      throw new Error('只能恢复暂停状态的线程');
    }

    const newProps: ThreadExecutionProps = {
      ...this.props,
      status: ThreadStatus.running(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新执行进度
   * @param progress 新进度（0-100）
   * @param currentStep 当前步骤
   */
  public updateProgress(progress: number, currentStep?: string): void {
    if (progress < 0 || progress > 100) {
      throw new Error('进度必须在0-100之间');
    }

    if (!this.props.status.isActive()) {
      throw new Error('只能更新活跃状态的线程进度');
    }

    const newProps: ThreadExecutionProps = {
      ...this.props,
      progress,
      currentStep,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 完成线程执行
   */
  public complete(): void {
    if (!this.props.status.isActive()) {
      throw new Error('只能完成活跃状态的线程');
    }

    const newProps: ThreadExecutionProps = {
      ...this.props,
      status: ThreadStatus.completed(),
      progress: 100,
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 失败线程执行
   * @param errorMessage 错误信息
   */
  public fail(errorMessage: string): void {
    if (!this.props.status.isActive()) {
      throw new Error('只能设置活跃状态的线程为失败状态');
    }

    const newProps: ThreadExecutionProps = {
      ...this.props,
      status: ThreadStatus.failed(),
      errorMessage,
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 取消线程执行
   */
  public cancel(): void {
    if (this.props.status.isTerminal()) {
      throw new Error('无法取消已终止状态的线程');
    }

    const newProps: ThreadExecutionProps = {
      ...this.props,
      status: ThreadStatus.cancelled(),
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 增加重试次数
   */
  public incrementRetryCount(): void {
    const newProps: ThreadExecutionProps = {
      ...this.props,
      retryCount: this.props.retryCount + 1,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新预计完成时间
   * @param estimatedTime 预计完成时间
   */
  public updateEstimatedCompletionTime(estimatedTime: Timestamp): void {
    const newProps: ThreadExecutionProps = {
      ...this.props,
      estimatedCompletionTime: estimatedTime,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 验证聚合的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new Error('执行ID不能为空');
    }

    if (!this.props.threadDefinitionId) {
      throw new Error('线程定义ID不能为空');
    }

    if (!this.props.status) {
      throw new Error('线程状态不能为空');
    }

    if (this.props.progress < 0 || this.props.progress > 100) {
      throw new Error('进度必须在0-100之间');
    }

    if (this.props.retryCount < 0) {
      throw new Error('重试次数不能为负数');
    }

    // 验证时间逻辑
    if (this.props.startedAt && this.props.completedAt) {
      if (this.props.startedAt.isAfter(this.props.completedAt)) {
        throw new Error('开始时间不能晚于完成时间');
      }
    }

    // 验证状态与时间的一致性
    if (this.props.status.isRunning() && !this.props.startedAt) {
      throw new Error('运行中的线程必须有开始时间');
    }

    if (this.props.status.isTerminal() && !this.props.completedAt) {
      throw new Error('已终止的线程必须有完成时间');
    }

    if (this.props.status.isTerminal() && this.props.progress < 100) {
      throw new Error('已终止的线程进度必须为100');
    }
  }


  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `thread-execution:${this.props.id.toString()}`;
  }
}