import { ID } from '../../common/value-objects/id';
import { ToolExecution } from '../entities/tool-execution';
import { ToolExecutionStatus } from '../value-objects/tool-execution-status';

/**
 * 工具执行仓储接口
 * 
 * 定义工具执行持久化的契约
 */
export interface IToolExecutionRepository {
  /**
   * 保存工具执行
   * 
   * @param execution 工具执行
   * @returns Promise
   */
  save(execution: ToolExecution): Promise<void>;

  /**
   * 根据ID查找工具执行
   * 
   * @param id 执行ID
   * @returns 工具执行或null
   */
  findById(id: ID): Promise<ToolExecution | null>;

  /**
   * 根据工具ID查找执行记录
   * 
   * @param toolId 工具ID
   * @returns 执行记录列表
   */
  findByToolId(toolId: ID): Promise<ToolExecution[]>;

  /**
   * 根据执行者ID查找执行记录
   * 
   * @param executorId 执行者ID
   * @returns 执行记录列表
   */
  findByExecutorId(executorId: ID): Promise<ToolExecution[]>;

  /**
   * 根据会话ID查找执行记录
   * 
   * @param sessionId 会话ID
   * @returns 执行记录列表
   */
  findBySessionId(sessionId: ID): Promise<ToolExecution[]>;

  /**
   * 根据线程ID查找执行记录
   * 
   * @param threadId 线程ID
   * @returns 执行记录列表
   */
  findByThreadId(threadId: ID): Promise<ToolExecution[]>;

  /**
   * 根据工作流ID查找执行记录
   * 
   * @param workflowId 工作流ID
   * @returns 执行记录列表
   */
  findByWorkflowId(workflowId: ID): Promise<ToolExecution[]>;

  /**
   * 根据节点ID查找执行记录
   * 
   * @param nodeId 节点ID
   * @returns 执行记录列表
   */
  findByNodeId(nodeId: ID): Promise<ToolExecution[]>;

  /**
   * 根据状态查找执行记录
   * 
   * @param status 执行状态
   * @returns 执行记录列表
   */
  findByStatus(status: ToolExecutionStatus): Promise<ToolExecution[]>;

  /**
   * 查找正在运行的执行记录
   * 
   * @returns 执行记录列表
   */
  findRunning(): Promise<ToolExecution[]>;

  /**
   * 查找待执行的执行记录
   * 
   * @returns 执行记录列表
   */
  findPending(): Promise<ToolExecution[]>;

  /**
   * 查找已完成的执行记录
   * 
   * @returns 执行记录列表
   */
  findCompleted(): Promise<ToolExecution[]>;

  /**
   * 查找失败的执行记录
   * 
   * @returns 执行记录列表
   */
  findFailed(): Promise<ToolExecution[]>;

  /**
   * 查找已取消的执行记录
   * 
   * @returns 执行记录列表
   */
  findCancelled(): Promise<ToolExecution[]>;

  /**
   * 查找超时的执行记录
   * 
   * @returns 执行记录列表
   */
  findTimeout(): Promise<ToolExecution[]>;

  /**
   * 根据时间范围查找执行记录
   * 
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 执行记录列表
   */
  findByTimeRange(startTime: Date, endTime: Date): Promise<ToolExecution[]>;

  /**
   * 根据条件查找执行记录
   * 
   * @param criteria 查询条件
   * @returns 执行记录列表
   */
  findByCriteria(criteria: {
    toolId?: ID;
    executorId?: ID;
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    status?: ToolExecutionStatus;
    startTime?: Date;
    endTime?: Date;
    minDuration?: number;
    maxDuration?: number;
    hasError?: boolean;
    searchText?: string;
  }): Promise<ToolExecution[]>;

