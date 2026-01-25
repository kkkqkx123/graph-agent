import { ID } from '../../domain/common/value-objects/id';
import { Checkpoint } from '../../domain/threads/checkpoints/entities/checkpoint';
import { CheckpointType } from '../../domain/threads/checkpoints/value-objects/checkpoint-type';
import { ICheckpointRepository } from '../../domain/threads/checkpoints/repositories/checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';
import { Thread } from '../../domain/threads/entities/thread';
import { CheckpointSerializationUtils } from './utils/serialization-utils';

/**
 * 检查点创建服务
 *
 * 负责各种类型检查点的创建和策略验证
 * 
 * 设计原则：
 * - 接受 Thread 对象，内部处理状态序列化
 * - 包含检查点创建策略（何时创建检查点）
 * - 提供不同类型的检查点创建方法
 */
export class CheckpointCreation {
  constructor(
    private readonly repository: ICheckpointRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 根据状态变更类型自动创建检查点
   * 
   * @param thread 线程对象
   * @param changeType 状态变更类型
   * @param metadata 额外元数据
   * @returns 创建的检查点，如果不满足创建条件则返回 null
   */
  async createAutoCheckpointIfNeeded(
    thread: Thread,
    changeType: string,
    metadata?: Record<string, unknown>
  ): Promise<Checkpoint | null> {
    // 判断是否需要创建检查点
    if (!this.shouldCreateCheckpoint(changeType)) {
      return null;
    }

    // 创建自动检查点
    return await this.createAutoCheckpoint(
      thread,
      {
        ...metadata,
        changeType,
        triggeredAt: new Date().toISOString(),
      }
    );
  }

  /**
   * 创建自动检查点
   * 
   * @param thread 线程对象
   * @param metadata 额外元数据
   * @returns 创建的检查点
   */
  async createAutoCheckpoint(
    thread: Thread,
    metadata?: Record<string, unknown>
  ): Promise<Checkpoint> {
    const stateData = CheckpointSerializationUtils.serializeThreadState(thread);
    
    const checkpoint = Checkpoint.create(
      thread.id,
      CheckpointType.auto(),
      stateData,
      `自动检查点: ${thread.status}`,
      `Automatic checkpoint for thread ${thread.id.value}`,
      ['automatic'],
      {
        ...metadata,
        threadId: thread.id.value,
        sessionId: thread.sessionId.value,
        workflowId: thread.workflowId.value,
        status: thread.status,
        createdAt: new Date().toISOString(),
      }
    );

    await this.repository.save(checkpoint);
    this.logger.info('自动检查点创建成功', {
      checkpointId: checkpoint.checkpointId.value,
      threadId: thread.id.value,
    });

    return checkpoint;
  }

  /**
   * 创建手动检查点
   * 
   * @param thread 线程对象
   * @param title 检查点标题
   * @param description 检查点描述
   * @param tags 标签
   * @param metadata 额外元数据
   * @returns 创建的检查点
   */
  async createManualCheckpoint(
    thread: Thread,
    title?: string,
    description?: string,
    tags?: string[],
    metadata?: Record<string, unknown>
  ): Promise<Checkpoint> {
    const stateData = CheckpointSerializationUtils.serializeThreadState(thread);
    
    const checkpoint = Checkpoint.create(
      thread.id,
      CheckpointType.manual(),
      stateData,
      title || `手动检查点 - ${thread.id.value}`,
      description || `Manual checkpoint for thread ${thread.id.value}`,
      tags || ['manual'],
      {
        ...metadata,
        threadId: thread.id.value,
        sessionId: thread.sessionId.value,
        workflowId: thread.workflowId.value,
        status: thread.status,
        createdAt: new Date().toISOString(),
      }
    );

    await this.repository.save(checkpoint);
    this.logger.info('手动检查点创建成功', {
      checkpointId: checkpoint.checkpointId.value,
      threadId: thread.id.value,
    });

    return checkpoint;
  }

  /**
   * 创建错误检查点
   * 
   * @param thread 线程对象
   * @param error 错误对象
   * @param context 错误上下文
   * @returns 创建的检查点
   */
  async createErrorCheckpoint(
    thread: Thread,
    error: Error,
    context?: Record<string, unknown>
  ): Promise<Checkpoint> {
    const stateData = CheckpointSerializationUtils.serializeThreadState(thread);
    
    const errorMetadata = {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      ...context,
      threadId: thread.id.value,
      sessionId: thread.sessionId.value,
      workflowId: thread.workflowId.value,
      status: thread.status,
      createdAt: new Date().toISOString(),
    };

    const checkpoint = Checkpoint.create(
      thread.id,
      CheckpointType.error(),
      stateData,
      `错误检查点: ${error.name}`,
      error.message,
      ['error'],
      errorMetadata
    );

    await this.repository.save(checkpoint);
    this.logger.info('错误检查点创建成功', {
      checkpointId: checkpoint.checkpointId.value,
      threadId: thread.id.value,
      errorName: error.name,
    });

    return checkpoint;
  }

  /**
   * 创建里程碑检查点
   * 
   * @param thread 线程对象
   * @param milestoneName 里程碑名称
   * @param description 里程碑描述
   * @param metadata 额外元数据
   * @returns 创建的检查点
   */
  async createMilestoneCheckpoint(
    thread: Thread,
    milestoneName: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<Checkpoint> {
    const stateData = CheckpointSerializationUtils.serializeThreadState(thread);
    
    const milestoneMetadata = {
      milestoneName,
      ...metadata,
      threadId: thread.id.value,
      sessionId: thread.sessionId.value,
      workflowId: thread.workflowId.value,
      status: thread.status,
      createdAt: new Date().toISOString(),
    };

    const checkpoint = Checkpoint.create(
      thread.id,
      CheckpointType.milestone(),
      stateData,
      milestoneName,
      description || `Milestone: ${milestoneName}`,
      ['milestone'],
      milestoneMetadata
    );

    await this.repository.save(checkpoint);
    this.logger.info('里程碑检查点创建成功', {
      checkpointId: checkpoint.checkpointId.value,
      threadId: thread.id.value,
      milestone: milestoneName,
    });

    return checkpoint;
  }

  /**
   * 判断是否应该创建检查点
   *
   * @param changeType 状态变更类型
   * @returns 是否应该创建检查点
   */
  private shouldCreateCheckpoint(changeType: string): boolean {
    const checkpointTriggers = [
      'node_completed',
      'node_failed',
      'workflow_paused',
      'workflow_resumed',
      'workflow_completed',
      'workflow_failed',
      'thread_created',
      'thread_destroyed',
    ];

    return checkpointTriggers.includes(changeType);
  }
}