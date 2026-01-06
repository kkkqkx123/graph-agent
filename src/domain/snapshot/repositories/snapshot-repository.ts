import { Repository } from '../../common/repositories/repository';
import { ID } from '../../common/value-objects/id';
import { Snapshot } from '../entities/snapshot';
import { SnapshotType } from '../value-objects/snapshot-type';
import { SnapshotScope } from '../value-objects/snapshot-scope';

/**
 * 快照查询条件接口
 */
export interface SnapshotQuery {
  scope?: SnapshotScope;
  targetId?: ID;
  type?: SnapshotType;
  limit?: number;
  offset?: number;
}

/**
 * 快照仓储接口
 *
 * 定义快照持久化和检索的契约
 */
export interface ISnapshotRepository extends Repository<Snapshot> {
  /**
   * 根据范围和目标ID查找快照
   * @param scope 快照范围
   * @param targetId 目标ID
   * @returns 快照列表
   */
  findByScopeAndTarget(scope: SnapshotScope, targetId: ID): Promise<Snapshot[]>;

  /**
   * 根据范围查找快照
   * @param scope 快照范围
   * @returns 快照列表
   */
  findByScope(scope: SnapshotScope): Promise<Snapshot[]>;

  /**
   * 根据类型查找快照
   * @param type 快照类型
   * @returns 快照列表
   */
  findByType(type: SnapshotType): Promise<Snapshot[]>;

  /**
   * 查询快照
   * @param query 查询条件
   * @returns 快照列表
   */
  query(query: SnapshotQuery): Promise<Snapshot[]>;

  /**
   * 根据范围和目标ID查找最新快照
   * @param scope 快照范围
   * @param targetId 目标ID
   * @returns 最新快照或null
   */
  findLatestByScopeAndTarget(scope: SnapshotScope, targetId: ID): Promise<Snapshot | null>;

  /**
   * 根据范围查找最新快照
   * @param scope 快照范围
   * @returns 最新快照或null
   */
  findLatestByScope(scope: SnapshotScope): Promise<Snapshot | null>;

  /**
   * 根据创建时间范围查找快照
   * @param scope 快照范围
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 快照列表
   */
  findByTimeRange(scope: SnapshotScope, startTime: Date, endTime: Date): Promise<Snapshot[]>;

  /**
   * 统计快照数量
   * @param scope 快照范围
   * @returns 快照数量
   */
  countByScope(scope: SnapshotScope): Promise<number>;

  /**
   * 统计快照数量（按范围和目标ID）
   * @param scope 快照范围
   * @param targetId 目标ID
   * @returns 快照数量
   */
  countByScopeAndTarget(scope: SnapshotScope, targetId: ID): Promise<number>;

  /**
   * 统计快照数量（按类型）
   * @param type 快照类型
   * @returns 快照数量
   */
  countByType(type: SnapshotType): Promise<number>;

  /**
   * 删除范围和目标ID的所有快照
   * @param scope 快照范围
   * @param targetId 目标ID
   * @returns 删除的快照数量
   */
  deleteByScopeAndTarget(scope: SnapshotScope, targetId: ID): Promise<number>;

  /**
   * 删除指定范围的所有快照
   * @param scope 快照范围
   * @returns 删除的快照数量
   */
  deleteByScope(scope: SnapshotScope): Promise<number>;

  /**
   * 删除指定时间之前的快照
   * @param scope 快照范围
   * @param beforeTime 时间点
   * @returns 删除的快照数量
   */
  deleteByScopeBeforeTime(scope: SnapshotScope, beforeTime: Date): Promise<number>;

  /**
   * 删除指定类型的快照
   * @param type 快照类型
   * @returns 删除的快照数量
   */
  deleteByType(type: SnapshotType): Promise<number>;

  /**
   * 获取快照统计信息
   * @param scope 快照范围（可选）
   * @returns 统计信息
   */
  getStatistics(scope?: SnapshotScope): Promise<{
    total: number;
    byType: Record<string, number>;
    totalSizeBytes: number;
    latestAt?: Date;
    oldestAt?: Date;
  }>;

  /**
   * 获取快照恢复统计信息
   * @param scope 快照范围（可选）
   * @param targetId 目标ID（可选）
   * @returns 恢复统计信息
   */
  getRestoreStatistics(
    scope?: SnapshotScope,
    targetId?: ID
  ): Promise<{
    totalRestores: number;
    mostRestoredSnapshot?: Snapshot;
    lastRestoreAt?: Date;
  }>;
}
