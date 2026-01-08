import { ID } from '../../domain/common/value-objects/id';
import { ThreadCheckpoint } from '../../domain/threads/checkpoints/entities/thread-checkpoint';
import { CheckpointType } from '../../domain/checkpoint/value-objects/checkpoint-type';
import { IThreadCheckpointRepository } from '../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 检查点创建服务
 *
 * 负责各种类型检查点的创建和策略验证
 */
export class CheckpointCreation {
  constructor(
    private readonly repository: IThreadCheckpointRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 创建自动检查点
   */
  async createAutoCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint> {
    const checkpoint = ThreadCheckpoint.create(
      threadId,
      CheckpointType.auto(),
      stateData,
      undefined,
      undefined,
      undefined,
      metadata,
      expirationHours
    );

    await this.repository.save(checkpoint);
    return checkpoint;
  }

  /**
   * 创建手动检查点
   */
  async createManualCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    title?: string,
    description?: string,
    tags?: string[],
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint> {
    const checkpoint = ThreadCheckpoint.create(
      threadId,
      CheckpointType.manual(),
      stateData,
      title,
      description,
      tags,
      metadata,
      expirationHours
    );

    await this.repository.save(checkpoint);
    return checkpoint;
  }

  /**
   * 创建错误检查点
   */
  async createErrorCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    errorMessage: string,
    errorType?: string,
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint> {
    const errorMetadata = {
      ...metadata,
      errorMessage,
      errorType,
      createdAt: new Date().toISOString(),
    };

    const checkpoint = ThreadCheckpoint.create(
      threadId,
      CheckpointType.error(),
      stateData,
      undefined,
      errorMessage,
      ['error'],
      errorMetadata,
      expirationHours
    );

    await this.repository.save(checkpoint);
    return checkpoint;
  }

  /**
   * 创建里程碑检查点
   */
  async createMilestoneCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    milestoneName: string,
    description?: string,
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint> {
    const milestoneMetadata = {
      ...metadata,
      milestoneName,
      createdAt: new Date().toISOString(),
    };

    const checkpoint = ThreadCheckpoint.create(
      threadId,
      CheckpointType.milestone(),
      stateData,
      milestoneName,
      description,
      ['milestone'],
      milestoneMetadata,
      expirationHours
    );

    await this.repository.save(checkpoint);
    return checkpoint;
  }

  /**
   * 验证检查点策略
   */
  async shouldCreateCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<boolean> {
    const recentCheckpoints = await this.repository.findByThreadId(threadId);
    const activeCheckpoints = recentCheckpoints.filter(cp => cp.status.isActive());

    // 如果活跃检查点太多，不创建新的
    if (activeCheckpoints.length >= 50) {
      return false;
    }

    // 如果距离上次检查点创建时间太短，不创建新的
    const latest = await this.repository.getLatest(threadId);
    if (latest && latest.getAgeInSeconds() < 300) {
      // 5分钟
      return false;
    }

    return true;
  }

  /**
   * 获取检查点建议
   */
  async getCheckpointRecommendation(
    threadId: ID,
    stateData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<{
    shouldCreate: boolean;
    recommendedType: CheckpointType;
    reason: string;
    suggestedTitle?: string;
    suggestedDescription?: string;
    suggestedTags?: string[];
  }> {
    const shouldCreate = await this.shouldCreateCheckpoint(threadId, stateData, context);

    if (!shouldCreate) {
      return {
        shouldCreate: false,
        recommendedType: CheckpointType.auto(),
        reason: '检查点创建条件不满足',
      };
    }

    // 简化的推荐逻辑
    return {
      shouldCreate: true,
      recommendedType: CheckpointType.auto(),
      reason: '满足自动检查点创建条件',
      suggestedTags: ['auto'],
    };
  }
}
