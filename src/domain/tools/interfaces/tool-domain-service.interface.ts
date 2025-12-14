import { ID } from '../../common/value-objects/id';
import { Tool } from '../entities/tool';
import { ToolExecution } from '../entities/tool-execution';
import { ToolResult } from '../entities/tool-result';
import { ToolType } from '../value-objects/tool-type';
import { ToolStatus } from '../value-objects/tool-status';
import { ToolExecutionStatus } from '../value-objects/tool-execution-status';
import { IToolExecutor } from './tool-executor.interface';

/**
 * 工具领域服务接口
 * 
 * 定义工具领域服务的契约
 */
export interface IToolDomainService {
  /**
   * 创建工具
   * 
   * @param name 工具名称
   * @param description 工具描述
   * @param type 工具类型
   * @param config 工具配置
   * @param parameters 工具参数定义
   * @param returns 工具返回值定义
   * @param createdBy 创建者ID
   * @returns 工具
   */
  createTool(
    name: string,
    description: string,
    type: ToolType,
    config: Record<string, unknown>,
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
        items?: any;
        properties?: Record<string, any>;
        required?: string[];
      }>;
      required: string[];
    },
    returns?: {
      type: string;
      description?: string;
      properties?: Record<string, any>;
      items?: any;
    },
    createdBy?: ID
  ): Promise<Tool>;

  /**
   * 更新工具
   * 
   * @param tool 工具
   * @param name 工具名称
   * @param description 工具描述
   * @param config 工具配置
   * @param parameters 工具参数定义
   * @param returns 工具返回值定义
   * @param metadata 工具元数据
   * @returns 更新后的工具
   */
  updateTool(
    tool: Tool,
    name?: string,
    description?: string,
    config?: Record<string, unknown>,
    parameters?: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
        items?: any;
        properties?: Record<string, any>;
        required?: string[];
      }>;
      required: string[];
    },
    returns?: {
      type: string;
      description?: string;
      properties?: Record<string, any>;
      items?: any;
    },
    metadata?: Record<string, unknown>
  ): Promise<Tool>;

  /**
   * 激活工具
   * 
   * @param tool 工具
   * @returns 激活后的工具
   */
  activateTool(tool: Tool): Promise<Tool>;

  /**
   * 停用工具
   * 
   * @param tool 工具
   * @returns 停用后的工具
   */
  deactivateTool(tool: Tool): Promise<Tool>;

  /**
   * 弃用工具
   * 
   * @param tool 工具
   * @returns 弃用后的工具
   */
  deprecateTool(tool: Tool): Promise<Tool>;

  /**
   * 归档工具
   * 
   * @param tool 工具
   * @returns 归档后的工具
   */
  archiveTool(tool: Tool): Promise<Tool>;

  /**
   * 删除工具
   * 
   * @param tool 工具
   * @returns 是否成功
   */
  deleteTool(tool: Tool): Promise<boolean>;

  /**
   * 复制工具
   * 
   * @param tool 工具
   * @param newName 新名称
   * @param createdBy 创建者ID
   * @returns 复制的工具
   */
  duplicateTool(tool: Tool, newName: string, createdBy?: ID): Promise<Tool>;

  /**
   * 验证工具
   * 
   * @param tool 工具
   * @returns 验证结果
   */
  validateTool(tool: Tool): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 验证工具配置
   * 
   * @param tool 工具
   * @returns 验证结果
   */
  validateToolConfig(tool: Tool): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 验证工具参数
   * 
   * @param tool 工具
   * @param parameters 参数
   * @returns 验证结果
   */
  validateToolParameters(tool: Tool, parameters: Record<string, unknown>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 执行工具
   * 
   * @param tool 工具
   * @param parameters 参数
   * @param executorId 执行者ID
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @param nodeId 节点ID
   * @param context 执行上下文
   * @param metadata 执行元数据
   * @returns 执行结果
   */
  executeTool(
    tool: Tool,
    parameters: Record<string, unknown>,
    executorId?: ID,
    sessionId?: ID,
    threadId?: ID,
    workflowId?: ID,
    nodeId?: ID,
    context?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<ToolResult>;

  /**
   * 流式执行工具
   * 
   * @param tool 工具
   * @param parameters 参数
   * @param executorId 执行者ID
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @param nodeId 节点ID
   * @param context 执行上下文
   * @param metadata 执行元数据
   * @returns 结果流
   */
  executeToolStream(
    tool: Tool,
    parameters: Record<string, unknown>,
    executorId?: ID,
    sessionId?: ID,
    threadId?: ID,
    workflowId?: ID,
    nodeId?: ID,
    context?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<AsyncIterable<{
    type: 'data' | 'progress' | 'log' | 'error' | 'complete';
    data?: unknown;
    progress?: number;
    log?: {
      level: 'debug' | 'info' | 'warn' | 'error';
      message: string;
      data?: unknown;
    };
    error?: string;
  }>>;

  /**
   * 批量执行工具
   * 
   * @param tools 工具列表
   * @param parametersList 参数列表
   * @param executorId 执行者ID
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @param context 执行上下文
   * @param metadata 执行元数据
   * @returns 结果列表
   */
  executeToolsBatch(
    tools: Tool[],
    parametersList: Record<string, unknown>[],
    executorId?: ID,
    sessionId?: ID,
    threadId?: ID,
    workflowId?: ID,
    context?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<ToolResult[]>;

  /**
   * 取消工具执行
   * 
   * @param executionId 执行ID
   * @param reason 取消原因
   * @returns 是否成功
   */
  cancelToolExecution(executionId: ID, reason?: string): Promise<boolean>;

  /**
   * 重试工具执行
   * 
   * @param executionId 执行ID
   * @returns 是否成功
   */
  retryToolExecution(executionId: ID): Promise<boolean>;

  /**
   * 获取工具执行状态
   * 
   * @param executionId 执行ID
   * @returns 执行状态
   */
  getToolExecutionStatus(executionId: ID): Promise<{
    status: ToolExecutionStatus;
    progress?: number;
    message?: string;
    startedAt?: Date;
    endedAt?: Date;
    duration?: number;
  }>;

  /**
   * 获取工具执行日志
   * 
   * @param executionId 执行ID
   * @param level 日志级别
   * @param limit 数量限制
   * @returns 日志列表
   */
  getToolExecutionLogs(
    executionId: ID,
    level?: 'debug' | 'info' | 'warn' | 'error',
    limit?: number
  ): Promise<Array<{
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: unknown;
  }>>;

  /**
   * 查找工具
   * 
   * @param criteria 查询条件
   * @returns 工具列表
   */
  findTools(criteria: {
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
   * 搜索工具
   * 
   * @param query 搜索查询
   * @param limit 数量限制
   * @returns 工具列表
   */
  searchTools(query: string, limit?: number): Promise<Tool[]>;

  /**
   * 获取推荐工具
   * 
   * @param context 上下文
   * @param limit 数量限制
   * @returns 工具列表
   */
  getRecommendedTools(context: {
    task?: string;
    parameters?: Record<string, unknown>;
    previousTools?: ID[];
    userPreferences?: Record<string, unknown>;
  }, limit?: number): Promise<Tool[]>;

  /**
   * 获取工具依赖
   * 
   * @param tool 工具
   * @returns 依赖工具列表
   */
  getToolDependencies(tool: Tool): Promise<Tool[]>;

  /**
   * 获取工具依赖者
   * 
   * @param tool 工具
   * @returns 依赖此工具的工具列表
   */
  getToolDependents(tool: Tool): Promise<Tool[]>;

  /**
   * 检查工具依赖
   * 
   * @param tool 工具
   * @returns 依赖检查结果
   */
  checkToolDependencies(tool: Tool): Promise<{
    isValid: boolean;
    missingDependencies: ID[];
    circularDependencies: ID[][];
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 解析工具依赖
   * 
   * @param tools 工具列表
   * @returns 依赖解析结果
   */
  resolveToolDependencies(tools: Tool[]): Promise<{
    resolved: Tool[];
    unresolved: Tool[];
    circularDependencies: ID[][];
    errors: string[];
  }>;

  /**
   * 获取工具执行统计
   * 
   * @param tool 工具
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 执行统计
   */
  getToolExecutionStatistics(
    tool: Tool,
    startTime?: Date,
    endTime?: Date
  ): Promise<{
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
   * 获取工具性能统计
   * 
   * @param tool 工具
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 性能统计
   */
  getToolPerformanceStatistics(
    tool: Tool,
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
   * 获取工具使用统计
   * 
   * @param tool 工具
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 使用统计
   */
  getToolUsageStatistics(
    tool: Tool,
    startTime?: Date,
    endTime?: Date
  ): Promise<{
    totalUsers: number;
    totalSessions: number;
    totalWorkflows: number;
    averageExecutionsPerUser: number;
    averageExecutionsPerSession: number;
    topUsers: Array<{
      userId: ID;
      executionCount: number;
    }>;
    topSessions: Array<{
      sessionId: ID;
      executionCount: number;
    }>;
    topWorkflows: Array<{
      workflowId: ID;
      executionCount: number;
    }>;
  }>;

  /**
   * 获取工具错误分析
   * 
   * @param tool 工具
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 错误分析
   */
  getToolErrorAnalysis(
    tool: Tool,
    startTime?: Date,
    endTime?: Date
  ): Promise<{
    totalErrors: number;
    errorRate: number;
    commonErrors: Array<{
      error: string;
      count: number;
      percentage: number;
    }>;
    errorTrends: Array<{
      date: string;
      errorCount: number;
      errorRate: number;
    }>;
    errorPatterns: Array<{
      pattern: string;
      count: number;
      examples: string[];
    }>;
  }>;

  /**
   * 优化工具配置
   * 
   * @param tool 工具
   * @param optimizationGoals 优化目标
   * @returns 优化后的配置
   */
  optimizeToolConfig(
    tool: Tool,
    optimizationGoals: {
      minimizeLatency?: boolean;
      maximizeThroughput?: boolean;
      minimizeCost?: boolean;
      maximizeReliability?: boolean;
    }
  ): Promise<{
    optimizedConfig: Record<string, unknown>;
    improvements: Array<{
      parameter: string;
      oldValue: unknown;
      newValue: unknown;
      expectedImprovement: string;
    }>;
    estimatedImpact: {
      latencyImprovement?: number;
      throughputImprovement?: number;
      costReduction?: number;
      reliabilityImprovement?: number;
    };
  }>;

  /**
   * 测试工具
   * 
   * @param tool 工具
   * @param testCases 测试用例
   * @returns 测试结果
   */
  testTool(
    tool: Tool,
    testCases: Array<{
      name: string;
      parameters: Record<string, unknown>;
      expectedResult?: unknown;
      expectedError?: string;
      timeout?: number;
    }>
  ): Promise<Array<{
    name: string;
    passed: boolean;
    result?: unknown;
    error?: string;
    duration: number;
    executionId?: ID;
  }>>;

  /**
   * 基准测试工具
   * 
   * @param tool 工具
   * @param benchmarkConfig 基准测试配置
   * @returns 基准测试结果
   */
  benchmarkTool(
    tool: Tool,
    benchmarkConfig: {
      parameters: Record<string, unknown>;
      concurrency: number;
      iterations: number;
      duration?: number;
      warmupIterations?: number;
    }
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    p99Latency: number;
    maxLatency: number;
    minLatency: number;
    throughput: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
  }>;

  /**
   * 获取工具执行器
   * 
   * @param tool 工具
   * @returns 工具执行器
   */
  getToolExecutor(tool: Tool): Promise<IToolExecutor>;

  /**
   * 注册工具执行器
   * 
   * @param type 工具类型
   * @param executor 执行器
   * @returns 是否成功
   */
  registerToolExecutor(type: string, executor: IToolExecutor): Promise<boolean>;

  /**
   * 注销工具执行器
   * 
   * @param type 工具类型
   * @returns 是否成功
   */
  unregisterToolExecutor(type: string): Promise<boolean>;

  /**
   * 获取所有注册的工具执行器
   * 
   * @returns 工具执行器列表
   */
  getRegisteredToolExecutors(): Promise<Array<{
    type: string;
    executor: IToolExecutor;
    supportedToolTypes: string[];
  }>>;

  /**
   * 健康检查
   * 
   * @returns 健康状态
   */
  healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    details?: Record<string, unknown>;
    lastChecked: Date;
  }>;

  /**
   * 配置服务
   * 
   * @param config 配置
   * @returns 是否成功
   */
  configure(config: Record<string, unknown>): Promise<boolean>;

  /**
   * 获取配置
   * 
   * @returns 配置
   */
  getConfiguration(): Promise<Record<string, unknown>>;

  /**
   * 重置配置
   * 
   * @returns 是否成功
   */
  resetConfiguration(): Promise<boolean>;

  /**
   * 关闭服务
   * 
   * @returns 是否成功
   */
  close(): Promise<boolean>;
}