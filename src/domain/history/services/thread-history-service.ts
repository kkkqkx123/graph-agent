import { ID } from '../../common/value-objects/id';
import { History } from '../entities/history';
import { HistoryType } from '../value-objects/history-type';

/**
 * 线程历史服务接口
 * 
 * 职责：专门处理线程相关的历史记录
 */
export interface IThreadHistoryService {
  /**
   * 记录线程创建历史
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordThreadCreated(
    threadId: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录线程状态变更历史
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param oldStatus 旧状态
   * @param newStatus 新状态
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordThreadStatusChanged(
    threadId: ID,
    sessionId?: ID,
    oldStatus?: string,
    newStatus?: string,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录线程失败历史
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param error 错误信息
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordThreadFailed(
    threadId: ID,
    sessionId?: ID,
    error?: Error,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 获取线程的历史记录
   * @param threadId 线程ID
   * @param options 查询选项
   * @returns 历史记录列表
   */
  getThreadHistory(
    threadId: ID,
    options?: {
      types?: HistoryType[];
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<History[]>;
}