import { ID } from '../../common/value-objects/id';
import { LLMResponse } from '../entities/llm-response';

/**
 * LLM响应仓储接口
 * 
 * 定义LLM响应持久化的契约
 */
export interface ILLMResponseRepository {
  /**
   * 保存LLM响应
   * 
   * @param response LLM响应
   * @returns Promise
   */
  save(response: LLMResponse): Promise<void>;

  /**
   * 根据ID查找LLM响应
   * 
   * @param id 响应ID
   * @returns LLM响应或null
   */
  findById(id: ID): Promise<LLMResponse | null>;

  /**
   * 根据请求ID查找响应
   * 
   * @param requestId 请求ID
   * @returns LLM响应或null
   */
  findByRequestId(requestId: ID): Promise<LLMResponse | null>;

  /**
   * 根据模型查找响应
   * 
   * @param model 模型名称
   * @returns 响应列表
   */
  findByModel(model: string): Promise<LLMResponse[]>;

  /**
   * 根据用户ID查找响应
   * 
   * @param userId 用户ID
   * @returns 响应列表
   */
  findByUserId(userId: ID): Promise<LLMResponse[]>;

  /**
   * 根据会话ID查找响应
   * 
   * @param sessionId 会话ID
   * @returns 响应列表
   */
  findBySessionId(sessionId: ID): Promise<LLMResponse[]>;

  /**
   * 根据完成原因查找响应
   * 
   * @param finishReason 完成原因
   * @returns 响应列表
   */
  findByFinishReason(finishReason: string): Promise<LLMResponse[]>;

  /**
   * 根据时间范围查找响应
   * 
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 响应列表
   */
  findByTimeRange(startTime: Date, endTime: Date): Promise<LLMResponse[]>;

  /**
   * 查找所有响应
   * 
   * @returns 响应列表
   */
  findAll(): Promise<LLMResponse[]>;

