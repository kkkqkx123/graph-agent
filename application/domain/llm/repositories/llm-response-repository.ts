import { Repository } from '../../common/repositories/repository';
import { ID } from '../../common/value-objects/id';
import { LLMResponse } from '../entities/llm-response';

/**
 * LLM响应仓储接口
 *
 * 定义LLM响应持久化和检索的契约
 */
export interface ILLMResponseRepository extends Repository<LLMResponse> {
  /**
   * 根据请求ID查找LLM响应
   * @param requestId 请求ID
   * @returns LLM响应或null
   */
  findByRequestId(requestId: ID): Promise<LLMResponse | null>;

  /**
   * 根据会话ID查找LLM响应
   * @param sessionId 会话ID
   * @returns LLM响应列表
   */
  findBySessionId(sessionId: ID): Promise<LLMResponse[]>;

  /**
   * 根据线程ID查找LLM响应
   * @param threadId 线程ID
   * @returns LLM响应列表
   */
  findByThreadId(threadId: ID): Promise<LLMResponse[]>;

  /**
   * 根据工作流ID查找LLM响应
   * @param workflowId 工作流ID
   * @returns LLM响应列表
   */
  findByWorkflowId(workflowId: ID): Promise<LLMResponse[]>;

  /**
   * 根据节点ID查找LLM响应
   * @param nodeId 节点ID
   * @returns LLM响应列表
   */
  findByNodeId(nodeId: ID): Promise<LLMResponse[]>;

  /**
   * 根据模型名称查找LLM响应
   * @param model 模型名称
   * @returns LLM响应列表
   */
  findByModel(model: string): Promise<LLMResponse[]>;

  /**
   * 根据完成原因查找LLM响应
   * @param finishReason 完成原因
   * @returns LLM响应列表
   */
  findByFinishReason(finishReason: string): Promise<LLMResponse[]>;

