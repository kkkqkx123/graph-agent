import { ID } from '../../common/value-objects/id';
import { ToolResult } from '../entities/tool-result';

/**
 * 工具结果仓储接口
 * 
 * 定义工具结果持久化的契约
 */
export interface IToolResultRepository {
  /**
   * 保存工具结果
   * 
   * @param result 工具结果
   * @returns Promise
   */
  save(result: ToolResult): Promise<void>;

  /**
   * 根据ID查找工具结果
   * 
   * @param id 结果ID
   * @returns 工具结果或null
   */
  findById(id: ID): Promise<ToolResult | null>;

  /**
   * 根据执行ID查找工具结果
   * 
   * @param executionId 执行ID
   * @returns 工具结果或null
   */
  findByExecutionId(executionId: ID): Promise<ToolResult | null>;

  /**
   * 根据工具ID查找结果列表
   * 
   * @param toolId 工具ID
   * @returns 结果列表
   */
  findByToolId(toolId: ID): Promise<ToolResult[]>;

  /**
   * 查找成功的结果
   * 
   * @param criteria 查询条件
   * @returns 结果列表
   */
  findSuccessful(criteria?: {
    toolId?: ID;
    executionId?: ID;
    startTime?: Date;
    endTime?: Date;
    resultType?: string;
    category?: string;
    tags?: string[];
  }): Promise<ToolResult[]>;

  /**
   * 查找失败的结果
   * 
   * @param criteria 查询条件
   * @returns 结果列表
   */
  findFailed(criteria?: {
    toolId?: ID;
    executionId?: ID;
    startTime?: Date;
    endTime?: Date;
    resultType?: string;
    category?: string;
    tags?: string[];
  }): Promise<ToolResult[]>;

  /**
   * 根据结果类型查找结果
   * 
   * @param type 结果类型
   * @returns 结果列表
   */
  findByType(type: string): Promise<ToolResult[]>;

