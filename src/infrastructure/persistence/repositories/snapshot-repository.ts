import { injectable, inject } from 'inversify';
import { SnapshotRepository as ISnapshotRepository, SnapshotQuery } from '../../../domain/snapshot/repositories/snapshot-repository';
import { Snapshot } from '../../../domain/snapshot/entities/snapshot';
import { ID } from '../../../domain/common/value-objects/id';
import { SnapshotType } from '../../../domain/snapshot/value-objects/snapshot-type';
import { SnapshotScope } from '../../../domain/snapshot/value-objects/snapshot-scope';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';
import { SnapshotModel } from '../models/snapshot.model';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connections/connection-manager';

@injectable()
export class SnapshotRepository extends BaseRepository<Snapshot, SnapshotModel, ID> implements ISnapshotRepository {
  constructor(
    @inject('ConnectionManager') connectionManager: ConnectionManager
  ) {
    super(connectionManager);
  }

  protected getModelClass(): new () => SnapshotModel {
    return SnapshotModel;
  }

  /**
   * 重写toDomain方法
   */
  protected override toDomain(model: SnapshotModel): Snapshot {
    try {
      const snapshotProps = {
        id: ID.fromString(model.id),
        type: SnapshotType.fromString(model.type),
        scope: SnapshotScope.fromString(model.scope),
        targetId: model.targetId ? ID.fromString(model.targetId) : undefined,
        title: model.title,
        description: model.description,
        stateData: model.stateData,
        metadata: model.metadata || {},
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        isDeleted: model.isDeleted,
        sizeBytes: model.sizeBytes,
        restoreCount: model.restoreCount,
        lastRestoredAt: model.lastRestoredAt ? Timestamp.create(model.lastRestoredAt) : undefined
      };

      return Snapshot.fromProps(snapshotProps);
    } catch (error) {
      const errorMessage = `Snapshot模型转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { modelId: model.id, operation: 'toDomain' };
      throw customError;
    }
  }

  /**
   * 重写toModel方法
   */
  protected override toModel(entity: Snapshot): SnapshotModel {
    try {
      const model = new SnapshotModel();

      model.id = entity.snapshotId.value;
      model.type = entity.type.toString();
      model.scope = entity.scope.toString();
      model.targetId = entity.targetId?.value;
      model.title = entity.title;
      model.description = entity.description;
      model.stateData = entity.stateData;
      model.metadata = entity.metadata;
      model.createdAt = entity.createdAt.getDate();
      model.updatedAt = entity.updatedAt.getDate();
      model.version = entity.version.toString();
      model.isDeleted = entity.isDeleted();
      model.sizeBytes = entity.sizeBytes;
      model.restoreCount = entity.restoreCount;
      model.lastRestoredAt = entity.lastRestoredAt?.getDate();

      return model;
    } catch (error) {
      const errorMessage = `Snapshot实体转换失败: ${error instanceof Error ? error.message : String(error)}`;
      const customError = new Error(errorMessage);
      (customError as any).code = 'MAPPING_ERROR';
      (customError as any).context = { entityId: entity.snapshotId.value, operation: 'toModel' };
      throw customError;
    }
  }

  /**
   * 根据范围和目标ID查找快照
   */
  async findByScopeAndTarget(scope: SnapshotScope, targetId: ID): Promise<Snapshot[]> {
    return this.find({
      filters: {
        scope: scope.toString(),
        targetId: targetId.value
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 根据范围查找快照
   */
  async findByScope(scope: SnapshotScope): Promise<Snapshot[]> {
    return this.find({
      filters: { scope: scope.toString() },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 根据类型查找快照
   */
  async findByType(type: SnapshotType): Promise<Snapshot[]> {
    return this.find({
      filters: { type: type.toString() },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 查询快照
   */
  async query(query: SnapshotQuery): Promise<Snapshot[]> {
    const filters: Record<string, unknown> = {};

    if (query.scope) {
      filters['scope'] = query.scope.toString();
    }

    if (query.targetId) {
      filters['targetId'] = query.targetId.value;
    }

    if (query.type) {
      filters['type'] = query.type.toString();
    }

    return this.find({
      filters,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: query.limit,
      offset: query.offset
    });
  }

  /**
   * 删除范围和目标ID的所有快照
   */
  async deleteByScopeAndTarget(scope: SnapshotScope, targetId: ID): Promise<number> {
    return this.deleteWhere({
      filters: {
        scope: scope.toString(),
        targetId: targetId.value
      }
    });
  }

  /**
   * 删除指定范围的所有快照
   */
  async deleteByScope(scope: SnapshotScope): Promise<number> {
    return this.deleteWhere({
      filters: { scope: scope.toString() }
    });
  }

  /**
   * 删除指定时间之前的快照
   */
  async deleteByScopeBeforeTime(scope: SnapshotScope, beforeTime: Date): Promise<number> {
    try {
      const repository = await this.getRepository();
      const result = await repository
        .createQueryBuilder('snapshot')
        .delete()
        .where('snapshot.scope = :scope', { scope: scope.toString() })
        .andWhere('snapshot.createdAt < :beforeTime', { beforeTime })
        .execute();

      return result.affected || 0;
    } catch (error) {
      throw new Error(`按时间删除快照失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 删除指定类型的快照
   */
  async deleteByType(type: SnapshotType): Promise<number> {
    return this.deleteWhere({
      filters: { type: type.toString() }
    });
  }

  /**
   * 查找最新的快照
   */
  async findLatestByScopeAndTarget(scope: SnapshotScope, targetId: ID): Promise<Snapshot | null> {
    return this.findOne({
      filters: {
        scope: scope.toString(),
        targetId: targetId.value
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找指定范围的最新快照
   */
  async findLatestByScope(scope: SnapshotScope): Promise<Snapshot | null> {
    return this.findOne({
      filters: { scope: scope.toString() },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /**
   * 查找指定时间范围内的快照
   */
  async findByTimeRange(
    scope: SnapshotScope,
    startTime: Date,
    endTime: Date
  ): Promise<Snapshot[]> {
    const repository = await this.getRepository();
    const models = await repository
      .createQueryBuilder('snapshot')
      .where('snapshot.scope = :scope', { scope: scope.toString() })
      .andWhere('snapshot.createdAt BETWEEN :startTime AND :endTime', { startTime, endTime })
      .orderBy('snapshot.createdAt', 'DESC')
      .getMany();

    return models.map(model => this.toDomain(model));
  }

  /**
   * 统计快照数量
   */
  async countByScope(scope: SnapshotScope): Promise<number> {
    return this.count({
      filters: { scope: scope.toString() }
    });
  }

  /**
   * 统计范围和目标ID的快照数量
   */
  async countByScopeAndTarget(scope: SnapshotScope, targetId: ID): Promise<number> {
    return this.count({
      filters: {
        scope: scope.toString(),
        targetId: targetId.value
      }
    });
  }

  /**
   * 统计快照数量（按类型）
   */
  async countByType(type: SnapshotType): Promise<number> {
    return this.count({
      filters: { type: type.toString() }
    });
  }

  /**
   * 获取快照统计信息
   */
  async getStatistics(scope?: SnapshotScope): Promise<{
    total: number;
    byType: Record<string, number>;
    totalSizeBytes: number;
    latestAt?: Date;
    oldestAt?: Date;
  }> {
    const filters: Record<string, unknown> = {};
    if (scope) {
      filters['scope'] = scope.toString();
    }

    const snapshots = await this.find({
      filters,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    const byType: Record<string, number> = {};
    let totalSizeBytes = 0;
    let latestAt: Date | undefined;
    let oldestAt: Date | undefined;

    snapshots.forEach(snapshot => {
      const type = snapshot.type.toString();
      byType[type] = (byType[type] || 0) + 1;
      totalSizeBytes += snapshot.sizeBytes;

      const createdAt = snapshot.createdAt.getDate();
      if (!latestAt || createdAt > latestAt) {
        latestAt = createdAt;
      }
      if (!oldestAt || createdAt < oldestAt) {
        oldestAt = createdAt;
      }
    });

    return {
      total: snapshots.length,
      byType,
      totalSizeBytes,
      latestAt,
      oldestAt
    };
  }

  /**
   * 获取快照恢复统计信息
   */
  async getRestoreStatistics(
    scope?: SnapshotScope,
    targetId?: ID
  ): Promise<{
    totalRestores: number;
    mostRestoredSnapshot?: Snapshot;
    lastRestoreAt?: Date;
  }> {
    const filters: Record<string, unknown> = {};
    if (scope) {
      filters['scope'] = scope.toString();
    }
    if (targetId) {
      filters['targetId'] = targetId.value;
    }

    const snapshots = await this.find({
      filters,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    let totalRestores = 0;
    let mostRestoredSnapshot: Snapshot | undefined;
    let lastRestoreAt: Date | undefined;

    snapshots.forEach(snapshot => {
      totalRestores += snapshot.restoreCount;

      if (!mostRestoredSnapshot || snapshot.restoreCount > mostRestoredSnapshot.restoreCount) {
        mostRestoredSnapshot = snapshot;
      }

      if (snapshot.lastRestoredAt) {
        const restoreAt = snapshot.lastRestoredAt.getDate();
        if (!lastRestoreAt || restoreAt > lastRestoreAt) {
          lastRestoreAt = restoreAt;
        }
      }
    });

    return {
      totalRestores,
      mostRestoredSnapshot,
      lastRestoreAt
    };
  }
}