  /**
   * 根据多个实体ID查找LLM响应
   * @param options 查询选项
   * @returns LLM响应列表
   */
  findByEntityIds(options: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
  }): Promise<LLMResponse[]>;

  /**
   * 根据创建时间范围查找LLM响应
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns LLM响应列表
   */
  findByTimeRange(startTime: Date, endTime: Date): Promise<LLMResponse[]>;

  /**
   * 根据会话ID和时间范围查找LLM响应
   * @param sessionId 会话ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns LLM响应列表
   */
  findBySessionIdAndTimeRange(
    sessionId: ID,
    startTime: Date,
    endTime: Date
  ): Promise<LLMResponse[]>;

  /**
   * 根据线程ID和时间范围查找LLM响应
   * @param threadId 线程ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns LLM响应列表
   */
  findByThreadIdAndTimeRange(threadId: ID, startTime: Date, endTime: Date): Promise<LLMResponse[]>;

  /**
   * 查找最新的LLM响应
   * @param limit 数量限制
   * @returns LLM响应列表
   */
  findLatest(limit?: number): Promise<LLMResponse[]>;

  /**
   * 查找指定会话ID的最新LLM响应
   * @param sessionId 会话ID
   * @param limit 数量限制
   * @returns LLM响应列表
   */
  findLatestBySessionId(sessionId: ID, limit?: number): Promise<LLMResponse[]>;

  /**
   * 查找指定线程ID的最新LLM响应
   * @param threadId 线程ID
   * @param limit 数量限制
   * @returns LLM响应列表
   */
  findLatestByThreadId(threadId: ID, limit?: number): Promise<LLMResponse[]>;

  /**
   * 查找指定工作流ID的最新LLM响应
   * @param workflowId 工作流ID
   * @param limit 数量限制
   * @returns LLM响应列表
   */
  findLatestByWorkflowId(workflowId: ID, limit?: number): Promise<LLMResponse[]>;

  /**
   * 查找指定节点ID的最新LLM响应
   * @param nodeId 节点ID
   * @param limit 数量限制
   * @returns LLM响应列表
   */
  findLatestByNodeId(nodeId: ID, limit?: number): Promise<LLMResponse[]>;

  /**
   * 查找指定模型名称的最新LLM响应
   * @param model 模型名称
   * @param limit 数量限制
   * @returns LLM响应列表
   */
  findLatestByModel(model: string, limit?: number): Promise<LLMResponse[]>;

  /**
   * 查找有工具调用的LLM响应
   * @param options 查询选项
   * @returns LLM响应列表
   */
  findWithToolCalls(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LLMResponse[]>;

  /**
   * 查找成功完成的LLM响应
   * @param options 查询选项
   * @returns LLM响应列表
   */
  findSuccessful(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LLMResponse[]>;

  /**
   * 查找失败的LLM响应
   * @param options 查询选项
   * @returns LLM响应列表
   */
  findFailed(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LLMResponse[]>;

  /**
   * 统计LLM响应数量
   * @param options 查询选项
   * @returns LLM响应数量
   */
  countByCriteria(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    finishReason?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<number>;

  /**
   * 统计不同模型的LLM响应数量
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
   * 统计不同完成原因的LLM响应数量
   * @param options 查询选项
   * @returns 按完成原因统计的数量
   */
  countByFinishReason(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 获取LLM响应统计信息
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
    byFinishReason: Record<string, number>;
    byEntity: Record<string, number>;
    totalTokens: number;
    totalCost: number;
    averageDuration: number;
    successRate: number;
    toolCallRate: number;
    latestAt?: Date;
    oldestAt?: Date;
  }>;

  /**
   * 获取Token使用统计
   * @param options 查询选项
   * @returns Token使用统计
   */
  getTokenUsage(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalPromptCost: number;
    totalCompletionCost: number;
    totalCost: number;
    averagePromptTokens: number;
    averageCompletionTokens: number;
    averageTotalTokens: number;
  }>;

  /**
   * 获取成本统计
   * @param options 查询选项
   * @returns 成本统计
   */
  getCostStatistics(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    totalCost: number;
    byModel: Record<string, number>;
    byEntity: Record<string, number>;
    averageCost: number;
    maxCost: number;
    minCost: number;
  }>;

  /**
   * 获取性能统计
   * @param options 查询选项
   * @returns 性能统计
   */
  getPerformanceStatistics(options?: {
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    model?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    averageDuration: number;
    medianDuration: number;
    maxDuration: number;
    minDuration: number;
    p95Duration: number;
    p99Duration: number;
    byModel: Record<
      string,
      {
        average: number;
        median: number;
        max: number;
        min: number;
      }
    >;
  }>;

  /**
   * 删除指定时间之前的LLM响应
   * @param beforeTime 时间点
   * @returns 删除的LLM响应数量
   */
  deleteBeforeTime(beforeTime: Date): Promise<number>;

  /**
   * 删除指定会话ID的LLM响应
   * @param sessionId 会话ID
   * @returns 删除的LLM响应数量
   */
  deleteBySessionId(sessionId: ID): Promise<number>;

  /**
   * 删除指定线程ID的LLM响应
   * @param threadId 线程ID
   * @returns 删除的LLM响应数量
   */
  deleteByThreadId(threadId: ID): Promise<number>;

  /**
   * 删除指定工作流ID的LLM响应
   * @param workflowId 工作流ID
   * @returns 删除的LLM响应数量
   */
  deleteByWorkflowId(workflowId: ID): Promise<number>;

  /**
   * 清理过期LLM响应
   * @param retentionDays 保留天数
   * @returns 清理的LLM响应数量
   */
  cleanupExpired(retentionDays: number): Promise<number>;

  /**
   * 归档LLM响应
   * @param beforeTime 归档时间点
   * @returns 归档的LLM响应数量
   */
  archiveBeforeTime(beforeTime: Date): Promise<number>;

  /**
   * 获取LLM响应趋势
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param interval 时间间隔（分钟）
   * @returns 趋势数据
   */
  getTrend(
    startTime: Date,
    endTime: Date,
    interval: number
  ): Promise<
    Array<{
      timestamp: Date;
      count: number;
      byModel: Record<string, number>;
      byFinishReason: Record<string, number>;
      totalTokens: number;
      totalCost: number;
      averageDuration: number;
    }>
  >;

  /**
   * 搜索LLM响应
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
      finishReason?: string;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<LLMResponse[]>;
}