  /**
   * 根据结果格式查找结果
   * 
   * @param format 结果格式
   * @returns 结果列表
   */
  findByFormat(format: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other'): Promise<ToolResult[]>;

  /**
   * 根据分类查找结果
   * 
   * @param category 分类
   * @returns 结果列表
   */
  findByCategory(category: string): Promise<ToolResult[]>;

  /**
   * 根据标签查找结果
   * 
   * @param tags 标签列表
   * @returns 结果列表
   */
  findByTags(tags: string[]): Promise<ToolResult[]>;

  /**
   * 根据优先级查找结果
   * 
   * @param priority 优先级
   * @returns 结果列表
   */
  findByPriority(priority: 'low' | 'medium' | 'high' | 'critical'): Promise<ToolResult[]>;

  /**
   * 根据状态查找结果
   * 
   * @param status 状态
   * @returns 结果列表
   */
  findByStatus(status: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted'): Promise<ToolResult[]>;

  /**
   * 查找已过期的结果
   * 
   * @param beforeDate 过期时间
   * @returns 结果列表
   */
  findExpired(beforeDate?: Date): Promise<ToolResult[]>;

  /**
   * 根据时间范围查找结果
   * 
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 结果列表
   */
  findByTimeRange(startTime: Date, endTime: Date): Promise<ToolResult[]>;

  /**
   * 根据条件查找结果
   * 
   * @param criteria 查询条件
   * @returns 结果列表
   */
  findByCriteria(criteria: {
    toolId?: ID;
    executionId?: ID;
    success?: boolean;
    type?: string;
    format?: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other';
    category?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted';
    startTime?: Date;
    endTime?: Date;
    minSize?: number;
    maxSize?: number;
    minDuration?: number;
    maxDuration?: number;
    hasUrl?: boolean;
    hasFilePath?: boolean;
    searchText?: string;
  }): Promise<ToolResult[]>;

  /**
   * 分页查找结果
   * 
   * @param page 页码
   * @param limit 每页数量
   * @param criteria 查询条件
   * @returns 结果列表和总数
   */
  findWithPagination(
    page: number,
    limit: number,
    criteria?: {
      toolId?: ID;
      executionId?: ID;
      success?: boolean;
      type?: string;
      format?: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other';
      category?: string;
      tags?: string[];
      priority?: 'low' | 'medium' | 'high' | 'critical';
      status?: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted';
      startTime?: Date;
      endTime?: Date;
      minSize?: number;
      maxSize?: number;
      minDuration?: number;
      maxDuration?: number;
      hasUrl?: boolean;
      hasFilePath?: boolean;
      searchText?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    results: ToolResult[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * 检查结果是否存在
   * 
   * @param id 结果ID
   * @returns 是否存在
   */
  exists(id: ID): Promise<boolean>;

  /**
   * 检查执行结果是否存在
   * 
   * @param executionId 执行ID
   * @returns 是否存在
   */
  existsByExecutionId(executionId: ID): Promise<boolean>;

  /**
   * 删除结果
   * 
   * @param id 结果ID
   * @returns Promise
   */
  delete(id: ID): Promise<void>;

  /**
   * 批量删除结果
   * 
   * @param ids 结果ID列表
   * @returns Promise
   */
  deleteMany(ids: ID[]): Promise<void>;

  /**
   * 根据时间范围删除结果
   * 
   * @param beforeDate 删除此日期之前的结果
   * @returns 删除的记录数
   */
  deleteByTime(beforeDate: Date): Promise<number>;

  /**
   * 删除已过期的结果
   * 
   * @param beforeDate 过期时间
   * @returns 删除的记录数
   */
  deleteExpired(beforeDate?: Date): Promise<number>;

  /**
   * 统计结果数量
   * 
   * @param criteria 查询条件
   * @returns 数量
   */
  count(criteria?: {
    toolId?: ID;
    executionId?: ID;
    success?: boolean;
    type?: string;
    format?: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other';
    category?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted';
    startTime?: Date;
    endTime?: Date;
    minSize?: number;
    maxSize?: number;
    minDuration?: number;
    maxDuration?: number;
    hasUrl?: boolean;
    hasFilePath?: boolean;
  }): Promise<number>;

  /**
   * 按类型统计结果数量
   * 
   * @param criteria 查询条件
   * @returns 类型统计
   */
  countByType(criteria?: {
    toolId?: ID;
    executionId?: ID;
    success?: boolean;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 按格式统计结果数量
   * 
   * @param criteria 查询条件
   * @returns 格式统计
   */
  countByFormat(criteria?: {
    toolId?: ID;
    executionId?: ID;
    success?: boolean;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 按分类统计结果数量
   * 
   * @param criteria 查询条件
   * @returns 分类统计
   */
  countByCategory(criteria?: {
    toolId?: ID;
    executionId?: ID;
    success?: boolean;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 按状态统计结果数量
   * 
   * @param criteria 查询条件
   * @returns 状态统计
   */
  countByStatus(criteria?: {
    toolId?: ID;
    executionId?: ID;
    success?: boolean;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 按优先级统计结果数量
   * 
   * @param criteria 查询条件
   * @returns 优先级统计
   */
  countByPriority(criteria?: {
    toolId?: ID;
    executionId?: ID;
    success?: boolean;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 获取所有分类
   * 
   * @returns 分类列表
   */
  getAllCategories(): Promise<string[]>;

  /**
   * 获取所有标签
   * 
   * @returns 标签列表
   */
  getAllTags(): Promise<string[]>;

  /**
   * 获取所有类型
   * 
   * @returns 类型列表
   */
  getAllTypes(): Promise<string[]>;

  /**
   * 查找最近的结果
   * 
   * @param limit 数量限制
   * @param criteria 查询条件
   * @returns 结果列表
   */
  findRecent(limit: number, criteria?: {
    toolId?: ID;
    executionId?: ID;
    success?: boolean;
    type?: string;
    format?: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other';
    category?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted';
  }): Promise<ToolResult[]>;

  /**
   * 查找最大的结果
   * 
   * @param limit 数量限制
   * @param criteria 查询条件
   * @returns 结果列表
   */
  findLargest(limit: number, criteria?: {
    toolId?: ID;
    executionId?: ID;
    success?: boolean;
    type?: string;
    format?: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other';
    category?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted';
    startTime?: Date;
    endTime?: Date;
  }): Promise<ToolResult[]>;

  /**
   * 查找最常用的结果
   * 
   * @param limit 数量限制
   * @param criteria 查询条件
   * @returns 结果列表
   */
  findMostAccessed(limit: number, criteria?: {
    toolId?: ID;
    executionId?: ID;
    success?: boolean;
    type?: string;
    format?: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other';
    category?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted';
    startTime?: Date;
    endTime?: Date;
  }): Promise<ToolResult[]>;

  /**
   * 获取结果统计
   * 
   * @param criteria 查询条件
   * @returns 结果统计
   */
  getResultStatistics(criteria?: {
    toolId?: ID;
    executionId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    totalResults: number;
    successfulResults: number;
    failedResults: number;
    averageSize: number;
    totalSize: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
    failureRate: number;
  }>;

  /**
   * 获取每日结果统计
   * 
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param criteria 查询条件
   * @returns 每日结果统计
   */
  getDailyResultStatistics(
    startDate: Date,
    endDate: Date,
    criteria?: {
      toolId?: ID;
      executionId?: ID;
    }
  ): Promise<Array<{
    date: string;
    totalResults: number;
    successfulResults: number;
    failedResults: number;
    averageSize: number;
    totalSize: number;
    averageDuration: number;
  }>>;

  /**
   * 获取存储使用统计
   * 
   * @param criteria 查询条件
   * @returns 存储使用统计
   */
  getStorageUsageStatistics(criteria?: {
    toolId?: ID;
    executionId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    totalSize: number;
    usedSize: number;
    availableSize: number;
    usagePercentage: number;
    byFormat: Record<string, number>;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
  }>;

  /**
   * 清理过期数据
   * 
   * @param beforeDate 清理此日期之前的数据
   * @returns 清理的记录数
   */
  cleanupExpiredData(beforeDate: Date): Promise<number>;

  /**
   * 备份结果数据
   * 
   * @param backupPath 备份路径
   * @param criteria 查询条件
   * @returns 备份文件路径
   */
  backup(backupPath: string, criteria?: {
    toolId?: ID;
    executionId?: ID;
    success?: boolean;
    type?: string;
    format?: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other';
    category?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted';
    startTime?: Date;
    endTime?: Date;
  }): Promise<string>;

  /**
   * 恢复结果数据
   * 
   * @param backupPath 备份路径
   * @param overwrite 是否覆盖现有数据
   * @returns 恢复的记录数
   */
  restore(backupPath: string, overwrite?: boolean): Promise<number>;

  /**
   * 导出结果数据
   * 
   * @param format 导出格式
   * @param criteria 查询条件
   * @returns 导出数据
   */
  export(
    format: 'json' | 'csv' | 'xml',
    criteria?: {
      toolId?: ID;
      executionId?: ID;
      success?: boolean;
      type?: string;
      format?: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other';
      category?: string;
      tags?: string[];
      priority?: 'low' | 'medium' | 'high' | 'critical';
      status?: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted';
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<string>;

  /**
   * 导入结果数据
   * 
   * @param data 导入数据
   * @param format 数据格式
   * @param overwrite 是否覆盖现有数据
   * @returns 导入的记录数
   */
  import(data: string, format: 'json' | 'csv' | 'xml', overwrite?: boolean): Promise<number>;

  /**
   * 验证结果数据完整性
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