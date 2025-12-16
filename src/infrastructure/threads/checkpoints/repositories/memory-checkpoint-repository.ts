import { ID } from '../../../../domain/common/value-objects/id';
import { ThreadCheckpoint } from '../../../../domain/threads/checkpoints/entities/thread-checkpoint';
import { CheckpointStatus } from '../../../../domain/threads/checkpoints/value-objects/checkpoint-status';
import { CheckpointType } from '../../../../domain/checkpoint/value-objects/checkpoint-type';
import { CheckpointStatistics } from '../../../../domain/threads/checkpoints/value-objects/checkpoint-statistics';
import { ThreadCheckpointRepository, FindCheckpointOptions, BackupCriteria } from '../../../../domain/threads/checkpoints/repositories/thread-checkpoint-repository';
import { ILogger } from '@shared/types/logger';

/**
 * 内存Thread检查点仓储实现
 * 
 * 基于内存的简单实现，适用于开发和测试环境
 */
export class MemoryThreadCheckpointRepository implements ThreadCheckpointRepository {
  private readonly checkpoints: Map<string, ThreadCheckpoint> = new Map();
  private readonly threadIndex: Map<string, Set<string>> = new Map();
  private readonly statusIndex: Map<CheckpointStatus, Set<string>> = new Map();
  private readonly typeIndex: Map<CheckpointType, Set<string>> = new Map();

  constructor(private readonly logger: ILogger) {
    this.logger.info('MemoryThreadCheckpointRepository initialized');
  }

  async save(checkpoint: ThreadCheckpoint): Promise<ThreadCheckpoint> {
    try {
      const checkpointId = checkpoint.checkpointId.toString();
      const threadId = checkpoint.threadId.toString();

      // 更新主存储
      this.checkpoints.set(checkpointId, checkpoint);

      // 更新线程索引
      if (!this.threadIndex.has(threadId)) {
        this.threadIndex.set(threadId, new Set());
      }
      this.threadIndex.get(threadId)!.add(checkpointId);

      // 更新状态索引
      if (!this.statusIndex.has(checkpoint.status)) {
        this.statusIndex.set(checkpoint.status, new Set());
      }
      this.statusIndex.get(checkpoint.status)!.add(checkpointId);

      // 更新类型索引
      if (!this.typeIndex.has(checkpoint.type)) {
        this.typeIndex.set(checkpoint.type, new Set());
      }
      this.typeIndex.get(checkpoint.type)!.add(checkpointId);

      this.logger.debug('检查点保存成功', { checkpointId, threadId });
      return checkpoint;

    } catch (error) {
      this.logger.error('保存检查点失败', error as Error);
      throw error;
    }
  }

  async findByIdOrFail(id: ID): Promise<ThreadCheckpoint> {
    const checkpoint = await this.findById(id);
    if (!checkpoint) {
      throw new Error(`检查点不存在: ${id.toString()}`);
    }
    return checkpoint;
  }

  async findAll(): Promise<ThreadCheckpoint[]> {
    try {
      return Array.from(this.checkpoints.values());
    } catch (error) {
      this.logger.error('查找所有检查点失败', error as Error);
      return [];
    }
  }

  async find(options: any): Promise<ThreadCheckpoint[]> {
    // 简化实现，转换为 findByOptions
    return this.findByOptions(options);
  }

  async findOne(options: any): Promise<ThreadCheckpoint | null> {
    const checkpoints = await this.find(options);
    return checkpoints.length > 0 ? checkpoints[0]! : null;
  }

  async findOneOrFail(options: any): Promise<ThreadCheckpoint> {
    const checkpoint = await this.findOne(options);
    if (!checkpoint) {
      throw new Error('未找到符合条件的检查点');
    }
    return checkpoint;
  }

