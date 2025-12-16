/**
 * 检查点管理服务
 * 
 * 负责检查点的查询、历史记录和过期时间延长等管理功能
 */

import { ThreadCheckpoint } from '../../../../domain/threads/checkpoints/entities/thread-checkpoint';
import { ThreadCheckpointDomainService, ThreadCheckpointDomainServiceImpl } from '../../../../domain/threads/checkpoints/services/thread-checkpoint-domain-service';
import { ThreadCheckpointRepository } from '../../../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { BaseApplicationService } from '../../../common/base-application-service';
import { CheckpointInfo } from '../dtos';
import { ILogger } from '@shared/types/logger';

/**
 * 检查点管理服务
 */
export class CheckpointManagementService extends BaseApplicationService {
  private readonly domainService: ThreadCheckpointDomainService;

  constructor(
    private readonly repository: ThreadCheckpointRepository,
    logger: ILogger
  ) {
    super(logger);
    this.domainService = new ThreadCheckpointDomainServiceImpl(repository);
  }

  /**
   * 获取服务名称
   */
  protected getServiceName(): string {
    return '检查点管理';
  }

  /**
   * 获取检查点信息
   */
  async getCheckpointInfo(checkpointId: string): Promise<CheckpointInfo | null> {
    return this.executeGetOperation(
      '检查点信息',
      async () => {
        const id = this.parseId(checkpointId, '检查点ID');
        const checkpoint = await this.repository.findById(id);

        if (!checkpoint) {
          return null;
        }

        return this.mapCheckpointToInfo(checkpoint);
      },
      { checkpointId }
    );
  }

  /**
   * 获取线程检查点历史
   */
  async getThreadCheckpointHistory(threadId: string, limit?: number): Promise<CheckpointInfo[]> {
    return this.executeListOperation(
      '线程检查点历史',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const checkpoints = await this.domainService.getThreadCheckpointHistory(id, limit);

        return checkpoints.map(cp => this.mapCheckpointToInfo(cp));
      },
      { threadId, limit }
    );
  }

  /**
   * 延长检查点过期时间
   */
  async extendCheckpointExpiration(checkpointId: string, hours: number): Promise<boolean> {
    return this.executeBusinessOperation(
      '延长检查点过期时间',
      async () => {
        const id = this.parseId(checkpointId, '检查点ID');
        const success = await this.domainService.extendCheckpointExpiration(id, hours);

        if (success) {
          this.logOperationSuccess('检查点过期时间延长成功', { checkpointId, hours });
        } else {
          this.logWarning('检查点过期时间延长失败', { checkpointId, hours });
        }

        return success;
      },
      { checkpointId, hours }
    );
  }

  /**
  * 将检查点领域对象映射为检查点信息DTO
  */
  private mapCheckpointToInfo(checkpoint: ThreadCheckpoint): CheckpointInfo {
    return {
      checkpointId: checkpoint.checkpointId.toString(),
      threadId: checkpoint.threadId.toString(),
      type: checkpoint.type.getValue(),
      status: checkpoint.status.statusValue,
      title: checkpoint.title,
      description: checkpoint.description,
      tags: [...checkpoint.tags],
      metadata: { ...checkpoint.metadata },
      createdAt: checkpoint.createdAt.getDate().toISOString(),
      updatedAt: checkpoint.updatedAt.getDate().toISOString(),
      expiresAt: checkpoint.expiresAt?.getDate().toISOString(),
      sizeBytes: checkpoint.sizeBytes,
      restoreCount: checkpoint.restoreCount,
      lastRestoredAt: checkpoint.lastRestoredAt?.getDate().toISOString()
    };
  }
}