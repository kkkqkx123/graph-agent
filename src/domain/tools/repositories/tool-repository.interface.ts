import { ID } from '../../common/value-objects/id';
import { Tool } from '../entities/tool';
import { ToolType } from '../value-objects/tool-type';
import { ToolStatus } from '../value-objects/tool-status';

/**
 * 工具仓储接口
 * 
 * 定义工具持久化的契约
 */
export interface IToolRepository {
  /**
   * 保存工具
   * 
   * @param tool 工具
   * @returns Promise
   */
  save(tool: Tool): Promise<void>;

  /**
   * 根据ID查找工具
   * 
   * @param id 工具ID
   * @returns 工具或null
   */
  findById(id: ID): Promise<Tool | null>;

  /**
   * 根据名称查找工具
   * 
   * @param name 工具名称
   * @returns 工具或null
   */
  findByName(name: string): Promise<Tool | null>;

  /**
   * 查找所有工具
   * 
   * @returns 工具列表
   */
  findAll(): Promise<Tool[]>;

  /**
   * 根据类型查找工具
   * 
   * @param type 工具类型
   * @returns 工具列表
   */
  findByType(type: ToolType): Promise<Tool[]>;

  /**
   * 根据状态查找工具
   * 
   * @param status 工具状态
   * @returns 工具列表
   */
  findByStatus(status: ToolStatus): Promise<Tool[]>;

  /**
   * 根据分类查找工具
   * 
   * @param category 分类
   * @returns 工具列表
   */
  findByCategory(category: string): Promise<Tool[]>;

  /**
   * 根据标签查找工具
   * 
   * @param tags 标签列表
   * @returns 工具列表
   */
  findByTags(tags: string[]): Promise<Tool[]>;

  /**
   * 根据创建者查找工具
   * 
   * @param createdBy 创建者ID
   * @returns 工具列表
   */
  findByCreatedBy(createdBy: ID): Promise<Tool[]>;

  /**
   * 查找启用的工具
   * 
   * @returns 工具列表
   */
  findEnabled(): Promise<Tool[]>;

  /**
   * 查找内置工具
   * 
   * @returns 工具列表
   */
  findBuiltin(): Promise<Tool[]>;

  /**
   * 查找自定义工具
   * 
   * @returns 工具列表
   */
  findCustom(): Promise<Tool[]>;

  /**
   * 查找活跃工具
   * 
   * @returns 工具列表
   */
  findActive(): Promise<Tool[]>;

  /**
   * 查找可用的工具（活跃或非活跃）
   * 
   * @returns 工具列表
   */
  findAvailable(): Promise<Tool[]>;

  /**
   * 查找不可用的工具（已弃用或已归档）
   * 
   * @returns 工具列表
   */
  findUnavailable(): Promise<Tool[]>;

  /**
   * 根据条件查找工具
   * 
   * @param criteria 查询条件
   * @returns 工具列表
   */
  findByCriteria(criteria: {
    type?: ToolType;
    status?: ToolStatus;
    category?: string;
    tags?: string[];
    createdBy?: ID;
    isEnabled?: boolean;
    isBuiltin?: boolean;
    searchText?: string;
  }): Promise<Tool[]>;

