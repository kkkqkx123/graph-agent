import { Repository } from '../../../common/repositories/repository';
import { ID } from '../../../common/value-objects/id';
import { ThreadCheckpoint } from '../entities/thread-checkpoint';
import { CheckpointStatus } from '../value-objects/checkpoint-status';
import { CheckpointType } from '../../../checkpoint/value-objects/checkpoint-type';
import { CheckpointStatistics } from '../value-objects/checkpoint-statistics';

/**
 * Thread检查点仓储接口
 * 
 * 定义Thread检查点的数据访问契约
 */
export interface ThreadCheckpointRepository extends Repository<ThreadCheckpoint> {
  /**
   * 根据线程ID查找检查点
   * @param threadId 线程ID
   * @returns 检查点列表
   */
  findByThreadId(threadId: ID): Promise<ThreadCheckpoint[]>;

  /**
   * 根据状态查找检查点
   * @param status 检查点状态
   * @returns 检查点列表
   */
  findByStatus(status: CheckpointStatus): Promise<ThreadCheckpoint[]>;

  /**
   * 根据类型查找检查点
   * @param type 检查点类型
   * @returns 检查点列表
   */
  findByType(type: CheckpointType): Promise<ThreadCheckpoint[]>;

  /**
   * 查找过期的检查点
   * @returns 过期检查点列表
   */
  findExpired(): Promise<ThreadCheckpoint[]>;

  /**
   * 查找损坏的检查点
   * @returns 损坏检查点列表
   */
  findCorrupted(): Promise<ThreadCheckpoint[]>;

  /**
   * 查找归档的检查点
   * @returns 归档检查点列表
   */
  findArchived(): Promise<ThreadCheckpoint[]>;

  /**
   * 根据多个条件查找检查点
   * @param options 查找选项
   * @returns 检查点列表
   */
  findByOptions(options: FindCheckpointOptions): Promise<ThreadCheckpoint[]>;

  /**
   * 统计线程的检查点数量
   * @param threadId 线程ID
   * @returns 检查点数量
   */
  countByThreadId(threadId: ID): Promise<number>;

  /**
   * 根据状态统计检查点数量
   * @param status 检查点状态
   * @returns 检查点数量
   */
  countByStatus(status: CheckpointStatus): Promise<number>;

  /**
   * 根据类型统计检查点数量
   * @param type 检查点类型
   * @returns 检查点数量
   */
  countByType(type: CheckpointType): Promise<number>;

  /**
   * 获取检查点统计信息
   * @param threadId 线程ID，可选
   * @returns 统计信息
   */
  getStatistics(threadId?: ID): Promise<CheckpointStatistics>;

  /**
   * 获取线程的检查点历史
   * @param threadId 线程ID
   * @param limit 数量限制
   * @param offset 偏移量
   * @returns 检查点历史列表
   */
  getThreadHistory(threadId: ID, limit?: number, offset?: number): Promise<ThreadCheckpoint[]>;

  /**
   * 获取最新的检查点
   * @param threadId 线程ID
   * @returns 最新检查点，如果没有则返回null
   */
  getLatest(threadId: ID): Promise<ThreadCheckpoint | null>;

  /**
   * 获取最早的检查点
   * @param threadId 线程ID
   * @returns 最早检查点，如果没有则返回null
   */
  getEarliest(threadId: ID): Promise<ThreadCheckpoint | null>;

  /**
   * 获取指定类型的最新检查点
   * @param threadId 线程ID
   * @param type 检查点类型
   * @returns 最新检查点，如果没有则返回null
   */
  getLatestByType(threadId: ID, type: CheckpointType): Promise<ThreadCheckpoint | null>;

  /**
   * 批量删除检查点
   * @param checkpointIds 检查点ID列表
   * @returns 删除的检查点数量
   */
  batchDelete(checkpointIds: ID[]): Promise<number>;

  /**
   * 批量更新状态
   * @param checkpointIds 检查点ID列表
   * @param status 新状态
   * @returns 更新的检查点数量
   */
  batchUpdateStatus(checkpointIds: ID[], status: CheckpointStatus): Promise<number>;

  /**
   * 清理过期检查点
   * @param threadId 线程ID，可选
   * @returns 清理的检查点数量
   */
  cleanupExpired(threadId?: ID): Promise<number>;

  /**
   * 清理损坏检查点
   * @param threadId 线程ID，可选
   * @returns 清理的检查点数量
   */
  cleanupCorrupted(threadId?: ID): Promise<number>;

  /**
   * 归档旧检查点
   * @param threadId 线程ID
   * @param days 天数阈值
   * @returns 归档的检查点数量
   */
  archiveOld(threadId: ID, days: number): Promise<number>;

  /**
   * 检查检查点是否存在
   * @param checkpointId 检查点ID
   * @returns 是否存在
   */
  exists(checkpointId: ID): Promise<boolean>;

  /**
   * 检查线程是否有检查点
   * @param threadId 线程ID
   * @returns 是否有检查点
   */
  hasCheckpoints(threadId: ID): Promise<boolean>;

  /**
   * 获取检查点大小总和
   * @param threadId 线程ID，可选
   * @returns 大小总和（字节）
   */
  getTotalSize(threadId?: ID): Promise<number>;

  /**
   * 获取检查点恢复次数总和
   * @param threadId 线程ID，可选
   * @returns 恢复次数总和
   */
  getTotalRestoreCount(threadId?: ID): Promise<number>;

  /**
   * 获取检查点年龄统计
   * @param threadId 线程ID，可选
   * @returns 年龄统计信息
   */
  getAgeStatistics(threadId?: ID): Promise<{
    oldest: number;
    newest: number;
    average: number;
  }>;

  /**
   * 获取检查点类型分布
   * @param threadId 线程ID，可选
   * @returns 类型分布
   */
  getTypeDistribution(threadId?: ID): Promise<Record<string, number>>;

  /**
   * 获取检查点状态分布
   * @param threadId 线程ID，可选
   * @returns 状态分布
   */
  getStatusDistribution(threadId?: ID): Promise<Record<string, number>>;

  /**
   * 查找需要备份的检查点
   * @param threadId 线程ID
   * @param criteria 备份条件
   * @returns 需要备份的检查点列表
   */
  findForBackup(threadId: ID, criteria?: BackupCriteria): Promise<ThreadCheckpoint[]>;

  /**
   * 查找备份链
   * @param originalCheckpointId 原始检查点ID
   * @returns 备份链
   */
  findBackupChain(originalCheckpointId: ID): Promise<ThreadCheckpoint[]>;

  /**
   * 创建检查点备份
   * @param originalCheckpointId 原始检查点ID
   * @returns 备份检查点
   */
  createBackup(originalCheckpointId: ID): Promise<ThreadCheckpoint>;

  /**
   * 恢复检查点备份
   * @param backupCheckpointId 备份检查点ID
   * @returns 恢复的状态数据
   */
  restoreFromBackup(backupCheckpointId: ID): Promise<Record<string, unknown> | null>;
}

/**
 * 查找检查点选项
 */
export interface FindCheckpointOptions {
  threadId?: ID;
  status?: CheckpointStatus;
  type?: CheckpointType;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  minSize?: number;
  maxSize?: number;
  minRestoreCount?: number;
  maxRestoreCount?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'size' | 'restoreCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 备份条件
 */
export interface BackupCriteria {
  minRestoreCount?: number;
  maxAgeHours?: number;
  types?: CheckpointType[];
  excludeRecent?: number; // 排除最近N小时内的检查点
}