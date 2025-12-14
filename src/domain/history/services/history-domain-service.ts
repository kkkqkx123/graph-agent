import { ID } from '../../common/value-objects/id';
import { History } from '../entities/history';
import { HistoryType } from '../value-objects/history-type';

/**
 * 历史领域服务接口
 * 
 * 定义历史记录相关的业务逻辑
 */
export interface HistoryDomainService {
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
   * 记录检查点创建历史
   * @param checkpointId 检查点ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordCheckpointCreated(
    checkpointId: ID,
    threadId: ID,
    sessionId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录检查点恢复历史
   * @param checkpointId 检查点ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordCheckpointRestored(
    checkpointId: ID,
    threadId: ID,
    sessionId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录节点执行历史
   * @param nodeId 节点ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordNodeExecuted(
    nodeId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录节点失败历史
   * @param nodeId 节点ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param error 错误信息
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordNodeFailed(
    nodeId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    error?: Error,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录工具执行历史
   * @param toolId 工具ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordToolExecuted(
    toolId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录工具失败历史
   * @param toolId 工具ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param error 错误信息
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordToolFailed(
    toolId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    error?: Error,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录LLM调用历史
   * @param llmRequestId LLM请求ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordLLMCalled(
    llmRequestId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

  /**
   * 记录LLM失败历史
   * @param llmRequestId LLM请求ID
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param error 错误信息
   * @param details 详细信息
   * @param metadata 元数据
   * @returns 历史记录
   */
  recordLLMFailed(
    llmRequestId: ID,
    threadId?: ID,
    sessionId?: ID,
    workflowId?: ID,
    error?: Error,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<History>;

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