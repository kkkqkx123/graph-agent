import { ID } from '../../domain/common/value-objects/id';
import { Timestamp } from '../../domain/common/value-objects/timestamp';
import { Thread } from '../../domain/threads/entities/thread';
import { ThreadStatus } from '../../domain/threads/value-objects/thread-status';
import { Checkpoint } from '../../domain/threads/checkpoints/entities/checkpoint';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 状态历史服务
 *
 * 负责记录状态变更的审计日志
 * 职责：
 * - 使用日志系统记录状态变更
 * - 提供查询接口（通过日志系统）
 */
export class StateHistory {
  constructor(
    private readonly logger: ILogger
  ) { }

  /**
   * 记录状态变更
   * @param thread Thread实体
   * @param oldStatus 旧状态
   * @param newStatus 新状态
   */
  async recordStateChange(
    thread: Thread,
    oldStatus: ThreadStatus,
    newStatus: ThreadStatus
  ): Promise<void> {
    this.logger.info('Thread状态变更', {
      threadId: thread.threadId.value,
      sessionId: thread.sessionId?.value,
      oldStatus: oldStatus.value,
      newStatus: newStatus.value,
      executionState: this.serializeThreadExecution(thread.execution),
      timestamp: Timestamp.now().toISOString(),
    });
  }

  /**
   * 记录恢复操作
   * @param thread Thread实体
   * @param checkpoint Checkpoint实体
   */
  async recordRestore(thread: Thread, checkpoint: Checkpoint): Promise<void> {
    this.logger.info('Thread从Checkpoint恢复', {
      threadId: thread.threadId.value,
      sessionId: thread.sessionId?.value,
      checkpointId: checkpoint.checkpointId.value,
      checkpointType: checkpoint.type.getValue(),
      checkpointCreatedAt: checkpoint.createdAt.toISOString(),
      timestamp: Timestamp.now().toISOString(),
    });
  }

  /**
   * 记录错误
   * @param thread Thread实体
   * @param error 错误对象
   */
  async recordError(thread: Thread, error: Error): Promise<void> {
    this.logger.error('Thread发生错误', error, {
      threadId: thread.threadId.value,
      sessionId: thread.sessionId?.value,
      errorMessage: error.message,
      errorName: error.name,
      executionState: this.serializeThreadExecution(thread.execution),
      timestamp: Timestamp.now().toISOString(),
    });
  }

  /**
   * 记录操作
   * @param thread Thread实体
   * @param operation 操作名称
   * @param details 操作详情
   */
  async recordOperation(
    thread: Thread,
    operation: string,
    details: Record<string, unknown>
  ): Promise<void> {
    this.logger.info(`Thread操作: ${operation}`, {
      threadId: thread.threadId.value,
      sessionId: thread.sessionId?.value,
      operation,
      ...details,
      executionState: this.serializeThreadExecution(thread.execution),
      timestamp: Timestamp.now().toISOString(),
    });
  }

  /**
   * 清理过期的日志
   * @param retentionDays 保留天数
   * @returns 清理的日志数量
   */
  /**
   * 序列化ThreadExecution
   * @param execution ThreadExecution值对象
   * @returns 序列化后的对象
   */
  private serializeThreadExecution(execution: any): Record<string, unknown> {
    return {
      threadId: execution.threadId.toString(),
      status: execution.status.value,
      progress: execution.progress,
      currentStep: execution.currentStep,
      startedAt: execution.startedAt?.toISOString(),
      completedAt: execution.completedAt?.toISOString(),
      errorMessage: execution.errorMessage,
      retryCount: execution.retryCount,
      lastActivityAt: execution.lastActivityAt.toISOString(),
    };
  }

  async cleanupExpiredLogs(retentionDays: number): Promise<number> {
    this.logger.info('日志清理', {
      retentionDays,
      message: '日志清理由日志系统自动处理',
    });
    return 0;
  }
}
