/**
 * 检查点恢复服务
 * 
 * 负责检查点的恢复、备份和备份链管理功能
 */

import { ThreadCheckpoint } from '../../../../domain/threads/checkpoints/entities/thread-checkpoint';
import { ThreadCheckpointDomainService, ThreadCheckpointDomainServiceImpl } from '../../../../domain/threads/checkpoints/services/thread-checkpoint-domain-service';
import { ThreadCheckpointRepository } from '../../../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { BaseApplicationService } from '../../../common/base-application-service';
import { CheckpointInfo } from '../../checkpoints/dtos';
import { ILogger } from '@shared/types/logger';

/**
 * 检查点恢复服务
 */
export class CheckpointRestoreService extends BaseApplicationService {
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
    return '检查点恢复';
  }

  /**
   * 从检查点恢复
   */
  async restoreFromCheckpoint(checkpointId: string): Promise<Record<string, unknown> | null> {
    return this.executeBusinessOperation(
      '检查点恢复',
      async () => {
        const id = this.parseId(checkpointId, '检查点ID');
        const stateData = await this.domainService.restoreFromCheckpoint(id);

        if (stateData) {
          this.logOperationSuccess('检查点恢复成功', { checkpointId });
        } else {
          this.logWarning('检查点恢复失败', { checkpointId, reason: '检查点不存在或无法恢复' });
        }

        return stateData;
      },
      { checkpointId }
    );
  }

  /**
   * 创建检查点备份
   */
  async createBackup(checkpointId: string): Promise<string> {
    return this.executeCreateOperation(
      '检查点备份',
      async () => {
        const id = this.parseId(checkpointId, '检查点ID');
        const backup = await this.domainService.createBackup(id);

        this.logOperationSuccess('检查点备份创建成功', {
          originalCheckpointId: checkpointId,
          backupId: backup.checkpointId.toString()
        });

        return backup.checkpointId;
      },
      { checkpointId }
    );
  }

  /**
   * 从备份恢复
   */
  async restoreFromBackup(backupId: string): Promise<Record<string, unknown> | null> {
    return this.executeBusinessOperation(
      '备份恢复',
      async () => {
        const id = this.parseId(backupId, '备份ID');
        const stateData = await this.domainService.restoreFromBackup(id);

        if (stateData) {
          this.logOperationSuccess('备份恢复成功', { backupId });
        } else {
          this.logWarning('备份恢复失败', { backupId, reason: '备份不存在或无法恢复' });
        }

        return stateData;
      },
      { backupId }
    );
  }

  /**
   * 获取备份链
   */
  async getBackupChain(checkpointId: string): Promise<CheckpointInfo[]> {
    return this.executeListOperation(
      '备份链',
      async () => {
        const id = this.parseId(checkpointId, '检查点ID');
        const backupChain = await this.domainService.getBackupChain(id);

        return backupChain.map(cp => this.mapCheckpointToInfo(cp));
      },
      { checkpointId }
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