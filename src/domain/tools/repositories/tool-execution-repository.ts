import { Repository } from '../../common/repositories/repository';
import { ID } from '../../common/value-objects/id';
import { ToolExecution } from '../entities/tool-execution';
import { ToolExecutionStatus } from '../value-objects/tool-execution-status';

/**
 * 工具执行仓储接口
 *
 * 定义工具执行持久化的契约
 */
export interface IToolExecutionRepository extends Repository<ToolExecution> {
  /**
   * 根据工具ID查找执行记录
   *
   * @param toolId 工具ID
   * @returns 执行记录列表
   */
  findByToolId(toolId: ID): Promise<ToolExecution[]>;

  /**
   * 根据状态查找执行记录
   *
   * @param status 执行状态
   * @returns 执行记录列表
   */
  findByStatus(status: ToolExecutionStatus): Promise<ToolExecution[]>;

  /**
   * 根据会话ID查找执行记录
   *
   * @param sessionId 会话ID
   * @returns 执行记录列表
   */
  findBySessionId(sessionId: ID): Promise<ToolExecution[]>;

  /**
   * 根据时间范围查找执行记录
   *
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 执行记录列表
   */
  findByTimeRange(startTime: Date, endTime: Date): Promise<ToolExecution[]>;

  /**
   * 查找正在执行的记录
   *
   * @returns 执行记录列表
   */
  findRunning(): Promise<ToolExecution[]>;

  /**
   * 查找已完成的执行记录
   *
   * @param limit 数量限制
   * @returns 执行记录列表
   */
  findCompleted(limit?: number): Promise<ToolExecution[]>;

  /**
   * 查找失败的执行记录
   *
   * @param limit 数量限制
   * @returns 执行记录列表
   */
  findFailed(limit?: number): Promise<ToolExecution[]>;

  /**
   * 根据条件查找执行记录
   *
   * @param criteria 查询条件
   * @returns 执行记录列表
   */
  findByCriteria(criteria: {
    toolId?: ID;
    status?: ToolExecutionStatus;
    sessionId?: ID;
    startTime?: Date;
    endTime?: Date;
    minExecutionTime?: number;
    maxExecutionTime?: number;
    hasError?: boolean;
  }): Promise<ToolExecution[]>;

  /**
   * 分页查找执行记录（自定义方法）
   *
   * @param page 页码
   * @param limit 每页数量
   * @param criteria 查询条件
   * @returns 执行记录列表和总数
   */
  findExecutionsWithPagination(
    page: number,
    limit: number,
    criteria?: {
      toolId?: ID;
      status?: ToolExecutionStatus;
      sessionId?: ID;
      startTime?: Date;
      endTime?: Date;
      minExecutionTime?: number;
      maxExecutionTime?: number;
      hasError?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    executions: ToolExecution[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * 统计执行记录数量（自定义方法）
   *
   * @param criteria 查询条件
   * @returns 数量
   */
  countByCriteria(criteria?: {
    toolId?: ID;
    status?: ToolExecutionStatus;
    sessionId?: ID;
    startTime?: Date;
    endTime?: Date;
    hasError?: boolean;
  }): Promise<number>;

  /**
   * 按状态统计执行记录数量
   *
   * @param toolId 工具ID（可选）
   * @returns 状态统计
   */
  countByStatus(toolId?: ID): Promise<Record<string, number>>;

  /**
   * 按工具统计执行记录数量
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
  getSuccessRate(toolId?: ID, timeRange?: { startTime: Date; endTime: Date }): Promise<number>;

  /**
   * 查找最近的执行记录
   *
   * @param limit 数量限制
   * @param toolId 工具ID（可选）
   * @returns 执行记录列表
   */
  findRecent(limit: number, toolId?: ID): Promise<ToolExecution[]>;

  /**
   * 查找执行时间最长的记录
   *
   * @param limit 数量限制
   * @param toolId 工具ID（可选）
   * @returns 执行记录列表
   */
  findSlowest(limit: number, toolId?: ID): Promise<ToolExecution[]>;

  /**
   * 查找执行时间最短的记录
   *
   * @param limit 数量限制
   * @param toolId 工具ID（可选）
   * @returns 执行记录列表
   */
  findFastest(limit: number, toolId?: ID): Promise<ToolExecution[]>;

  /**
   * 清理过期的执行记录
   *
   * @param beforeDate 清理此日期之前的记录
   * @returns 清理的记录数
   */
  cleanupExpired(beforeDate: Date): Promise<number>;

  /**
   * 获取执行统计信息
   *
   * @param toolId 工具ID（可选）
   * @param timeRange 时间范围（可选）
   * @returns 统计信息
   */
  getExecutionStatistics(
    toolId?: ID,
    timeRange?: { startTime: Date; endTime: Date }
  ): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    successRate: number;
    failureRate: number;
  }>;
}
