import { ID } from '../../common/value-objects/id';
import { History } from '../entities/history';
import { HistoryType } from '../value-objects/history-type';

/**
 * 历史管理服务接口
 * 
 * 职责：处理历史记录的管理操作（批量、统计、搜索、清理等）
 */
export interface IHistoryManagementService {
  /**
   * 批量记录历史
   * @param histories 历史记录数据列表
   * @returns 创建的历史记录列表
   */
  recordBatch(
    histories: Array<{
      type: HistoryType;
      details: Record<string, unknown>;
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      title?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<History[]>;

  /**
   * 获取历史记录统计信息
   * @param options 查询选项
   * @returns 统计信息
   */
  getStatistics(
    options?: {
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<{
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
   * 获取历史记录趋势
   * @param options 查询选项
   * @returns 趋势数据
   */
  getTrend(
    options: {
      startTime: Date;
      endTime: Date;
      interval: number; // 分钟
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
    }
  ): Promise<Array<{
    timestamp: Date;
    count: number;
    byType: Record<string, number>;
  }>>;

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
   * 导出历史记录
   * @param options 导出选项
   * @returns 导出数据
   */
  exportHistory(
    options: {
      format: 'json' | 'csv' | 'xml';
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      startTime?: Date;
      endTime?: Date;
      types?: HistoryType[];
    }
  ): Promise<string>;

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
      startTime?: Date;
      endTime?: Date;
      types?: HistoryType[];
      limit?: number;
      offset?: number;
    }
  ): Promise<History[]>;
}