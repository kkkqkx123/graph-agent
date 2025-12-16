/**
 * 检查点DTO映射器
 * 
 * 负责检查点领域对象到DTO的转换
 */

import { ThreadCheckpoint } from '../../../../../domain/threads/checkpoints/entities/thread-checkpoint';
import { CheckpointStatistics } from '../../../../../domain/threads/checkpoints/value-objects/checkpoint-statistics';
import { BaseDtoMapper } from '../../../../common/base-dto-mapper';
import { CheckpointInfo, CheckpointStatisticsInfo } from '../../dtos';

/**
 * 检查点DTO映射器
 */
export class CheckpointDtoMapper extends BaseDtoMapper {
  /**
   * 将检查点领域对象映射为检查点信息DTO
   * @param checkpoint 检查点领域对象
   * @returns 检查点信息DTO
   */
  mapToCheckpointInfo(checkpoint: ThreadCheckpoint): CheckpointInfo {
    return {
      checkpointId: this.mapIdToString(checkpoint.checkpointId)!,
      threadId: this.mapIdToString(checkpoint.threadId)!,
      type: this.mapToString(checkpoint.type),
      status: checkpoint.status.statusValue,
      title: checkpoint.title,
      description: checkpoint.description,
      tags: this.mapStringArray(checkpoint.tags),
      metadata: this.mapRecord(checkpoint.metadata),
      createdAt: this.mapDateToIsoStringRequired(checkpoint.createdAt.getDate()),
      updatedAt: this.mapDateToIsoStringRequired(checkpoint.updatedAt.getDate()),
      expiresAt: this.mapDateToIsoString(checkpoint.expiresAt?.getDate()),
      sizeBytes: checkpoint.sizeBytes,
      restoreCount: checkpoint.restoreCount,
      lastRestoredAt: this.mapDateToIsoString(checkpoint.lastRestoredAt?.getDate())
    };
  }

  /**
   * 批量映射检查点领域对象为检查点信息DTO列表
   * @param checkpoints 检查点领域对象列表
   * @returns 检查点信息DTO列表
   */
  mapToCheckpointInfoList(checkpoints: ThreadCheckpoint[]): CheckpointInfo[] {
    return this.mapArray(checkpoints, checkpoint => this.mapToCheckpointInfo(checkpoint));
  }

  /**
   * 将检查点统计信息领域对象映射为检查点统计信息DTO
   * @param statistics 检查点统计信息领域对象
   * @returns 检查点统计信息DTO
   */
  mapToCheckpointStatisticsInfo(statistics: CheckpointStatistics): CheckpointStatisticsInfo {
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
      typeDistribution: this.mapRecord(statistics.typeDistribution),
      restoreFrequency: this.mapRecord(statistics.restoreFrequency),
      healthScore: statistics.getHealthScore(),
      healthStatus: statistics.getHealthStatus()
    };
  }
}