  /**
   * 分页查找执行记录
   * 
   * @param page 页码
   * @param limit 每页数量
   * @param criteria 查询条件
   * @returns 执行记录列表和总数
   */
  findWithPagination(
    page: number,
    limit: number,
    criteria?: {
      toolId?: ID;
      executorId?: ID;
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      nodeId?: ID;
      status?: ToolExecutionStatus;
      startTime?: Date;
      endTime?: Date;
      minDuration?: number;
      maxDuration?: number;
      hasError?: boolean;
      searchText?: string;
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
   * 检查执行记录是否存在
   * 
   * @param id 执行ID
   * @returns 是否存在
   */
  exists(id: ID): Promise<boolean>;

  /**
   * 删除执行记录
   * 
   * @param id 执行ID
   * @returns Promise
   */
  delete(id: ID): Promise<void>;

  /**
   * 批量删除执行记录
   * 
   * @param ids 执行ID列表
   * @returns Promise
   */
  deleteMany(ids: ID[]): Promise<void>;

  /**
   * 根据时间范围删除执行记录
   * 
   * @param beforeDate 删除此日期之前的记录
   * @returns 删除的记录数
   */
  deleteByTime(beforeDate: Date): Promise<number>;

  /**
   * 统计执行记录数量
   * 
   * @param criteria 查询条件
   * @returns 数量
   */
  count(criteria?: {
    toolId?: ID;
    executorId?: ID;
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    status?: ToolExecutionStatus;
    startTime?: Date;
    endTime?: Date;
    minDuration?: number;
    maxDuration?: number;
    hasError?: boolean;
  }): Promise<number>;

  /**
   * 按状态统计执行记录数量
   * 
   * @param criteria 查询条件
   * @returns 状态统计
   */
  countByStatus(criteria?: {
    toolId?: ID;
    executorId?: ID;
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 按工具统计执行记录数量
   * 
   * @param criteria 查询条件
   * @returns 工具统计
   */
  countByTool(criteria?: {
    executorId?: ID;
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    status?: ToolExecutionStatus;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 按执行者统计执行记录数量
   * 
   * @param criteria 查询条件
   * @returns 执行者统计
   */
  countByExecutor(criteria?: {
    toolId?: ID;
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    status?: ToolExecutionStatus;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Record<string, number>>;

  /**
   * 查找最近的执行记录
   * 
   * @param limit 数量限制
   * @param criteria 查询条件
   * @returns 执行记录列表
   */
  findRecent(limit: number, criteria?: {
    toolId?: ID;
    executorId?: ID;
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    status?: ToolExecutionStatus;
  }): Promise<ToolExecution[]>;

  /**
   * 查找执行时间最长的记录
   * 
   * @param limit 数量限制
   * @param criteria 查询条件
   * @returns 执行记录列表
   */
  findLongestRunning(limit: number, criteria?: {
    toolId?: ID;
    executorId?: ID;
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    status?: ToolExecutionStatus;
    startTime?: Date;
    endTime?: Date;
  }): Promise<ToolExecution[]>;

  /**
   * 查找执行时间最短的记录
   * 
   * @param limit 数量限制
   * @param criteria 查询条件
   * @returns 执行记录列表
   */
  findShortestRunning(limit: number, criteria?: {
    toolId?: ID;
    executorId?: ID;
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    status?: ToolExecutionStatus;
    startTime?: Date;
    endTime?: Date;
  }): Promise<ToolExecution[]>;

  /**
   * 查找失败次数最多的工具
   * 
   * @param limit 数量限制
   * @param criteria 查询条件
   * @returns 工具和失败次数列表
   */
  findMostFailedTools(limit: number, criteria?: {
    executorId?: ID;
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Array<{
    toolId: ID;
    toolName: string;
    failureCount: number;
    totalExecutions: number;
    failureRate: number;
  }>>;

  /**
   * 查找执行时间最长的工具
   * 
   * @param limit 数量限制
   * @param criteria 查询条件
   * @returns 工具和平均执行时间列表
   */
  findSlowestTools(limit: number, criteria?: {
    executorId?: ID;
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    status?: ToolExecutionStatus;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Array<{
    toolId: ID;
    toolName: string;
    averageExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    totalExecutions: number;
  }>>;

  /**
   * 获取执行统计
   * 
   * @param criteria 查询条件
   * @returns 执行统计
   */
  getExecutionStatistics(criteria?: {
    toolId?: ID;
    executorId?: ID;
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    cancelledExecutions: number;
    timeoutExecutions: number;
    averageExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    successRate: number;
    failureRate: number;
    cancellationRate: number;
    timeoutRate: number;
  }>;

  /**
   * 获取每日执行统计
   * 
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param criteria 查询条件
   * @returns 每日执行统计
   */
  getDailyExecutionStatistics(
    startDate: Date,
    endDate: Date,
    criteria?: {
      toolId?: ID;
      executorId?: ID;
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      nodeId?: ID;
    }
  ): Promise<Array<{
    date: string;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    cancelledExecutions: number;
    timeoutExecutions: number;
    averageExecutionTime: number;
  }>>;

  /**
   * 获取每小时执行统计
   * 
   * @param date 日期
   * @param criteria 查询条件
   * @returns 每小时执行统计
   */
  getHourlyExecutionStatistics(
    date: Date,
    criteria?: {
      toolId?: ID;
      executorId?: ID;
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      nodeId?: ID;
    }
  ): Promise<Array<{
    hour: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    cancelledExecutions: number;
    timeoutExecutions: number;
    averageExecutionTime: number;
  }>>;

  /**
   * 清理过期数据
   * 
   * @param beforeDate 清理此日期之前的数据
   * @returns 清理的记录数
   */
  cleanupExpiredData(beforeDate: Date): Promise<number>;

  /**
   * 备份执行数据
   * 
   * @param backupPath 备份路径
   * @param criteria 查询条件
   * @returns 备份文件路径
   */
  backup(backupPath: string, criteria?: {
    toolId?: ID;
    executorId?: ID;
    sessionId?: ID;
    threadId?: ID;
    workflowId?: ID;
    nodeId?: ID;
    status?: ToolExecutionStatus;
    startTime?: Date;
    endTime?: Date;
  }): Promise<string>;

  /**
   * 恢复执行数据
   * 
   * @param backupPath 备份路径
   * @param overwrite 是否覆盖现有数据
   * @returns 恢复的记录数
   */
  restore(backupPath: string, overwrite?: boolean): Promise<number>;

  /**
   * 导出执行数据
   * 
   * @param format 导出格式
   * @param criteria 查询条件
   * @returns 导出数据
   */
  export(
    format: 'json' | 'csv' | 'xml',
    criteria?: {
      toolId?: ID;
      executorId?: ID;
      sessionId?: ID;
      threadId?: ID;
      workflowId?: ID;
      nodeId?: ID;
      status?: ToolExecutionStatus;
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<string>;

  /**
   * 导入执行数据
   * 
   * @param data 导入数据
   * @param format 数据格式
   * @param overwrite 是否覆盖现有数据
   * @returns 导入的记录数
   */
  import(data: string, format: 'json' | 'csv' | 'xml', overwrite?: boolean): Promise<number>;

  /**
   * 验证执行数据完整性
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