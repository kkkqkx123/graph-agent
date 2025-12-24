import { Thread } from '../entities/thread';
import { ThreadRepository } from '../repositories/thread-repository';
import { ID } from '../../common/value-objects/id';
import { ThreadStatus } from '../value-objects/thread-status';
import { ThreadPriority } from '../value-objects/thread-priority';
import { DomainError } from '../../common/errors/domain-error';

/**
 * 线程领域服务
 * 
 * 提供线程相关的核心业务逻辑和规则
 * 专注于跨聚合的业务逻辑，不包含应用服务逻辑
 * 
 * Thread作为串行执行协调者的业务规则：
 * - 单线程内的状态管理
 * - 执行步骤的顺序控制
 * - 错误处理和恢复
 */
export class ThreadDomainService {
  /**
   * 构造函数
   * @param threadRepository 线程仓储
   */
  constructor(private readonly threadRepository: ThreadRepository) {}

  /**
   * 验证线程创建的业务规则
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param priority 线程优先级
   */
  async validateThreadCreation(
    sessionId: ID,
    workflowId: ID,
    priority?: ThreadPriority
  ): Promise<void> {
    // 验证会话是否有活跃线程（Session负责多线程并行管理）
    const hasActiveThreads = await this.threadRepository.hasActiveThreads(sessionId);
    if (hasActiveThreads) {
      throw new DomainError('会话已有活跃线程，无法创建新线程');
    }

    // 验证优先级
    if (priority) {
      priority.validate();
    }
  }

  /**
   * 验证线程启动的业务规则
   * @param threadId 线程ID
   */
  async validateThreadStart(threadId: ID): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.isPending()) {
      throw new DomainError('只能启动待执行状态的线程');
    }

    // 检查会话是否有其他运行中的线程（Session负责并行管理）
    const hasRunningThreads = await this.threadRepository.hasRunningThreads(thread.sessionId);
    if (hasRunningThreads) {
      throw new DomainError('会话已有运行中的线程，无法启动其他线程');
    }
  }

  /**
   * 验证线程暂停的业务规则
   * @param threadId 线程ID
   */
  async validateThreadPause(threadId: ID): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.isRunning()) {
      throw new DomainError('只能暂停运行中的线程');
    }
  }

  /**
   * 验证线程恢复的业务规则
   * @param threadId 线程ID
   */
  async validateThreadResume(threadId: ID): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.isPaused()) {
      throw new DomainError('只能恢复暂停状态的线程');
    }

    // 检查会话是否有其他运行中的线程（Session负责并行管理）
    const hasRunningThreads = await this.threadRepository.hasRunningThreads(thread.sessionId);
    if (hasRunningThreads) {
      throw new DomainError('会话已有运行中的线程，无法恢复其他线程');
    }
  }

  /**
   * 验证线程完成的业务规则
   * @param threadId 线程ID
   */
  async validateThreadCompletion(threadId: ID): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.isActive()) {
      throw new DomainError('只能完成活跃状态的线程');
    }
  }

  /**
   * 验证线程失败的业务规则
   * @param threadId 线程ID
   */
  async validateThreadFailure(threadId: ID): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.isActive()) {
      throw new DomainError('只能设置活跃状态的线程为失败状态');
    }
  }

  /**
   * 验证线程取消的业务规则
   * @param threadId 线程ID
   */
  async validateThreadCancellation(threadId: ID): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (thread.status.isTerminal()) {
      throw new DomainError('无法取消已终止状态的线程');
    }
  }

  /**
   * 验证线程优先级更新的业务规则
   * @param threadId 线程ID
   * @param newPriority 新优先级
   */
  async validateThreadPriorityUpdate(threadId: ID, newPriority: ThreadPriority): Promise<void> {
    const thread = await this.threadRepository.findByIdOrFail(threadId);

    if (!thread.status.canOperate()) {
      throw new DomainError('无法更新非活跃状态线程的优先级');
    }

    newPriority.validate();
  }

  /**
   * 计算线程超时时间
   * @param thread 线程
   * @param timeoutHours 超时小时数
   * @returns 超时时间
   */
  calculateThreadTimeout(thread: Thread, timeoutHours: number): Date {
    if (!thread.startedAt) {
      throw new DomainError('线程尚未启动，无法计算超时时间');
    }

    return thread.startedAt.getDate();
  }

  /**
   * 检查线程是否超时
   * @param thread 线程
   * @param timeoutHours 超时小时数
   * @returns 是否超时
   */
  isThreadTimedOut(thread: Thread, timeoutHours: number): boolean {
    if (!thread.startedAt) {
      return false;
    }

    const now = new Date();
    const startTime = thread.startedAt.getDate();
    const timeoutTime = new Date(startTime.getTime() + timeoutHours * 60 * 60 * 1000);

    return now > timeoutTime;
  }

  /**
   * 检查线程是否可以重试
   * @param thread 线程
   * @param maxRetryCount 最大重试次数
   * @returns 是否可以重试
   */
  canRetryThread(thread: Thread, maxRetryCount: number): boolean {
    if (!thread.status.isFailed()) {
      return false;
    }

    return thread.execution.retryCount < maxRetryCount;
  }

  /**
   * 获取线程的下一个状态
   * @param currentStatus 当前状态
   * @param action 操作类型
   * @returns 下一个状态
   */
  getNextThreadStatus(currentStatus: ThreadStatus, action: 'start' | 'pause' | 'resume' | 'complete' | 'fail' | 'cancel'): ThreadStatus {
    switch (action) {
      case 'start':
        if (!currentStatus.isPending()) {
          throw new DomainError('只能启动待执行状态的线程');
        }
        return ThreadStatus.running();
      
      case 'pause':
        if (!currentStatus.isRunning()) {
          throw new DomainError('只能暂停运行中的线程');
        }
        return ThreadStatus.paused();
      
      case 'resume':
        if (!currentStatus.isPaused()) {
          throw new DomainError('只能恢复暂停状态的线程');
        }
        return ThreadStatus.running();
      
      case 'complete':
        if (!currentStatus.isActive()) {
          throw new DomainError('只能完成活跃状态的线程');
        }
        return ThreadStatus.completed();
      
      case 'fail':
        if (!currentStatus.isActive()) {
          throw new DomainError('只能设置活跃状态的线程为失败状态');
        }
        return ThreadStatus.failed();
      
      case 'cancel':
        if (currentStatus.isTerminal()) {
          throw new DomainError('无法取消已终止状态的线程');
        }
        return ThreadStatus.cancelled();
      
      default:
        throw new DomainError(`未知的操作类型: ${action}`);
    }
  }

  /**
   * 比较线程优先级
   * @param thread1 线程1
   * @param thread2 线程2
   * @returns 比较结果：-1表示thread1优先级更高，0表示相等，1表示thread2优先级更高
   */
  compareThreadPriority(thread1: Thread, thread2: Thread): number {
    return thread2.priority.compareTo(thread1.priority);
  }

  /**
   * 检查线程是否可以执行
   * @param thread 线程
   * @returns 是否可以执行
   */
  canExecuteThread(thread: Thread): boolean {
    return thread.status.isPending() || thread.status.isRunning();
  }

  /**
   * 检查线程是否处于活跃状态
   * @param thread 线程
   * @returns 是否处于活跃状态
   */
  isThreadActive(thread: Thread): boolean {
    return thread.status.isActive();
  }

  /**
   * 检查线程是否已终止
   * @param thread 线程
   * @returns 是否已终止
   */
  isThreadTerminal(thread: Thread): boolean {
    return thread.status.isTerminal();
  }
}