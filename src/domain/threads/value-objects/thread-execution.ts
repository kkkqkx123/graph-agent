import { ValueObject } from '../../common/value-objects/value-object';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { ThreadStatus } from './thread-status';
import { NodeStatus } from '../../workflow/value-objects/node-status';

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
}

/**
 * ThreadExecution值对象
 * 
 * 表示线程的执行状态信息，是不可变的
 * 包含执行进度、状态变化和时间信息
 */
export class ThreadExecution extends ValueObject<ThreadExecutionProps> {
  /**
   * 创建线程执行值对象
   * @param threadId 线程ID
   * @returns 线程执行值对象
   */
  public static create(threadId: ID): ThreadExecution {
    const now = Timestamp.now();
    const threadStatus = ThreadStatus.pending();

    return new ThreadExecution({
      threadId,
      status: threadStatus,
      progress: 0,
      retryCount: 0,
      lastActivityAt: now
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
   * 启动执行（创建新实例）
   * @returns 新的线程执行值对象
   */
  public start(): ThreadExecution {
    if (!this.props.status.isPending()) {
      throw new Error('只能启动待执行状态的线程');
    }

    return new ThreadExecution({
      ...this.props,
      status: ThreadStatus.running(),
      startedAt: Timestamp.now(),
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 暂停执行（创建新实例）
   * @returns 新的线程执行值对象
   */
  public pause(): ThreadExecution {
    if (!this.props.status.isRunning()) {
      throw new Error('只能暂停运行中的线程');
    }

    return new ThreadExecution({
      ...this.props,
      status: ThreadStatus.paused(),
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 恢复执行（创建新实例）
   * @returns 新的线程执行值对象
   */
  public resume(): ThreadExecution {
    if (!this.props.status.isPaused()) {
      throw new Error('只能恢复暂停状态的线程');
    }

    return new ThreadExecution({
      ...this.props,
      status: ThreadStatus.running(),
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 完成执行（创建新实例）
   * @returns 新的线程执行值对象
   */
  public complete(): ThreadExecution {
    if (!this.props.status.isActive()) {
      throw new Error('只能完成活跃状态的线程');
    }

    return new ThreadExecution({
      ...this.props,
      status: ThreadStatus.completed(),
      progress: 100,
      completedAt: Timestamp.now(),
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 失败执行（创建新实例）
   * @param errorMessage 错误信息
   * @returns 新的线程执行值对象
   */
  public fail(errorMessage: string): ThreadExecution {
    if (!this.props.status.isActive()) {
      throw new Error('只能设置活跃状态的线程为失败状态');
    }

    return new ThreadExecution({
      ...this.props,
      status: ThreadStatus.failed(),
      errorMessage,
      completedAt: Timestamp.now(),
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 取消执行（创建新实例）
   * @returns 新的线程执行值对象
   */
  public cancel(): ThreadExecution {
    if (this.props.status.isTerminal()) {
      throw new Error('无法取消已终止状态的线程');
    }

    return new ThreadExecution({
      ...this.props,
      status: ThreadStatus.cancelled(),
      completedAt: Timestamp.now(),
      lastActivityAt: Timestamp.now()
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
      throw new Error('进度必须在0-100之间');
    }

    if (!this.props.status.isActive()) {
      throw new Error('只能更新活跃状态的线程进度');
    }

    return new ThreadExecution({
      ...this.props,
      progress,
      currentStep,
      lastActivityAt: Timestamp.now()
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
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 更新最后活动时间（创建新实例）
   * @returns 新的线程执行值对象
   */
  public updateLastActivity(): ThreadExecution {
    return new ThreadExecution({
      ...this.props,
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 验证线程执行的有效性
   */
  public validate(): void {
    if (!this.props.threadId) {
      throw new Error('线程ID不能为空');
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
}