import { ID } from '../../common/value-objects/id';
import { History } from '../entities/history';
import { HistoryType } from '../value-objects/history-type';

/**
 * 通用历史服务接口
 * 
 * 职责：处理通用的历史记录操作（状态变更、错误、警告、信息等）
 */
export interface IGeneralHistoryService {
  /**
   * 记录状态变更历史
   * @param entityId 实体ID
   * @param entityType 实体类型
   * @param oldState 旧状态
   * @param newState 新状态
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordStateChanged(
    entityId: ID,
    entityType: string,
    oldState?: string,
    newState?: string,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录错误历史
   * @param error 错误信息
   * @param entityId 实体ID
   * @param entityType 实体类型
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordErrorOccurred(
    error: Error,
    entityId?: ID,
    entityType?: string,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录警告历史
   * @param warning 警告信息
   * @param entityId 实体ID
   * @param entityType 实体类型
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordWarningOccurred(
    warning: string,
    entityId?: ID,
    entityType?: string,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录信息历史
   * @param info 信息内容
   * @param entityId 实体ID
   * @param entityType 实体类型
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordInfoOccurred(
    info: string,
    entityId?: ID,
    entityType?: string,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;
}