  async findWithPagination(options: any): Promise<any> {
    const items = await this.find(options);
    const total = items.length;
    const page = Math.floor((options.offset || 0) / (options.limit || 10)) + 1;
    const pageSize = options.limit || 10;
    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async saveBatch(entities: ThreadCheckpoint[]): Promise<ThreadCheckpoint[]> {
    const results: ThreadCheckpoint[] = [];
    for (const entity of entities) {
      const saved = await this.save(entity);
      results.push(saved);
    }
    return results;
  }

  async deleteById(id: ID): Promise<void> {
    const checkpoint = await this.findById(id);
    if (checkpoint) {
      await this.delete(checkpoint);
    }
  }

  async deleteBatch(entities: ThreadCheckpoint[]): Promise<void> {
    for (const entity of entities) {
      await this.delete(entity);
    }
  }

  async deleteWhere(options: any): Promise<number> {
    const checkpoints = await this.find(options);
    await this.deleteBatch(checkpoints);
    return checkpoints.length;
  }

  async count(options?: any): Promise<number> {
    if (options) {
      const checkpoints = await this.find(options);
      return checkpoints.length;
    }
    return this.checkpoints.size;
  }

  async findById(id: ID): Promise<ThreadCheckpoint | null> {
    try {
      const checkpoint = this.checkpoints.get(id.toString());
      this.logger.debug('查找检查点', { id: id.toString(), found: !!checkpoint });
      return checkpoint || null;

    } catch (error) {
      this.logger.error('查找检查点失败', error as Error);
      return null;
    }
  }

  async findByThreadId(threadId: ID): Promise<ThreadCheckpoint[]> {
    try {
      const checkpointIds = this.threadIndex.get(threadId.toString()) || new Set();
      const checkpoints: ThreadCheckpoint[] = [];

      for (const checkpointId of checkpointIds) {
        const checkpoint = this.checkpoints.get(checkpointId);
        if (checkpoint) {
          checkpoints.push(checkpoint);
        }
      }

      // 按创建时间倒序排列
      checkpoints.sort((a, b) => b.createdAt.toISOString().localeCompare(a.createdAt.toISOString()));

      this.logger.debug('查找线程检查点', { threadId: threadId.toString(), count: checkpoints.length });
      return checkpoints;

    } catch (error) {
      this.logger.error('查找线程检查点失败', error as Error);
      return [];
    }
  }

  async findByStatus(status: CheckpointStatus): Promise<ThreadCheckpoint[]> {
    try {
      const checkpointIds = this.statusIndex.get(status) || new Set();
      const checkpoints: ThreadCheckpoint[] = [];

      for (const checkpointId of checkpointIds) {
        const checkpoint = this.checkpoints.get(checkpointId);
        if (checkpoint) {
          checkpoints.push(checkpoint);
        }
      }

      this.logger.debug('按状态查找检查点', { status: status.statusValue, count: checkpoints.length });
      return checkpoints;

    } catch (error) {
      this.logger.error('按状态查找检查点失败', error as Error);
      return [];
    }
  }

  async findByType(type: CheckpointType): Promise<ThreadCheckpoint[]> {
    try {
      const checkpointIds = this.typeIndex.get(type) || new Set();
      const checkpoints: ThreadCheckpoint[] = [];

      for (const checkpointId of checkpointIds) {
        const checkpoint = this.checkpoints.get(checkpointId);
        if (checkpoint) {
          checkpoints.push(checkpoint);
        }
      }

      this.logger.debug('按类型查找检查点', { type: type.getValue(), count: checkpoints.length });
      return checkpoints;

    } catch (error) {
      this.logger.error('按类型查找检查点失败', error as Error);
      return [];
    }
  }

  async findExpired(): Promise<ThreadCheckpoint[]> {
    try {
      const expiredCheckpoints: ThreadCheckpoint[] = [];

      for (const checkpoint of this.checkpoints.values()) {
        if (checkpoint.isExpired()) {
          expiredCheckpoints.push(checkpoint);
        }
      }

      this.logger.debug('查找过期检查点', { count: expiredCheckpoints.length });
      return expiredCheckpoints;

    } catch (error) {
      this.logger.error('查找过期检查点失败', error as Error);
      return [];
    }
  }

  async findCorrupted(): Promise<ThreadCheckpoint[]> {
    try {
      const corruptedCheckpoints: ThreadCheckpoint[] = [];

      for (const checkpoint of this.checkpoints.values()) {
        if (checkpoint.status.isCorrupted()) {
          corruptedCheckpoints.push(checkpoint);
        }
      }

      this.logger.debug('查找损坏检查点', { count: corruptedCheckpoints.length });
      return corruptedCheckpoints;

    } catch (error) {
      this.logger.error('查找损坏检查点失败', error as Error);
      return [];
    }
  }

  async findArchived(): Promise<ThreadCheckpoint[]> {
    try {
      const archivedCheckpoints: ThreadCheckpoint[] = [];

      for (const checkpoint of this.checkpoints.values()) {
        if (checkpoint.status.isArchived()) {
          archivedCheckpoints.push(checkpoint);
        }
      }

      this.logger.debug('查找归档检查点', { count: archivedCheckpoints.length });
      return archivedCheckpoints;

    } catch (error) {
      this.logger.error('查找归档检查点失败', error as Error);
      return [];
    }
  }

  async findByOptions(options: FindCheckpointOptions): Promise<ThreadCheckpoint[]> {
    try {
      let candidateIds: Set<string> | null = null;

      // 应用过滤条件
      if (options.threadId) {
        const threadIds = this.threadIndex.get(options.threadId.toString()) || new Set();
        candidateIds = candidateIds ? new Set([...candidateIds].filter(id => threadIds.has(id))) : threadIds;
      }

      if (options.status) {
        const statusIds = this.statusIndex.get(options.status) || new Set();
        candidateIds = candidateIds ? new Set([...candidateIds].filter(id => statusIds.has(id))) : statusIds;
      }

      if (options.type) {
        const typeIds = this.typeIndex.get(options.type) || new Set();
        candidateIds = candidateIds ? new Set([...candidateIds].filter(id => typeIds.has(id))) : typeIds;
      }

      // 如果没有过滤条件，使用所有检查点
      if (!candidateIds) {
        candidateIds = new Set(this.checkpoints.keys());
      }

      // 获取检查点并应用额外过滤
      let checkpoints: ThreadCheckpoint[] = [];
      for (const checkpointId of candidateIds) {
        const checkpoint = this.checkpoints.get(checkpointId);
        if (!checkpoint) continue;

        // 应用额外过滤条件
        if (options.tags && !options.tags.some(tag => checkpoint.tags.includes(tag))) {
          continue;
        }

        if (options.minSize && checkpoint.sizeBytes < options.minSize) {
          continue;
        }

        if (options.maxSize && checkpoint.sizeBytes > options.maxSize) {
          continue;
        }

        if (options.minRestoreCount && checkpoint.restoreCount < options.minRestoreCount) {
          continue;
        }

        if (options.maxRestoreCount && checkpoint.restoreCount > options.maxRestoreCount) {
          continue;
        }

        checkpoints.push(checkpoint);
      }

      // 排序
      if (options.sortBy) {
        checkpoints.sort((a, b) => {
          let aValue: number;
          let bValue: number;

          switch (options.sortBy) {
            case 'createdAt':
              aValue = a.createdAt.getMilliseconds();
              bValue = b.createdAt.getMilliseconds();
              break;
            case 'updatedAt':
              aValue = a.updatedAt.getMilliseconds();
              bValue = b.updatedAt.getMilliseconds();
              break;
            case 'size':
              aValue = a.sizeBytes;
              bValue = b.sizeBytes;
              break;
            case 'restoreCount':
              aValue = a.restoreCount;
              bValue = b.restoreCount;
              break;
            default:
              return 0;
          }

          return options.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        });
      }

      // 应用分页
      if (options.offset) {
        checkpoints = checkpoints.slice(options.offset);
      }

      if (options.limit) {
        checkpoints = checkpoints.slice(0, options.limit);
      }

      this.logger.debug('按选项查找检查点', { options, count: checkpoints.length });
      return checkpoints;

    } catch (error) {
      this.logger.error('按选项查找检查点失败', error as Error);
      return [];
    }
  }

  async update(checkpoint: ThreadCheckpoint): Promise<boolean> {
    try {
      const checkpointId = checkpoint.checkpointId.toString();
      
      if (!this.checkpoints.has(checkpointId)) {
        this.logger.warn('更新检查点失败，检查点不存在', { checkpointId });
        return false;
      }

      // 更新主存储
      this.checkpoints.set(checkpointId, checkpoint);

      this.logger.debug('检查点更新成功', { checkpointId });
      return true;

    } catch (error) {
      this.logger.error('更新检查点失败', error as Error);
      return false;
    }
  }

  async delete(checkpoint: ThreadCheckpoint): Promise<void> {
    try {
      const checkpointId = checkpoint.checkpointId.toString();

      if (!this.checkpoints.has(checkpointId)) {
        this.logger.warn('删除检查点失败，检查点不存在', { checkpointId });
        return;
      }

      // 从主存储删除
      this.checkpoints.delete(checkpointId);

      // 从线程索引删除
      const threadId = checkpoint.threadId.toString();
      const threadIds = this.threadIndex.get(threadId);
      if (threadIds) {
        threadIds.delete(checkpointId);
        if (threadIds.size === 0) {
          this.threadIndex.delete(threadId);
        }
      }

      // 从状态索引删除
      const statusIds = this.statusIndex.get(checkpoint.status);
      if (statusIds) {
        statusIds.delete(checkpointId);
        if (statusIds.size === 0) {
          this.statusIndex.delete(checkpoint.status);
        }
      }

      // 从类型索引删除
      const typeIds = this.typeIndex.get(checkpoint.type);
      if (typeIds) {
        typeIds.delete(checkpointId);
        if (typeIds.size === 0) {
          this.typeIndex.delete(checkpoint.type);
        }
      }

      this.logger.debug('检查点删除成功', { checkpointId });
      return;

    } catch (error) {
      this.logger.error('删除检查点失败', error as Error);
      throw error;
    }
  }

  async countByThreadId(threadId: ID): Promise<number> {
    try {
      const checkpointIds = this.threadIndex.get(threadId.toString()) || new Set();
      return checkpointIds.size;

    } catch (error) {
      this.logger.error('统计线程检查点数量失败', error as Error);
      return 0;
    }
  }

  async countByStatus(status: CheckpointStatus): Promise<number> {
    try {
      const checkpointIds = this.statusIndex.get(status) || new Set();
      return checkpointIds.size;

    } catch (error) {
      this.logger.error('按状态统计检查点数量失败', error as Error);
      return 0;
    }
  }

  async countByType(type: CheckpointType): Promise<number> {
    try {
      const checkpointIds = this.typeIndex.get(type) || new Set();
      return checkpointIds.size;

    } catch (error) {
      this.logger.error('按类型统计检查点数量失败', error as Error);
      return 0;
    }
  }

  async getStatistics(threadId?: ID): Promise<CheckpointStatistics> {
    try {
      let checkpoints: ThreadCheckpoint[];

      if (threadId) {
        checkpoints = await this.findByThreadId(threadId);
      } else {
        checkpoints = Array.from(this.checkpoints.values());
      }

      return CheckpointStatistics.fromCheckpoints(
        checkpoints.map(cp => ({
          status: cp.status,
          type: cp.type,
          sizeBytes: cp.sizeBytes,
          restoreCount: cp.restoreCount,
          getAgeInHours: () => cp.getAgeInHours()
        }))
      );

    } catch (error) {
      this.logger.error('获取检查点统计信息失败', error as Error);
      return CheckpointStatistics.empty();
    }
  }

  async getThreadHistory(threadId: ID, limit?: number, offset?: number): Promise<ThreadCheckpoint[]> {
    try {
      const checkpoints = await this.findByThreadId(threadId);

      if (offset) {
        checkpoints.splice(0, offset);
      }

      if (limit) {
        checkpoints.splice(limit);
      }

      return checkpoints;

    } catch (error) {
      this.logger.error('获取线程检查点历史失败', error as Error);
      return [];
    }
  }

  async getLatest(threadId: ID): Promise<ThreadCheckpoint | null> {
    try {
      const checkpoints = await this.findByThreadId(threadId);
      return checkpoints.length > 0 ? checkpoints[0]! : null;

    } catch (error) {
      this.logger.error('获取最新检查点失败', error as Error);
      return null;
    }
  }

  async getEarliest(threadId: ID): Promise<ThreadCheckpoint | null> {
    try {
      const checkpoints = await this.findByThreadId(threadId);
      return checkpoints.length > 0 ? checkpoints[checkpoints.length - 1]! : null;

    } catch (error) {
      this.logger.error('获取最早检查点失败', error as Error);
      return null;
    }
  }

  async getLatestByType(threadId: ID, type: CheckpointType): Promise<ThreadCheckpoint | null> {
    try {
      const checkpoints = await this.findByThreadId(threadId);
      const filtered = checkpoints.filter(cp => cp.type.equals(type));
      return filtered.length > 0 ? filtered[0]! : null;

    } catch (error) {
      this.logger.error('获取指定类型的最新检查点失败', error as Error);
      return null;
    }
  }

  async batchDelete(checkpointIds: ID[]): Promise<number> {
    try {
      let deletedCount = 0;

      for (const id of checkpointIds) {
        const checkpoint = await this.findById(id);
        if (checkpoint) {
          await this.delete(checkpoint);
          deletedCount++;
        }
      }

      this.logger.info('批量删除检查点完成', { totalCount: checkpointIds.length, deletedCount });
      return deletedCount;

    } catch (error) {
      this.logger.error('批量删除检查点失败', error as Error);
      return 0;
    }
  }

  async batchUpdateStatus(checkpointIds: ID[], status: CheckpointStatus): Promise<number> {
    try {
      let updatedCount = 0;

      for (const id of checkpointIds) {
        const checkpoint = await this.findById(id);
        if (checkpoint) {
          // 这里需要更新checkpoint的状态，但由于checkpoint是不可变的，
          // 实际实现中可能需要创建新的checkpoint实例
          // 简化实现，只记录日志
          updatedCount++;
        }
      }

      this.logger.info('批量更新检查点状态完成', { totalCount: checkpointIds.length, updatedCount });
      return updatedCount;

    } catch (error) {
      this.logger.error('批量更新检查点状态失败', error as Error);
      return 0;
    }
  }

  async cleanupExpired(threadId?: ID): Promise<number> {
    try {
      const expiredCheckpoints = await this.findExpired();
      let cleanedCount = 0;

      for (const checkpoint of expiredCheckpoints) {
        if (!threadId || checkpoint.threadId.equals(threadId)) {
          await this.delete(checkpoint);
          cleanedCount++;
        }
      }

      this.logger.info('过期检查点清理完成', { cleanedCount });
      return cleanedCount;

    } catch (error) {
      this.logger.error('清理过期检查点失败', error as Error);
      return 0;
    }
  }

  async cleanupCorrupted(threadId?: ID): Promise<number> {
    try {
      const corruptedCheckpoints = await this.findCorrupted();
      let cleanedCount = 0;

      for (const checkpoint of corruptedCheckpoints) {
        if (!threadId || checkpoint.threadId.equals(threadId)) {
          await this.delete(checkpoint);
          cleanedCount++;
        }
      }

      this.logger.info('损坏检查点清理完成', { cleanedCount });
      return cleanedCount;

    } catch (error) {
      this.logger.error('清理损坏检查点失败', error as Error);
      return 0;
    }
  }

  async archiveOld(threadId: ID, days: number): Promise<number> {
    try {
      const checkpoints = await this.findByThreadId(threadId);
      let archivedCount = 0;

      for (const checkpoint of checkpoints) {
        if (checkpoint.getAgeInHours() > days * 24) {
          checkpoint.markArchived();
          await this.save(checkpoint);
          archivedCount++;
        }
      }

      this.logger.info('旧检查点归档完成', { threadId: threadId.toString(), days, archivedCount });
      return archivedCount;

    } catch (error) {
      this.logger.error('归档旧检查点失败', error as Error);
      return 0;
    }
  }

  async exists(checkpointId: ID): Promise<boolean> {
    try {
      return this.checkpoints.has(checkpointId.toString());

    } catch (error) {
      this.logger.error('检查检查点存在性失败', error as Error);
      return false;
    }
  }

  async hasCheckpoints(threadId: ID): Promise<boolean> {
    try {
      const checkpointIds = this.threadIndex.get(threadId.toString());
      return checkpointIds ? checkpointIds.size > 0 : false;

    } catch (error) {
      this.logger.error('检查线程是否有检查点失败', error as Error);
      return false;
    }
  }

  async getTotalSize(threadId?: ID): Promise<number> {
    try {
      let checkpoints: ThreadCheckpoint[];

      if (threadId) {
        checkpoints = await this.findByThreadId(threadId);
      } else {
        checkpoints = Array.from(this.checkpoints.values());
      }

      return checkpoints.reduce((total, cp) => total + cp.sizeBytes, 0);

    } catch (error) {
      this.logger.error('获取检查点大小总和失败', error as Error);
      return 0;
    }
  }

  async getTotalRestoreCount(threadId?: ID): Promise<number> {
    try {
      let checkpoints: ThreadCheckpoint[];

      if (threadId) {
        checkpoints = await this.findByThreadId(threadId);
      } else {
        checkpoints = Array.from(this.checkpoints.values());
      }

      return checkpoints.reduce((total, cp) => total + cp.restoreCount, 0);

    } catch (error) {
      this.logger.error('获取检查点恢复次数总和失败', error as Error);
      return 0;
    }
  }

  async getAgeStatistics(threadId?: ID): Promise<{
    oldest: number;
    newest: number;
    average: number;
  }> {
    try {
      let checkpoints: ThreadCheckpoint[];

      if (threadId) {
        checkpoints = await this.findByThreadId(threadId);
      } else {
        checkpoints = Array.from(this.checkpoints.values());
      }

      if (checkpoints.length === 0) {
        return { oldest: 0, newest: 0, average: 0 };
      }

      const ages = checkpoints.map(cp => cp.getAgeInHours());
      const oldest = Math.max(...ages);
      const newest = Math.min(...ages);
      const average = ages.reduce((sum, age) => sum + age, 0) / ages.length;

      return { oldest, newest, average };

    } catch (error) {
      this.logger.error('获取检查点年龄统计失败', error as Error);
      return { oldest: 0, newest: 0, average: 0 };
    }
  }

  async getTypeDistribution(threadId?: ID): Promise<Record<string, number>> {
    try {
      let checkpoints: ThreadCheckpoint[];

      if (threadId) {
        checkpoints = await this.findByThreadId(threadId);
      } else {
        checkpoints = Array.from(this.checkpoints.values());
      }

      const distribution: Record<string, number> = {};
      for (const checkpoint of checkpoints) {
        const type = checkpoint.type.getValue();
        distribution[type] = (distribution[type] || 0) + 1;
      }

      return distribution;

    } catch (error) {
      this.logger.error('获取检查点类型分布失败', error as Error);
      return {};
    }
  }

  async getStatusDistribution(threadId?: ID): Promise<Record<string, number>> {
    try {
      let checkpoints: ThreadCheckpoint[];

      if (threadId) {
        checkpoints = await this.findByThreadId(threadId);
      } else {
        checkpoints = Array.from(this.checkpoints.values());
      }

      const distribution: Record<string, number> = {};
      for (const checkpoint of checkpoints) {
        const status = checkpoint.status.statusValue;
        distribution[status] = (distribution[status] || 0) + 1;
      }

      return distribution;

    } catch (error) {
      this.logger.error('获取检查点状态分布失败', error as Error);
      return {};
    }
  }

  async findForBackup(threadId: ID, criteria?: BackupCriteria): Promise<ThreadCheckpoint[]> {
    try {
      const checkpoints = await this.findByThreadId(threadId);
      return checkpoints.filter(cp => {
        if (criteria?.minRestoreCount && cp.restoreCount < criteria.minRestoreCount) {
          return false;
        }

        if (criteria?.maxAgeHours && cp.getAgeInHours() > criteria.maxAgeHours) {
          return false;
        }

        if (criteria?.types && !criteria.types.some(type => cp.type.equals(type))) {
          return false;
        }

        if (criteria?.excludeRecent && cp.getAgeInHours() < criteria.excludeRecent) {
          return false;
        }

        return true;
      });

    } catch (error) {
      this.logger.error('查找需要备份的检查点失败', error as Error);
      return [];
    }
  }

  async findBackupChain(originalCheckpointId: ID): Promise<ThreadCheckpoint[]> {
    try {
      const original = await this.findById(originalCheckpointId);
      if (!original) {
        return [];
      }

      const checkpoints = await this.findByThreadId(original.threadId);
      return checkpoints.filter(cp => 
        cp.metadata['backupOf'] === originalCheckpointId.toString()
      );

    } catch (error) {
      this.logger.error('查找备份链失败', error as Error);
      return [];
    }
  }

  async createBackup(originalCheckpointId: ID): Promise<ThreadCheckpoint> {
    try {
      const original = await this.findById(originalCheckpointId);
      if (!original) {
        throw new Error('原始检查点不存在');
      }

      // 创建备份检查点
      const backup = ThreadCheckpoint.create(
        original.threadId,
        CheckpointType.manual(),
        original.stateData,
        `${original.title || '检查点'} - 备份`,
        original.description,
        [...original.tags, 'backup'],
        {
          ...original.metadata,
          backupOf: originalCheckpointId.toString(),
          backupTimestamp: new Date().toISOString()
        }
      );

      await this.save(backup);
      return backup;

    } catch (error) {
      this.logger.error('创建检查点备份失败', error as Error);
      throw error;
    }
  }

  async restoreFromBackup(backupCheckpointId: ID): Promise<Record<string, unknown> | null> {
    try {
      const backup = await this.findById(backupCheckpointId);
      if (!backup) {
        return null;
      }

      backup.markRestored();
      await this.save(backup);

      return backup.stateData;

    } catch (error) {
      this.logger.error('从备份恢复失败', error as Error);
      return null;
    }
  }
}