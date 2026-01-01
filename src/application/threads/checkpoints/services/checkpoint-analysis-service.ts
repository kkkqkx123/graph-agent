/**
 * 检查点分析服务
 * 
 * 负责检查点的统计、分析、清理和健康检查等功能
 */

import { CheckpointStatistics } from '../../../../domain/threads/checkpoints/value-objects/checkpoint-statistics';
import { ThreadCheckpointDomainService, ThreadCheckpointDomainServiceImpl } from '../../../../domain/threads/checkpoints/services/thread-checkpoint-domain-service';
import { IThreadCheckpointRepository } from '../../../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { BaseApplicationService } from '../../../common/base-application-service';
import { ILogger } from '../../../../domain/common/types';

/**
 * 检查点分析服务
 */
export class CheckpointAnalysisService extends BaseApplicationService {
  private readonly domainService: ThreadCheckpointDomainService;

  constructor(
    private readonly repository: IThreadCheckpointRepository,
    logger: ILogger
  ) {
    super(logger);
    this.domainService = new ThreadCheckpointDomainServiceImpl(repository);
  }

  /**
   * 获取服务名称
   */
  protected getServiceName(): string {
    return '检查点分析';
  }

  /**
   * 清理过期检查点
   */
  async cleanupExpiredCheckpoints(threadId?: string): Promise<number> {
    return this.executeCleanupOperation(
      '过期检查点',
      async () => {
        const id = threadId ? this.parseId(threadId, '线程ID') : undefined;
        const cleanedCount = await this.domainService.cleanupExpiredCheckpoints(id);

        this.logOperationSuccess('过期检查点清理完成', {
          threadId,
          cleanedCount
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
        const cleanedCount = await this.domainService.cleanupExcessCheckpoints(id, maxCount);

        this.logOperationSuccess('多余检查点清理完成', {
          threadId,
          maxCount,
          cleanedCount
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
        const archivedCount = await this.domainService.archiveOldCheckpoints(id, days);

        this.logOperationSuccess('旧检查点归档完成', {
          threadId,
          days,
          archivedCount
        });

        return archivedCount;
      },
      { threadId, days }
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
        return await this.domainService.analyzeCheckpointFrequency(id);
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
        return await this.domainService.analyzeCheckpointSizeDistribution(id);
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
        return await this.domainService.analyzeCheckpointTypeDistribution(id);
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
        return await this.domainService.suggestOptimizationStrategy(id);
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
        return await this.domainService.healthCheck(id);
      },
      { threadId }
    );
  }
}