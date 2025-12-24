import { ID } from '../../common/value-objects/id';
import { History } from '../entities/history';
import { HistoryType } from '../value-objects/history-type';

/**
 * 工作流历史服务接口
 * 
 * 职责：专门处理工作流相关的历史记录
 */
export interface IWorkflowHistoryService {
  /**
   * 记录工作流创建历史
   * @param workflowId 工作流ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordWorkflowCreated(
    workflowId: ID,
    details: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录工作流更新历史
   * @param workflowId 工作流ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordWorkflowUpdated(
    workflowId: ID,
    details: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录工作流执行历史
   * @param workflowId 工作流ID
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordWorkflowExecuted(
    workflowId: ID,
    sessionId?: ID,
    threadId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录工作流失败历史
   * @param workflowId 工作流ID
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @param error 错误信息
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordWorkflowFailed(
    workflowId: ID,
    sessionId?: ID,
    threadId?: ID,
    error?: Error,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 获取工作流的历史记录
   * @param workflowId 工作流ID
   * @param options 查询选项
   * @returns 历史记录列表
   */
  getWorkflowHistory(
    workflowId: ID,
    options?: {
      types?: HistoryType[];
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<History[]>;
}