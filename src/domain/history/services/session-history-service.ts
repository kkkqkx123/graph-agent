import { ID } from '../../common/value-objects/id';
import { History } from '../entities/history';
import { HistoryType } from '../value-objects/history-type';

/**
 * 会话历史服务接口
 * 
 * 职责：专门处理会话相关的历史记录
 */
export interface ISessionHistoryService {
  /**
   * 记录会话创建历史
   * @param sessionId 会话ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordSessionCreated(
    sessionId: ID,
    details: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录会话关闭历史
   * @param sessionId 会话ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordSessionClosed(
    sessionId: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 获取会话的历史记录
   * @param sessionId 会话ID
   * @param options 查询选项
   * @returns 历史记录列表
   */
  getSessionHistory(
    sessionId: ID,
    options?: {
      types?: HistoryType[];
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<History[]>;
}