  /**
   * 分页查找工具
   * 
   * @param page 页码
   * @param limit 每页数量
   * @param criteria 查询条件
   * @returns 工具列表和总数
   */
  findWithPagination(
    page: number,
    limit: number,
    criteria?: {
      type?: ToolType;
      status?: ToolStatus;
      category?: string;
      tags?: string[];
      createdBy?: ID;
      isEnabled?: boolean;
      isBuiltin?: boolean;
      searchText?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    tools: Tool[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * 检查工具是否存在
   * 
   * @param id 工具ID
   * @returns 是否存在
   */
  exists(id: ID): Promise<boolean>;

  /**
   * 检查工具名称是否存在
   * 
   * @param name 工具名称
   * @param excludeId 排除的工具ID
   * @returns 是否存在
   */
  existsByName(name: string, excludeId?: ID): Promise<boolean>;

  /**
   * 删除工具
   * 
   * @param id 工具ID
   * @returns Promise
   */
  delete(id: ID): Promise<void>;

  /**
   * 批量删除工具
   * 
   * @param ids 工具ID列表
   * @returns Promise
   */
  deleteMany(ids: ID[]): Promise<void>;

  /**
   * 统计工具数量
   * 
   * @param criteria 查询条件
   * @returns 数量
   */
  count(criteria?: {
    type?: ToolType;
    status?: ToolStatus;
    category?: string;
    tags?: string[];
    createdBy?: ID;
    isEnabled?: boolean;
    isBuiltin?: boolean;
  }): Promise<number>;

  /**
   * 按类型统计工具数量
   * 
   * @returns 类型统计
   */
  countByType(): Promise<Record<string, number>>;

  /**
   * 按状态统计工具数量
   * 
   * @returns 状态统计
   */
  countByStatus(): Promise<Record<string, number>>;

  /**
   * 按分类统计工具数量
   * 
   * @returns 分类统计
   */
  countByCategory(): Promise<Record<string, number>>;

  /**
   * 按创建者统计工具数量
   * 
   * @returns 创建者统计
   */
  countByCreatedBy(): Promise<Record<string, number>>;

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
   * 查找最近创建的工具
   * 
   * @param limit 数量限制
   * @returns 工具列表
   */
  findRecentlyCreated(limit: number): Promise<Tool[]>;

  /**
   * 查找最近更新的工具
   * 
   * @param limit 数量限制
   * @returns 工具列表
   */
  findRecentlyUpdated(limit: number): Promise<Tool[]>;

  /**
   * 查找最常用的工具
   * 
   * @param limit 数量限制
   * @returns 工具列表
   */
  findMostUsed(limit: number): Promise<Tool[]>;

  /**
   * 查找依赖指定工具的工具
   * 
   * @param toolId 工具ID
   * @returns 工具列表
   */
  findDependents(toolId: ID): Promise<Tool[]>;

  /**
   * 查找指定工具依赖的工具
   * 
   * @param toolId 工具ID
   * @returns 工具列表
   */
  findDependencies(toolId: ID): Promise<Tool[]>;

  /**
   * 搜索工具
   * 
   * @param query 搜索查询
   * @param limit 数量限制
   * @returns 工具列表
   */
  search(query: string, limit?: number): Promise<Tool[]>;

  /**
   * 获取工具使用统计
   * 
   * @param toolId 工具ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 使用统计
   */
  getUsageStatistics(
    toolId: ID,
    startTime?: Date,
    endTime?: Date
  ): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecutedAt?: Date;
  }>;

  /**
   * 获取工具性能统计
   * 
   * @param toolId 工具ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 性能统计
   */
  getPerformanceStatistics(
    toolId: ID,
    startTime?: Date,
    endTime?: Date
  ): Promise<{
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    p99Latency: number;
    maxLatency: number;
    minLatency: number;
    throughput: number;
    errorRate: number;
  }>;

  /**
   * 更新工具使用统计
   * 
   * @param toolId 工具ID
   * @param executionTime 执行时间
   * @param success 是否成功
   * @returns Promise
   */
  updateUsageStatistics(
    toolId: ID,
    executionTime: number,
    success: boolean
  ): Promise<void>;

  /**
   * 清理过期数据
   * 
   * @param beforeDate 清理此日期之前的数据
   * @returns 清理的记录数
   */
  cleanupExpiredData(beforeDate: Date): Promise<number>;

  /**
   * 备份工具数据
   * 
   * @param backupPath 备份路径
   * @param criteria 查询条件
   * @returns 备份文件路径
   */
  backup(backupPath: string, criteria?: {
    type?: ToolType;
    status?: ToolStatus;
    category?: string;
    tags?: string[];
    createdBy?: ID;
    isEnabled?: boolean;
    isBuiltin?: boolean;
  }): Promise<string>;

  /**
   * 恢复工具数据
   * 
   * @param backupPath 备份路径
   * @param overwrite 是否覆盖现有数据
   * @returns 恢复的工具数量
   */
  restore(backupPath: string, overwrite?: boolean): Promise<number>;

  /**
   * 导出工具数据
   * 
   * @param format 导出格式
   * @param criteria 查询条件
   * @returns 导出数据
   */
  export(
    format: 'json' | 'csv' | 'xml',
    criteria?: {
      type?: ToolType;
      status?: ToolStatus;
      category?: string;
      tags?: string[];
      createdBy?: ID;
      isEnabled?: boolean;
      isBuiltin?: boolean;
    }
  ): Promise<string>;

  /**
   * 导入工具数据
   * 
   * @param data 导入数据
   * @param format 数据格式
   * @param overwrite 是否覆盖现有数据
   * @returns 导入的工具数量
   */
  import(data: string, format: 'json' | 'csv' | 'xml', overwrite?: boolean): Promise<number>;

  /**
   * 验证工具数据完整性
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