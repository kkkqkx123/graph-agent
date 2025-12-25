import { Repository } from '../../common/repositories/repository';
import { ID } from '../../common/value-objects/id';
import { ToolResult } from '../entities/tool-result';

/**
 * 工具结果仓储接口
 * 
 * 定义工具结果持久化的契约
 */
export interface ToolResultRepository extends Repository<ToolResult> {
  /**
   * 根据执行ID查找结果
   * 
   * @param executionId 执行ID
   * @returns 工具结果或null
   */
  findByExecutionId(executionId: ID): Promise<ToolResult | null>;

  /**
   * 根据工具ID查找结果
   * 
   * @param toolId 工具ID
   * @param limit 数量限制
   * @returns 工具结果列表
   */
  findByToolId(toolId: ID, limit?: number): Promise<ToolResult[]>;

  /**
   * 查找成功的结果
   * 
   * @param limit 数量限制
   * @param toolId 工具ID（可选）
   * @returns 工具结果列表
   */
  findSuccessful(limit?: number, toolId?: ID): Promise<ToolResult[]>;

  /**
   * 查找失败的结果
   * 
   * @param limit 数量限制
   * @param toolId 工具ID（可选）
   * @returns 工具结果列表
   */
  findFailed(limit?: number, toolId?: ID): Promise<ToolResult[]>;

  /**
   * 根据时间范围查找结果
   * 
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param toolId 工具ID（可选）
   * @returns 工具结果列表
   */
  findByTimeRange(startTime: Date, endTime: Date, toolId?: ID): Promise<ToolResult[]>;

  /**
   * 根据条件查找结果
   * 
   * @param criteria 查询条件
   * @returns 工具结果列表
   */
  findByCriteria(criteria: {
    toolId?: ID;
    executionId?: ID;
    success?: boolean;
    startTime?: Date;
    endTime?: Date;
    minExecutionTime?: number;
    maxExecutionTime?: number;
    hasError?: boolean;
    errorMessage?: string;
  }): Promise<ToolResult[]>;

  /**
   * 分页查找结果（自定义方法）
   *
   * @param page 页码
   * @param limit 每页数量
   * @param criteria 查询条件
   * @returns 工具结果列表和总数
   */
  findResultsWithPagination(
    page: number,
    limit: number,
    criteria?: {
      toolId?: ID;
      executionId?: ID;
      success?: boolean;
      startTime?: Date;
      endTime?: Date;
      minExecutionTime?: number;
      maxExecutionTime?: number;
      hasError?: boolean;
      errorMessage?: string;
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
   * 统计结果数量（自定义方法）
   *
   * @param criteria 查询条件
   * @returns 数量
   */
  countByCriteria(criteria?: {
    toolId?: ID;
    executionId?: ID;
    success?: boolean;
    startTime?: Date;
    endTime?: Date;
    hasError?: boolean;
  }): Promise<number>;

  /**
   * 按成功状态统计结果数量
   * 
   * @param toolId 工具ID（可选）
   * @returns 成功状态统计
   */
  countBySuccess(toolId?: ID): Promise<Record<string, number>>;

  /**
   * 按工具统计结果数量
   * 
   * @returns 工具统计
   */
  countByTool(): Promise<Record<string, number>>;

  /**
   * 获取平均执行时间
   * 
   * @param toolId 工具ID（可选）
   * @param timeRange 时间范围（可选）
   * @returns 平均执行时间
   */
  getAverageExecutionTime(
    toolId?: ID,
    timeRange?: { startTime: Date; endTime: Date }
  ): Promise<number>;

  /**
   * 获取成功率
   * 
   * @param toolId 工具ID（可选）
   * @param timeRange 时间范围（可选）
   * @returns 成功率
   */
  getSuccessRate(
    toolId?: ID,
    timeRange?: { startTime: Date; endTime: Date }
  ): Promise<number>;

  /**
   * 查找最近的结果
   * 
   * @param limit 数量限制
   * @param toolId 工具ID（可选）
   * @returns 工具结果列表
   */
  findRecent(limit: number, toolId?: ID): Promise<ToolResult[]>;

  /**
   * 查找执行时间最长的结果
   * 
   * @param limit 数量限制
   * @param toolId 工具ID（可选）
   * @returns 工具结果列表
   */
  findSlowest(limit: number, toolId?: ID): Promise<ToolResult[]>;

  /**
   * 查找执行时间最短的结果
   * 
   * @param limit 数量限制
   * @param toolId 工具ID（可选）
   * @returns 工具结果列表
   */
  findFastest(limit: number, toolId?: ID): Promise<ToolResult[]>;

  /**
   * 根据错误消息查找结果
   * 
   * @param errorMessage 错误消息
   * @param limit 数量限制
   * @returns 工具结果列表
   */
  findByErrorMessage(errorMessage: string, limit?: number): Promise<ToolResult[]>;

  /**
   * 清理过期的结果
   * 
   * @param beforeDate 清理此日期之前的结果
   * @returns 清理的记录数
   */
  cleanupExpired(beforeDate: Date): Promise<number>;

  /**
   * 获取结果统计信息
   * 
   * @param toolId 工具ID（可选）
   * @param timeRange 时间范围（可选）
   * @returns 统计信息
   */
  getResultStatistics(
    toolId?: ID,
    timeRange?: { startTime: Date; endTime: Date }
  ): Promise<{
    totalResults: number;
    successfulResults: number;
    failedResults: number;
    averageExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    successRate: number;
    failureRate: number;
  }>;

  /**
   * 删除执行相关的所有结果
   * 
   * @param executionId 执行ID
   * @returns Promise
   */
  deleteByExecutionId(executionId: ID): Promise<void>;

  /**
   * 删除工具相关的所有结果
   * 
   * @param toolId 工具ID
   * @returns Promise
   */
  deleteByToolId(toolId: ID): Promise<void>;
}