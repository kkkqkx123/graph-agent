import { injectable } from 'inversify';
import { ID } from '../../domain/common/value-objects/id';
import { Checkpoint } from '../../domain/threads/checkpoints/entities/checkpoint';
import { CheckpointType } from '../../domain/threads/checkpoints/value-objects/checkpoint-type';
import { CheckpointStatistics } from '../../domain/threads/checkpoints/value-objects/checkpoint-statistics';
import { CheckpointCreation } from './checkpoint-creation';
import { CheckpointRestore } from './checkpoint-restore';
import { CheckpointQuery } from './checkpoint-query';
import { CheckpointCleanup } from './checkpoint-cleanup';
import { CheckpointBackup } from './checkpoint-backup';
import { CheckpointAnalysis } from './checkpoint-analysis';
import { CheckpointManagement } from './checkpoint-management';
import { ICheckpointRepository } from '../../domain/threads/checkpoints/repositories/checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';
import { BaseService } from '../common/base-service';

/**
 * 创建检查点请求DTO
 */
export interface CreateCheckpointRequest {
  threadId: string;
  type: 'auto' | 'manual' | 'error' | 'milestone';
  stateData: Record<string, unknown>;
  title?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  expirationHours?: number;
}

/**
 * 创建手动检查点请求DTO
 */
export interface CreateManualCheckpointRequest {
  threadId: string;
  stateData: Record<string, unknown>;
  title?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  expirationHours?: number;
}

/**
 * 创建错误检查点请求DTO
 */
export interface CreateErrorCheckpointRequest {
  threadId: string;
  stateData: Record<string, unknown>;
  errorMessage: string;
  errorType?: string;
  metadata?: Record<string, unknown>;
  expirationHours?: number;
}

/**
 * 创建里程碑检查点请求DTO
 */
export interface CreateMilestoneCheckpointRequest {
  threadId: string;
  stateData: Record<string, unknown>;
  milestoneName: string;
  description?: string;
  metadata?: Record<string, unknown>;
  expirationHours?: number;
}

/**
 * 检查点信息DTO
 */
export interface CheckpointInfo {
  checkpointId: string;
  threadId: string;
  type: string;
  status: string;
  title?: string;
  description?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  sizeBytes: number;
  restoreCount: number;
  lastRestoredAt?: string;
}

/**
 * 检查点统计信息DTO
 */
export interface CheckpointStatisticsInfo {
  totalCheckpoints: number;
  activeCheckpoints: number;
  expiredCheckpoints: number;
  corruptedCheckpoints: number;
  archivedCheckpoints: number;
  totalSizeBytes: number;
  averageSizeBytes: number;
  largestCheckpointBytes: number;
  smallestCheckpointBytes: number;
  totalRestores: number;
  averageRestores: number;
  oldestCheckpointAgeHours: number;
  newestCheckpointAgeHours: number;
  averageAgeHours: number;
  typeDistribution: Record<string, number>;
  restoreFrequency: Record<number, number>;
  healthScore: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
}

/**
 * Checkpoint 应用服务
 *
 * 提供 Checkpoint 的应用层服务，整合所有 checkpoint 功能
 */