  /**
   * 根据条件查找响应
   * 
   * @param criteria 查询条件
   * @returns 响应列表
   */
  findByCriteria(criteria: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
    requestId?: ID;
    finishReason?: string;
    startTime?: Date;
    endTime?: Date;
    minTokens?: number;
    maxTokens?: number;
    minCost?: number;
    maxCost?: number;
    searchText?: string;
  }): Promise<LLMResponse[]>;

  /**
   * 分页查找响应
   * 
   * @param page 页码
   * @param limit 每页数量
   * @param criteria 查询条件
   * @returns 响应列表和总数
   */
  findWithPagination(
    page: number,
    limit: number,
    criteria?: {
      model?: string;
      userId?: ID;
      sessionId?: ID;
      requestId?: ID;
      finishReason?: string;
      startTime?: Date;
      endTime?: Date;
      minTokens?: number;
      maxTokens?: number;
      minCost?: number;
      maxCost?: number;
      searchText?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    responses: LLMResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * 检查响应是否存在
   * 
   * @param id 响应ID
   * @returns 是否存在
   */
  exists(id: ID): Promise<boolean>;

  /**
   * 检查请求响应是否存在
   * 
   * @param requestId 请求ID
   * @returns 是否存在
   */
  existsByRequestId(requestId: ID): Promise<boolean>;

  /**
   * 删除响应
   * 
   * @param id 响应ID
   * @returns Promise
   */
  delete(id: ID): Promise<void>;

  /**
   * 批量删除响应
   * 
   * @param ids 响应ID列表
   * @returns Promise
   */
  deleteMany(ids: ID[]): Promise<void>;

  /**
   * 根据时间范围删除响应
   * 
   * @param beforeDate 删除此日期之前的响应
   * @returns 删除的记录数
   */
  deleteByTime(beforeDate: Date): Promise<number>;

  /**
   * 统计响应数量
   * 
   * @param criteria 查询条件
   * @returns 数量
   */
  count(criteria?: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
    requestId?: ID;
    finishReason?: string;
    startTime?: Date;
    endTime?: Date;
    minTokens?: number;
    maxTokens?: number;
    minCost?: number;
    maxCost?: number;
  }): Promise<number>;

  /**
   * 按模型统计响应数量
   * 
   * @param criteria 查询条件
   * @returns 模型统计
   */
  countByModel(criteria?: {
    userId?: ID;
    sessionId?: ID;
    requestId?: ID;
    finishReason?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 按用户统计响应数量
   * 
   * @param criteria 查询条件
   * @returns 用户统计
   */
  countByUser(criteria?: {
    model?: string;
    sessionId?: ID;
    requestId?: ID;
    finishReason?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 按完成原因统计响应数量
   * 
   * @param criteria 查询条件
   * @returns 完成原因统计
   */
  countByFinishReason(criteria?: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
    requestId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 获取所有模型
   * 
   * @returns 模型列表
   */
  getAllModels(): Promise<string[]>;

  /**
   * 获取所有完成原因
   * 
   * @returns 完成原因列表
   */
  getAllFinishReasons(): Promise<string[]>;

  /**
   * 查找最近的响应
   * 
   * @param limit 数量限制
   * @param criteria 查询条件
   * @returns 响应列表
   */
  findRecent(limit: number, criteria?: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
    finishReason?: string;
  }): Promise<LLMResponse[]>;

  /**
   * 查找Token使用最多的响应
   * 
   * @param limit 数量限制
   * @param criteria 查询条件
   * @returns 响应列表
   */
  findMostTokenUsage(limit: number, criteria?: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
    finishReason?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LLMResponse[]>;

  /**
   * 查找成本最高的响应
   * 
   * @param limit 数量限制
   * @param criteria 查询条件
   * @returns 响应列表
   */
  findMostExpensive(limit: number, criteria?: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
    finishReason?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LLMResponse[]>;

  /**
   * 获取响应统计
   * 
   * @param criteria 查询条件
   * @returns 响应统计
   */
  getResponseStatistics(criteria?: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
    requestId?: ID;
    finishReason?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    totalResponses: number;
    totalTokens: number;
    totalCost: number;
    averageTokensPerResponse: number;
    averageCostPerResponse: number;
    maxTokensPerResponse: number;
    minTokensPerResponse: number;
    maxCostPerResponse: number;
    minCostPerResponse: number;
    uniqueModels: number;
    uniqueUsers: number;
    uniqueSessions: number;
    finishReasonDistribution: Record<string, number>;
  }>;

  /**
   * 获取每日响应统计
   * 
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param criteria 查询条件
   * @returns 每日响应统计
   */
  getDailyResponseStatistics(
    startDate: Date,
    endDate: Date,
    criteria?: {
      model?: string;
      userId?: ID;
      sessionId?: ID;
    }
  ): Promise<Array<{
    date: string;
    totalResponses: number;
    totalTokens: number;
    totalCost: number;
    averageTokensPerResponse: number;
    averageCostPerResponse: number;
    uniqueModels: number;
    uniqueUsers: number;
  }>>;

  /**
   * 获取每小时响应统计
   * 
   * @param date 日期
   * @param criteria 查询条件
   * @returns 每小时响应统计
   */
  getHourlyResponseStatistics(
    date: Date,
    criteria?: {
      model?: string;
      userId?: ID;
      sessionId?: ID;
    }
  ): Promise<Array<{
    hour: number;
    totalResponses: number;
    totalTokens: number;
    totalCost: number;
    averageTokensPerResponse: number;
    averageCostPerResponse: number;
  }>>;

  /**
   * 获取模型性能统计
   * 
   * @param criteria 查询条件
   * @returns 模型性能统计
   */
  getModelPerformanceStatistics(criteria?: {
    userId?: ID;
    sessionId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Array<{
    model: string;
    totalResponses: number;
    averageTokensPerResponse: number;
    averageCostPerResponse: number;
    averageResponseTime: number;
    successRate: number;
    finishReasonDistribution: Record<string, number>;
  }>>;

  /**
   * 清理过期数据
   * 
   * @param beforeDate 清理此日期之前的数据
   * @returns 清理的记录数
   */
  cleanupExpiredData(beforeDate: Date): Promise<number>;

  /**
   * 备份响应数据
   * 
   * @param backupPath 备份路径
   * @param criteria 查询条件
   * @returns 备份文件路径
   */
  backup(backupPath: string, criteria?: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
    requestId?: ID;
    finishReason?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<string>;

  /**
   * 恢复响应数据
   * 
   * @param backupPath 备份路径
   * @param overwrite 是否覆盖现有数据
   * @returns 恢复的记录数
   */
  restore(backupPath: string, overwrite?: boolean): Promise<number>;

  /**
   * 导出响应数据
   * 
   * @param format 导出格式
   * @param criteria 查询条件
   * @returns 导出数据
   */
  export(
    format: 'json' | 'csv' | 'xml',
    criteria?: {
      model?: string;
      userId?: ID;
      sessionId?: ID;
      requestId?: ID;
      finishReason?: string;
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<string>;

  /**
   * 导入响应数据
   * 
   * @param data 导入数据
   * @param format 数据格式
   * @param overwrite 是否覆盖现有数据
   * @returns 导入的记录数
   */
  import(data: string, format: 'json' | 'csv' | 'xml', overwrite?: boolean): Promise<number>;

  /**
   * 验证响应数据完整性
   * 
   * @returns 验证结果
   */
  validateDataIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 重建索引
   * 
   * @returns Promise
   */
  rebuildIndexes(): Promise<void>;

  /**
   * 优化数据库
   * 
   * @returns Promise
   */
  optimize(): Promise<void>;
}