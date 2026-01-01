import { Repository } from '../../common/repositories/repository';
import { ID } from '../../common/value-objects/id';
import { LLMRequest } from '../entities/llm-request';

/**
 * LLM请求仓储接口
 * 
 * 定义LLM请求持久化和检索的契约
 */
export interface ILLMRequestRepository extends Repository<LLMRequest> {
  /**
   * 根据会话ID查找LLM请求
   * @param sessionId 会话ID
   * @returns LLM请求列表
   */
  findBySessionId(sessionId: ID): Promise<LLMRequest[]>;

  /**
   * 根据线程ID查找LLM请求
   * @param threadId 线程ID
   * @returns LLM请求列表
   */
  findByThreadId(threadId: ID): Promise<LLMRequest[]>;

  /**
   * 根据工作流ID查找LLM请求
   * @param workflowId 工作流ID
   * @returns LLM请求列表
   */
  findByWorkflowId(workflowId: ID): Promise<LLMRequest[]>;

  /**
   * 根据节点ID查找LLM请求
   * @param nodeId 节点ID
   * @returns LLM请求列表
   */
  findByNodeId(nodeId: ID): Promise<LLMRequest[]>;

  /**
   * 根据模型名称查找LLM请求
   * @param model 模型名称
   * @returns LLM请求列表
   */
  findByModel(model: string): Promise<LLMRequest[]>;

  /**
   * 根据多个实体ID查找LLM请求
   * @param options 查询选项
   * @returns LLM请求列表
   */
  findByEntityIds(options: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
  }): Promise<LLMRequest[]>;

  /**
   * 根据创建时间范围查找LLM请求
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns LLM请求列表
   */
  findByTimeRange(
    startTime: Date,
    endTime: Date
  ): Promise<LLMRequest[]>;

  /**
   * 根据会话ID和时间范围查找LLM请求
   * @param sessionId 会话ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns LLM请求列表
   */
  findBySessionIdAndTimeRange(
    sessionId: ID,
    startTime: Date,
    endTime: Date
  ): Promise<LLMRequest[]>;

  /**
   * 根据线程ID和时间范围查找LLM请求
   * @param threadId 线程ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns LLM请求列表
   */
  findByThreadIdAndTimeRange(
    threadId: ID,
    startTime: Date,
    endTime: Date
  ): Promise<LLMRequest[]>;

  /**
   * 查找最新的LLM请求
   * @param limit 数量限制
   * @returns LLM请求列表
   */
  findLatest(limit?: number): Promise<LLMRequest[]>;

  /**
   * 查找指定会话ID的最新LLM请求
   * @param sessionId 会话ID
   * @param limit 数量限制
   * @returns LLM请求列表
   */
  findLatestBySessionId(sessionId: ID, limit?: number): Promise<LLMRequest[]>;

  /**
   * 查找指定线程ID的最新LLM请求
   * @param threadId 线程ID
   * @param limit 数量限制
   * @returns LLM请求列表
   */
  findLatestByThreadId(threadId: ID, limit?: number): Promise<LLMRequest[]>;

  /**
   * 查找指定工作流ID的最新LLM请求
   * @param workflowId 工作流ID
   * @param limit 数量限制
   * @returns LLM请求列表
   */
  findLatestByWorkflowId(workflowId: ID, limit?: number): Promise<LLMRequest[]>;

  /**
   * 查找指定节点ID的最新LLM请求
   * @param nodeId 节点ID
   * @param limit 数量限制
   * @returns LLM请求列表
   */
  findLatestByNodeId(nodeId: ID, limit?: number): Promise<LLMRequest[]>;

  /**
   * 查找指定模型名称的最新LLM请求
   * @param model 模型名称
   * @param limit 数量限制
   * @returns LLM请求列表
   */
  findLatestByModel(model: string, limit?: number): Promise<LLMRequest[]>;

  /**
   * 统计LLM请求数量
   * @param options 查询选项
   * @returns LLM请求数量
   */
  countByCriteria(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<number>;

  /**
   * 统计不同模型的LLM请求数量
   * @param options 查询选项
   * @returns 按模型统计的数量
   */
  countByModel(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 获取LLM请求统计信息
   * @param options 查询选项
   * @returns 统计信息
   */
  getStatistics(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    total: number;
    byModel: Record<string, number>;
    byEntity: Record<string, number>;
    averageMessages: number;
    latestAt?: Date;
    oldestAt?: Date;
  }>;

  /**
   * 删除指定时间之前的LLM请求
   * @param beforeTime 时间点
   * @returns 删除的LLM请求数量
   */
  deleteBeforeTime(beforeTime: Date): Promise<number>;

  /**
   * 删除指定会话ID的LLM请求
   * @param sessionId 会话ID
   * @returns 删除的LLM请求数量
   */
  deleteBySessionId(sessionId: ID): Promise<number>;

  /**
   * 删除指定线程ID的LLM请求
   * @param threadId 线程ID
   * @returns 删除的LLM请求数量
   */
  deleteByThreadId(threadId: ID): Promise<number>;

  /**
   * 删除指定工作流ID的LLM请求
   * @param workflowId 工作流ID
   * @returns 删除的LLM请求数量
   */
  deleteByWorkflowId(workflowId: ID): Promise<number>;

  /**
   * 清理过期LLM请求
   * @param retentionDays 保留天数
   * @returns 清理的LLM请求数量
   */
  cleanupExpired(retentionDays: number): Promise<number>;

  /**
   * 归档LLM请求
   * @param beforeTime 归档时间点
   * @returns 归档的LLM请求数量
   */
  archiveBeforeTime(beforeTime: Date): Promise<number>;

  /**
   * 获取LLM请求趋势
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
    byModel: Record<string, number>;
  }>>;

  /**
   * 搜索LLM请求
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
      nodeId?: ID;
      model?: string;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<LLMRequest[]>;
}