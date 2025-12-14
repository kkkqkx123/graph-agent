import { Repository } from '../../common/repositories/repository';
import { ID } from '../../common/value-objects/id';
import { History } from '../entities/history';
import { HistoryType } from '../value-objects/history-type';

/**
 * 历史仓储接口
 * 
 * 定义历史记录持久化和检索的契约
 */
export interface HistoryRepository extends Repository<History> {
  /**
   * 根据会话ID查找历史记录
   * @param sessionId 会话ID
   * @returns 历史记录列表
   */
  findBySessionId(sessionId: ID): Promise<History[]>;

  /**
   * 根据线程ID查找历史记录
   * @param threadId 线程ID
   * @returns 历史记录列表
   */
  findByThreadId(threadId: ID): Promise<History[]>;

  /**
   * 根据工作流ID查找历史记录
   * @param workflowId 工作流ID
   * @returns 历史记录列表
   */
  findByWorkflowId(workflowId: ID): Promise<History[]>;

  /**
   * 根据类型查找历史记录
   * @param type 历史类型
   * @returns 历史记录列表
   */
  findByType(type: HistoryType): Promise<History[]>;

  /**
   * 根据多个类型查找历史记录
   * @param types 历史类型列表
   * @returns 历史记录列表
   */
  findByTypes(types: HistoryType[]): Promise<History[]>;

  /**
   * 根据实体ID和类型查找历史记录
   * @param entityId 实体ID
   * @param type 历史类型
   * @returns 历史记录列表
   */
  findByEntityIdAndType(entityId: ID, type: HistoryType): Promise<History[]>;

  /**
   * 根据创建时间范围查找历史记录
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 历史记录列表
   */
  findByTimeRange(
    startTime: Date,
    endTime: Date
  ): Promise<History[]>;

  /**
   * 根据实体ID和时间范围查找历史记录
   * @param entityId 实体ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 历史记录列表
   */
  findByEntityIdAndTimeRange(
    entityId: ID,
    startTime: Date,
    endTime: Date
  ): Promise<History[]>;

  /**
   * 根据类型和时间范围查找历史记录
   * @param type 历史类型
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 历史记录列表
   */
  findByTypeAndTimeRange(
    type: HistoryType,
    startTime: Date,
    endTime: Date
  ): Promise<History[]>;

  /**
   * 查找最新的历史记录
   * @param limit 数量限制
   * @returns 历史记录列表
   */
  findLatest(limit?: number): Promise<History[]>;

  /**
   * 查找指定实体ID的最新历史记录
   * @param entityId 实体ID
   * @param limit 数量限制
   * @returns 历史记录列表
   */
  findLatestByEntityId(entityId: ID, limit?: number): Promise<History[]>;

  /**
   * 查找指定类型的最新历史记录
   * @param type 历史类型
   * @param limit 数量限制
   * @returns 历史记录列表
   */
  findLatestByType(type: HistoryType, limit?: number): Promise<History[]>;

  /**
   * 统计历史记录数量
   * @param options 查询选项
   * @returns 历史记录数量
   */
  countByCriteria(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    type?: HistoryType;
    startTime?: Date;
    endTime?: Date;
  }): Promise<number>;

  /**
   * 统计不同类型的历史记录数量
   * @param options 查询选项
   * @returns 按类型统计的数量
   */
  countByType(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 获取历史记录统计信息
   * @param options 查询选项
   * @returns 统计信息
   */
  getStatistics(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    total: number;
    byType: Record<string, number>;
    byEntity: Record<string, number>;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    latestAt?: Date;
    oldestAt?: Date;
  }>;

  /**
   * 删除指定时间之前的历史记录
   * @param beforeTime 时间点
   * @returns 删除的历史记录数量
   */
  deleteBeforeTime(beforeTime: Date): Promise<number>;

  /**
   * 删除指定实体ID的历史记录
   * @param entityId 实体ID
   * @returns 删除的历史记录数量
   */
  deleteByEntityId(entityId: ID): Promise<number>;

  /**
   * 删除指定类型的历史记录
   * @param type 历史类型
   * @returns 删除的历史记录数量
   */
  deleteByType(type: HistoryType): Promise<number>;

  /**
   * 清理过期历史记录
   * @param retentionDays 保留天数
   * @returns 清理的历史记录数量
   */
  cleanupExpired(retentionDays: number): Promise<number>;

  /**
   * 归档历史记录
   * @param beforeTime 归档时间点
   * @returns 归档的历史记录数量
   */
  archiveBeforeTime(beforeTime: Date): Promise<number>;

  /**
   * 获取历史记录趋势
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param interval 时间间隔（分钟）
   * @returns 趋势数据
   */
  getTrend(
    startTime: Date,
    endTime: Date,
    interval: number
  ): Promise<Array<{
    timestamp: Date;
    count: number;
    byType: Record<string, number>;
  }>>;

  /**
   * 搜索历史记录
   * @param query 搜索查询
   * @param options 搜索选项
   * @returns 搜索结果
   */
  search(
    query: string,
    options?: {
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      type?: HistoryType;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<History[]>;
}