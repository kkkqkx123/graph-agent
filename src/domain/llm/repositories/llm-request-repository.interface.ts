import { ID } from '../../common/value-objects/id';
import { LLMRequest } from '../entities/llm-request';

/**
 * LLM请求仓储接口
 * 
 * 定义LLM请求持久化的契约
 */
export interface ILLMRequestRepository {
  /**
   * 保存LLM请求
   * 
   * @param request LLM请求
   * @returns Promise
   */
  save(request: LLMRequest): Promise<void>;

  /**
   * 根据ID查找LLM请求
   * 
   * @param id 请求ID
   * @returns LLM请求或null
   */
  findById(id: ID): Promise<LLMRequest | null>;

  /**
   * 根据模型查找请求
   * 
   * @param model 模型名称
   * @returns 请求列表
   */
  findByModel(model: string): Promise<LLMRequest[]>;

  /**
   * 根据用户ID查找请求
   * 
   * @param userId 用户ID
   * @returns 请求列表
   */
  findByUserId(userId: ID): Promise<LLMRequest[]>;

  /**
   * 根据会话ID查找请求
   * 
   * @param sessionId 会话ID
   * @returns 请求列表
   */
  findBySessionId(sessionId: ID): Promise<LLMRequest[]>;

  /**
   * 根据时间范围查找请求
   * 
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 请求列表
   */
  findByTimeRange(startTime: Date, endTime: Date): Promise<LLMRequest[]>;

  /**
   * 查找所有请求
   * 
   * @returns 请求列表
   */
  findAll(): Promise<LLMRequest[]>;

  /**
   * 根据条件查找请求
   * 
   * @param criteria 查询条件
   * @returns 请求列表
   */
  findByCriteria(criteria: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
    startTime?: Date;
    endTime?: Date;
    minTokens?: number;
    maxTokens?: number;
    hasResponse?: boolean;
    searchText?: string;
  }): Promise<LLMRequest[]>;

  /**
   * 分页查找请求
   * 
   * @param page 页码
   * @param limit 每页数量
   * @param criteria 查询条件
   * @returns 请求列表和总数
   */
  findWithPagination(
    page: number,
    limit: number,
    criteria?: {
      model?: string;
      userId?: ID;
      sessionId?: ID;
      startTime?: Date;
      endTime?: Date;
      minTokens?: number;
      maxTokens?: number;
      hasResponse?: boolean;
      searchText?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    requests: LLMRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * 检查请求是否存在
   * 
   * @param id 请求ID
   * @returns 是否存在
   */
  exists(id: ID): Promise<boolean>;

  /**
   * 删除请求
   * 
   * @param id 请求ID
   * @returns Promise
   */
  delete(id: ID): Promise<void>;

  /**
   * 批量删除请求
   * 
   * @param ids 请求ID列表
   * @returns Promise
   */
  deleteMany(ids: ID[]): Promise<void>;

  /**
   * 根据时间范围删除请求
   * 
   * @param beforeDate 删除此日期之前的请求
   * @returns 删除的记录数
   */
  deleteByTime(beforeDate: Date): Promise<number>;

  /**
   * 统计请求数量
   * 
   * @param criteria 查询条件
   * @returns 数量
   */
  count(criteria?: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
    startTime?: Date;
    endTime?: Date;
    minTokens?: number;
    maxTokens?: number;
    hasResponse?: boolean;
  }): Promise<number>;

  /**
   * 按模型统计请求数量
   * 
   * @param criteria 查询条件
   * @returns 模型统计
   */
  countByModel(criteria?: {
    userId?: ID;
    sessionId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 按用户统计请求数量
   * 
   * @param criteria 查询条件
   * @returns 用户统计
   */
  countByUser(criteria?: {
    model?: string;
    sessionId?: ID;
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
   * 查找最近的请求
   * 
   * @param limit 数量限制
   * @param criteria 查询条件
   * @returns 请求列表
   */
  findRecent(limit: number, criteria?: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
  }): Promise<LLMRequest[]>;

  /**
   * 查找Token使用最多的请求
   * 
   * @param limit 数量限制
   * @param criteria 查询条件
   * @returns 请求列表
   */
  findMostTokenUsage(limit: number, criteria?: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<LLMRequest[]>;

  /**
   * 获取请求统计
   * 
   * @param criteria 查询条件
   * @returns 请求统计
   */
  getRequestStatistics(criteria?: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    totalRequests: number;
    totalTokens: number;
    averageTokensPerRequest: number;
    maxTokensPerRequest: number;
    minTokensPerRequest: number;
    uniqueModels: number;
    uniqueUsers: number;
    uniqueSessions: number;
  }>;

  /**
   * 获取每日请求统计
   * 
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param criteria 查询条件
   * @returns 每日请求统计
   */
  getDailyRequestStatistics(
    startDate: Date,
    endDate: Date,
    criteria?: {
      model?: string;
      userId?: ID;
      sessionId?: ID;
    }
  ): Promise<Array<{
    date: string;
    totalRequests: number;
    totalTokens: number;
    averageTokensPerRequest: number;
    uniqueModels: number;
    uniqueUsers: number;
  }>>;

  /**
   * 获取每小时请求统计
   * 
   * @param date 日期
   * @param criteria 查询条件
   * @returns 每小时请求统计
   */
  getHourlyRequestStatistics(
    date: Date,
    criteria?: {
      model?: string;
      userId?: ID;
      sessionId?: ID;
    }
  ): Promise<Array<{
    hour: number;
    totalRequests: number;
    totalTokens: number;
    averageTokensPerRequest: number;
  }>>;

  /**
   * 清理过期数据
   * 
   * @param beforeDate 清理此日期之前的数据
   * @returns 清理的记录数
   */
  cleanupExpiredData(beforeDate: Date): Promise<number>;

  /**
   * 备份请求数据
   * 
   * @param backupPath 备份路径
   * @param criteria 查询条件
   * @returns 备份文件路径
   */
  backup(backupPath: string, criteria?: {
    model?: string;
    userId?: ID;
    sessionId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<string>;

  /**
   * 恢复请求数据
   * 
   * @param backupPath 备份路径
   * @param overwrite 是否覆盖现有数据
   * @returns 恢复的记录数
   */
  restore(backupPath: string, overwrite?: boolean): Promise<number>;

  /**
   * 导出请求数据
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
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<string>;

  /**
   * 导入请求数据
   * 
   * @param data 导入数据
   * @param format 数据格式
   * @param overwrite 是否覆盖现有数据
   * @returns 导入的记录数
   */
  import(data: string, format: 'json' | 'csv' | 'xml', overwrite?: boolean): Promise<number>;

  /**
   * 验证请求数据完整性
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