@injectable()
export class CheckpointService extends BaseService {
  constructor(
    private readonly creationService: CheckpointCreation,
    private readonly restoreService: CheckpointRestore,
    private readonly queryService: CheckpointQuery,
    private readonly cleanupService: CheckpointCleanup,
    private readonly backupService: CheckpointBackup,
    private readonly analysisService: CheckpointAnalysis,
    private readonly managementService: CheckpointManagement,
    private readonly repository: ICheckpointRepository,
    logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected getServiceName(): string {
    return '检查点';
  }

  /**
   * 创建检查点
   */
  async createCheckpoint(request: CreateCheckpointRequest): Promise<string> {
    const threadId = this.parseId(request.threadId, '线程ID');
    const type = this.mapCheckpointType(request.type);

    let checkpoint: Checkpoint;

    switch (request.type) {
      case 'manual':
        checkpoint = await this.creationService.createManualCheckpoint(
          threadId,
          request.stateData,
          request.title,
          request.description,
          request.tags,
          request.metadata,
          request.expirationHours
        );
        break;

      case 'error':
        checkpoint = await this.creationService.createErrorCheckpoint(
          threadId,
          request.stateData,
          request.description || '',
          request.metadata?.['errorType'] as string,
          request.metadata,
          request.expirationHours
        );
        break;

      case 'milestone':
        checkpoint = await this.creationService.createMilestoneCheckpoint(
          threadId,
          request.stateData,
          request.title || '',
          request.description,
          request.metadata,
          request.expirationHours
        );
        break;

      case 'auto':
      default:
        checkpoint = await this.creationService.createAutoCheckpoint(
          threadId,
          request.stateData,
          request.metadata,
          request.expirationHours
        );
        break;
    }

    this.logOperationSuccess('检查点创建成功', {
      checkpointId: checkpoint.checkpointId.value,
      threadId: request.threadId,
      type: request.type,
    });

    return checkpoint.checkpointId.value.toString();
  }

  /**
   * 创建手动检查点
   */
  async createManualCheckpoint(request: CreateManualCheckpointRequest): Promise<string> {
    return await this.createCheckpoint({
      ...request,
      type: 'manual',
    });
  }

  /**
   * 创建错误检查点
   */
  async createErrorCheckpoint(request: CreateErrorCheckpointRequest): Promise<string> {
    return await this.createCheckpoint({
      threadId: request.threadId,
      type: 'error',
      stateData: request.stateData,
      description: request.errorMessage,
      metadata: {
        ...request.metadata,
        errorType: request.errorType,
      },
      expirationHours: request.expirationHours,
    });
  }

  /**
   * 创建里程碑检查点
   */
  async createMilestoneCheckpoint(request: CreateMilestoneCheckpointRequest): Promise<string> {
    return await this.createCheckpoint({
      threadId: request.threadId,
      type: 'milestone',
      stateData: request.stateData,
      title: request.milestoneName,
      description: request.description,
      metadata: request.metadata,
      expirationHours: request.expirationHours,
    });
  }

  /**
   * 从检查点恢复
   */
  async restoreFromCheckpoint(checkpointId: string): Promise<Record<string, unknown> | null> {
    return this.executeBusinessOperation(
      '检查点恢复',
      async () => {
        const id = this.parseId(checkpointId, '检查点ID');
        const stateData = await this.restoreService.restoreFromCheckpoint(id);

        if (!stateData) {
          this.logWarning('检查点恢复失败', { checkpointId, reason: '检查点不存在或无法恢复' });
        }

        return stateData;
      },
      { checkpointId }
    );
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

        return this.mapToCheckpointInfo(checkpoint);
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
        const checkpoints = await this.queryService.getThreadCheckpointHistory(id, limit);

        return checkpoints.map(cp => this.mapToCheckpointInfo(cp));
      },
      { threadId, limit }
    );
  }

  /**
   * 获取检查点统计信息
   */
  async getCheckpointStatistics(threadId?: string): Promise<CheckpointStatisticsInfo> {
    return this.executeQueryOperation(
      '检查点统计信息',
      async () => {
        const id = threadId ? this.parseId(threadId, '线程ID') : undefined;
        const statistics = await this.queryService.getCheckpointStatistics(id);

        return this.mapToCheckpointStatisticsInfo(statistics);
      },
      { threadId }
    );
  }

  /**
   * 清理过期检查点
   */
  async cleanupExpiredCheckpoints(threadId?: string): Promise<number> {
    return this.executeCleanupOperation(
      '过期检查点',
      async () => {
        const id = threadId ? this.parseId(threadId, '线程ID') : undefined;
        const cleanedCount = await this.cleanupService.cleanupExpiredCheckpoints(id);

        this.logOperationSuccess('过期检查点清理完成', {
          threadId,
          cleanedCount,
        });

        return cleanedCount;
      },
      { threadId }
    );
  }

  /**
   * 清理多余检查点
   */
  async cleanupExcessCheckpoints(threadId: string, maxCount: number): Promise<number> {
    return this.executeCleanupOperation(
      '多余检查点',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const cleanedCount = await this.cleanupService.cleanupExcessCheckpoints(id, maxCount);

        this.logOperationSuccess('多余检查点清理完成', {
          threadId,
          maxCount,
          cleanedCount,
        });

        return cleanedCount;
      },
      { threadId, maxCount }
    );
  }

  /**
   * 归档旧检查点
   */
  async archiveOldCheckpoints(threadId: string, days: number): Promise<number> {
    return this.executeCleanupOperation(
      '旧检查点',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        const archivedCount = await this.cleanupService.archiveOldCheckpoints(id, days);

        this.logOperationSuccess('旧检查点归档完成', {
          threadId,
          days,
          archivedCount,
        });

        return archivedCount;
      },
      { threadId, days }
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
        const success = await this.managementService.extendCheckpointExpiration(id, hours);

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
   * 创建检查点备份
   */
  async createBackup(checkpointId: string): Promise<string> {
    const id = this.parseId(checkpointId, '检查点ID');
    const backup = await this.backupService.createBackup(id);

    this.logOperationSuccess('检查点备份创建成功', {
      originalCheckpointId: checkpointId,
      backupId: backup.checkpointId.value,
    });

    return backup.checkpointId.value.toString();
  }

  /**
   * 从备份恢复
   */
  async restoreFromBackup(backupId: string): Promise<Record<string, unknown> | null> {
    return this.executeBusinessOperation(
      '备份恢复',
      async () => {
        const id = this.parseId(backupId, '备份ID');
        const stateData = await this.backupService.restoreFromBackup(id);

        if (!stateData) {
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
        const backupChain = await this.backupService.getBackupChain(id);

        return backupChain.map(cp => this.mapToCheckpointInfo(cp));
      },
      { checkpointId }
    );
  }

  /**
   * 分析检查点创建频率
   */
  async analyzeCheckpointFrequency(threadId: string): Promise<any> {
    return this.executeQueryOperation(
      '检查点创建频率分析',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        return await this.analysisService.analyzeCheckpointFrequency(id);
      },
      { threadId }
    );
  }

  /**
   * 分析检查点大小分布
   */
  async analyzeCheckpointSizeDistribution(threadId: string): Promise<any> {
    return this.executeQueryOperation(
      '检查点大小分布分析',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        return await this.analysisService.analyzeCheckpointSizeDistribution(id);
      },
      { threadId }
    );
  }

  /**
   * 分析检查点类型分布
   */
  async analyzeCheckpointTypeDistribution(threadId: string): Promise<any> {
    return this.executeQueryOperation(
      '检查点类型分布分析',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        return await this.analysisService.analyzeCheckpointTypeDistribution(id);
      },
      { threadId }
    );
  }

  /**
   * 建议优化策略
   */
  async suggestOptimizationStrategy(threadId: string): Promise<any> {
    return this.executeQueryOperation(
      '优化策略建议',
      async () => {
        const id = this.parseId(threadId, '线程ID');
        return await this.analysisService.suggestOptimizationStrategy(id);
      },
      { threadId }
    );
  }

  /**
   * 健康检查
   */
  async healthCheck(threadId?: string): Promise<any> {
    return this.executeQueryOperation(
      '健康检查',
      async () => {
        const id = threadId ? this.parseId(threadId, '线程ID') : undefined;
        return await this.analysisService.healthCheck(id);
      },
      { threadId }
    );
  }

  /**
   * 映射检查点类型
   */
  private mapCheckpointType(type: string): CheckpointType {
    switch (type) {
      case 'manual':
        return CheckpointType.manual();
      case 'error':
        return CheckpointType.error();
      case 'milestone':
        return CheckpointType.milestone();
      case 'auto':
      default:
        return CheckpointType.auto();
    }
  }

  /**
   * 映射到检查点信息DTO
   */
  private mapToCheckpointInfo(checkpoint: Checkpoint): CheckpointInfo {
    return {
      checkpointId: checkpoint.checkpointId.value,
      threadId: checkpoint.threadId.value,
      type: checkpoint.type.toString(),
      status: checkpoint.status.toString(),
      title: checkpoint.title,
      description: checkpoint.description,
      tags: checkpoint.tags,
      metadata: checkpoint.metadata,
      createdAt: checkpoint.createdAt.toISOString(),
      updatedAt: checkpoint.updatedAt.toISOString(),
      expiresAt: checkpoint.expiresAt?.toISOString(),
      sizeBytes: checkpoint.sizeBytes,
      restoreCount: checkpoint.restoreCount,
      lastRestoredAt: checkpoint.lastRestoredAt?.toISOString(),
    };
  }

  /**
   * 映射到检查点统计信息DTO
   */
  private mapToCheckpointStatisticsInfo(
    statistics: CheckpointStatistics
  ): CheckpointStatisticsInfo {
    return {
      totalCheckpoints: statistics.totalCheckpoints,
      activeCheckpoints: statistics.activeCheckpoints,
      expiredCheckpoints: statistics.expiredCheckpoints,
      corruptedCheckpoints: statistics.corruptedCheckpoints,
      archivedCheckpoints: statistics.archivedCheckpoints,
      totalSizeBytes: statistics.totalSizeBytes,
      averageSizeBytes: statistics.averageSizeBytes,
      largestCheckpointBytes: statistics.largestCheckpointBytes,
      smallestCheckpointBytes: statistics.smallestCheckpointBytes,
      totalRestores: statistics.totalRestores,
      averageRestores: statistics.averageRestores,
      oldestCheckpointAgeHours: statistics.oldestCheckpointAgeHours,
      newestCheckpointAgeHours: statistics.newestCheckpointAgeHours,
      averageAgeHours: statistics.averageAgeHours,
      typeDistribution: statistics.typeDistribution,
      restoreFrequency: statistics.restoreFrequency,
      healthScore: statistics.getHealthScore(),
      healthStatus: statistics.getHealthStatus(),
    };
  }
}

export { CheckpointService as Checkpoint };