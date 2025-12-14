import { ID } from '../../common/value-objects/id';
import { ToolExecutionStatus } from '../value-objects/tool-execution-status';
import { Tool } from './tool';

/**
 * 工具执行实体
 * 
 * 表示工具的一次执行记录
 */
export class ToolExecution {
  /**
   * 执行ID
   */
  readonly id: ID;

  /**
   * 工具ID
   */
  readonly toolId: ID;

  /**
   * 执行状态
   */
  readonly status: ToolExecutionStatus;

  /**
   * 执行参数
   */
  readonly parameters: Record<string, unknown>;

  /**
   * 执行结果
   */
  readonly result?: unknown;

  /**
   * 执行错误
   */
  readonly error?: string;

  /**
   * 执行开始时间
   */
  readonly startedAt: Date;

  /**
   * 执行结束时间
   */
  readonly endedAt?: Date;

  /**
   * 执行持续时间（毫秒）
   */
  readonly duration?: number;

  /**
   * 执行者ID
   */
  readonly executorId?: ID;

  /**
   * 会话ID
   */
  readonly sessionId?: ID;

  /**
   * 线程ID
   */
  readonly threadId?: ID;

  /**
   * 工作流ID
   */
  readonly workflowId?: ID;

  /**
   * 节点ID
   */
  readonly nodeId?: ID;

  /**
   * 执行上下文
   */
  readonly context: Record<string, unknown>;

  /**
   * 执行元数据
   */
  readonly metadata: Record<string, unknown>;

  /**
   * 重试次数
   */
  readonly retryCount: number;

  /**
   * 最大重试次数
   */
  readonly maxRetries: number;

  /**
   * 执行日志
   */
  readonly logs: Array<{
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: unknown;
  }>;

  /**
   * 执行指标
   */
  readonly metrics: {
    tokenUsage?: {
      input: number;
      output: number;
      total: number;
    };
    cost?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    networkRequests?: number;
  };

  /**
   * 构造函数
   * 
   * @param id 执行ID
   * @param toolId 工具ID
   * @param status 执行状态
   * @param parameters 执行参数
   * @param result 执行结果
   * @param error 执行错误
   * @param startedAt 执行开始时间
   * @param endedAt 执行结束时间
   * @param duration 执行持续时间
   * @param executorId 执行者ID
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @param nodeId 节点ID
   * @param context 执行上下文
   * @param metadata 执行元数据
   * @param retryCount 重试次数
   * @param maxRetries 最大重试次数
   * @param logs 执行日志
   * @param metrics 执行指标
   */
  constructor(
    id: ID,
    toolId: ID,
    status: ToolExecutionStatus,
    parameters: Record<string, unknown>,
    result?: unknown,
    error?: string,
    startedAt: Date = new Date(),
    endedAt?: Date,
    duration?: number,
    executorId?: ID,
    sessionId?: ID,
    threadId?: ID,
    workflowId?: ID,
    nodeId?: ID,
    context: Record<string, unknown> = {},
    metadata: Record<string, unknown> = {},
    retryCount: number = 0,
    maxRetries: number = 3,
    logs: Array<{
      timestamp: Date;
      level: 'debug' | 'info' | 'warn' | 'error';
      message: string;
      data?: unknown;
    }> = [],
    metrics: {
      tokenUsage?: {
        input: number;
        output: number;
        total: number;
      };
      cost?: number;
      memoryUsage?: number;
      cpuUsage?: number;
      networkRequests?: number;
    } = {}
  ) {
    this.id = id;
    this.toolId = toolId;
    this.status = status;
    this.parameters = parameters;
    this.result = result;
    this.error = error;
    this.startedAt = startedAt;
    this.endedAt = endedAt;
    this.duration = duration;
    this.executorId = executorId;
    this.sessionId = sessionId;
    this.threadId = threadId;
    this.workflowId = workflowId;
    this.nodeId = nodeId;
    this.context = context;
    this.metadata = metadata;
    this.retryCount = retryCount;
    this.maxRetries = maxRetries;
    this.logs = logs;
    this.metrics = metrics;
  }

  /**
   * 创建新的工具执行
   * 
   * @param toolId 工具ID
   * @param parameters 执行参数
   * @param executorId 执行者ID
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @param nodeId 节点ID
   * @param context 执行上下文
   * @param metadata 执行元数据
   * @returns 新的工具执行
   */
  static create(
    toolId: ID,
    parameters: Record<string, unknown>,
    executorId?: ID,
    sessionId?: ID,
    threadId?: ID,
    workflowId?: ID,
    nodeId?: ID,
    context: Record<string, unknown> = {},
    metadata: Record<string, unknown> = {}
  ): ToolExecution {
    const id = ID.generate();
    const now = new Date();
    
    return new ToolExecution(
      id,
      toolId,
      ToolExecutionStatus.PENDING,
      parameters,
      undefined,
      undefined,
      now,
      undefined,
      undefined,
      executorId,
      sessionId,
      threadId,
      workflowId,
      nodeId,
      context,
      metadata
    );
  }

  /**
   * 开始执行
   * 
   * @returns 更新后的工具执行
   */
  start(): ToolExecution {
    return new ToolExecution(
      this.id,
      this.toolId,
      ToolExecutionStatus.RUNNING,
      this.parameters,
      this.result,
      this.error,
      this.startedAt,
      undefined,
      undefined,
      this.executorId,
      this.sessionId,
      this.threadId,
      this.workflowId,
      this.nodeId,
      this.context,
      this.metadata,
      this.retryCount,
      this.maxRetries,
      this.logs,
      this.metrics
    );
  }

  /**
   * 完成执行
   * 
   * @param result 执行结果
   * @param metrics 执行指标
   * @returns 更新后的工具执行
   */
  complete(
    result: unknown,
    metrics?: {
      tokenUsage?: {
        input: number;
        output: number;
        total: number;
      };
      cost?: number;
      memoryUsage?: number;
      cpuUsage?: number;
      networkRequests?: number;
    }
  ): ToolExecution {
    const now = new Date();
    const duration = now.getTime() - this.startedAt.getTime();
    
    return new ToolExecution(
      this.id,
      this.toolId,
      ToolExecutionStatus.COMPLETED,
      this.parameters,
      result,
      this.error,
      this.startedAt,
      now,
      duration,
      this.executorId,
      this.sessionId,
      this.threadId,
      this.workflowId,
      this.nodeId,
      this.context,
      this.metadata,
      this.retryCount,
      this.maxRetries,
      this.logs,
      metrics || this.metrics
    );
  }

  /**
   * 执行失败
   * 
   * @param error 错误信息
   * @param metrics 执行指标
   * @returns 更新后的工具执行
   */
  fail(
    error: string,
    metrics?: {
      tokenUsage?: {
        input: number;
        output: number;
        total: number;
      };
      cost?: number;
      memoryUsage?: number;
      cpuUsage?: number;
      networkRequests?: number;
    }
  ): ToolExecution {
    const now = new Date();
    const duration = now.getTime() - this.startedAt.getTime();
    
    return new ToolExecution(
      this.id,
      this.toolId,
      ToolExecutionStatus.FAILED,
      this.parameters,
      this.result,
      error,
      this.startedAt,
      now,
      duration,
      this.executorId,
      this.sessionId,
      this.threadId,
      this.workflowId,
      this.nodeId,
      this.context,
      this.metadata,
      this.retryCount,
      this.maxRetries,
      this.logs,
      metrics || this.metrics
    );
  }

  /**
   * 取消执行
   * 
   * @param reason 取消原因
   * @returns 更新后的工具执行
   */
  cancel(reason?: string): ToolExecution {
    const now = new Date();
    const duration = now.getTime() - this.startedAt.getTime();
    
    return new ToolExecution(
      this.id,
      this.toolId,
      ToolExecutionStatus.CANCELLED,
      this.parameters,
      this.result,
      reason || 'Execution cancelled',
      this.startedAt,
      now,
      duration,
      this.executorId,
      this.sessionId,
      this.threadId,
      this.workflowId,
      this.nodeId,
      this.context,
      this.metadata,
      this.retryCount,
      this.maxRetries,
      this.logs,
      this.metrics
    );
  }

  /**
   * 重试执行
   * 
   * @returns 更新后的工具执行
   */
  retry(): ToolExecution {
    if (this.retryCount >= this.maxRetries) {
      return this;
    }
    
    return new ToolExecution(
      this.id,
      this.toolId,
      ToolExecutionStatus.PENDING,
      this.parameters,
      undefined,
      undefined,
      new Date(),
      undefined,
      undefined,
      this.executorId,
      this.sessionId,
      this.threadId,
      this.workflowId,
      this.nodeId,
      this.context,
      this.metadata,
      this.retryCount + 1,
      this.maxRetries,
      this.logs,
      this.metrics
    );
  }

  /**
   * 添加日志
   * 
   * @param level 日志级别
   * @param message 日志消息
   * @param data 日志数据
   * @returns 更新后的工具执行
   */
  addLog(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: unknown
  ): ToolExecution {
    const log = {
      timestamp: new Date(),
      level,
      message,
      data
    };
    
    return new ToolExecution(
      this.id,
      this.toolId,
      this.status,
      this.parameters,
      this.result,
      this.error,
      this.startedAt,
      this.endedAt,
      this.duration,
      this.executorId,
      this.sessionId,
      this.threadId,
      this.workflowId,
      this.nodeId,
      this.context,
      this.metadata,
      this.retryCount,
      this.maxRetries,
      [...this.logs, log],
      this.metrics
    );
  }

  /**
   * 更新指标
   * 
   * @param metrics 执行指标
   * @returns 更新后的工具执行
   */
  updateMetrics(metrics: {
    tokenUsage?: {
      input: number;
      output: number;
      total: number;
    };
    cost?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    networkRequests?: number;
  }): ToolExecution {
    return new ToolExecution(
      this.id,
      this.toolId,
      this.status,
      this.parameters,
      this.result,
      this.error,
      this.startedAt,
      this.endedAt,
      this.duration,
      this.executorId,
      this.sessionId,
      this.threadId,
      this.workflowId,
      this.nodeId,
      this.context,
      this.metadata,
      this.retryCount,
      this.maxRetries,
      this.logs,
      metrics
    );
  }

  /**
   * 检查是否可以重试
   * 
   * @returns 是否可以重试
   */
  canRetry(): boolean {
    return this.status === ToolExecutionStatus.FAILED && this.retryCount < this.maxRetries;
  }

  /**
   * 检查是否正在运行
   * 
   * @returns 是否正在运行
   */
  isRunning(): boolean {
    return this.status === ToolExecutionStatus.RUNNING;
  }

  /**
   * 检查是否已完成
   * 
   * @returns 是否已完成
   */
  isCompleted(): boolean {
    return this.status === ToolExecutionStatus.COMPLETED;
  }

  /**
   * 检查是否已失败
   * 
   * @returns 是否已失败
   */
  isFailed(): boolean {
    return this.status === ToolExecutionStatus.FAILED;
  }

  /**
   * 检查是否已取消
   * 
   * @returns 是否已取消
   */
  isCancelled(): boolean {
    return this.status === ToolExecutionStatus.CANCELLED;
  }

  /**
   * 检查是否已完成（包括成功、失败和取消）
   * 
   * @returns 是否已完成
   */
  isFinished(): boolean {
    return [
      ToolExecutionStatus.COMPLETED,
      ToolExecutionStatus.FAILED,
      ToolExecutionStatus.CANCELLED
    ].includes(this.status);
  }

  /**
   * 转换为JSON对象
   * 
   * @returns JSON对象
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id.value,
      toolId: this.toolId.value,
      status: this.status.value,
      parameters: this.parameters,
      result: this.result,
      error: this.error,
      startedAt: this.startedAt.toISOString(),
      endedAt: this.endedAt?.toISOString(),
      duration: this.duration,
      executorId: this.executorId?.value,
      sessionId: this.sessionId?.value,
      threadId: this.threadId?.value,
      workflowId: this.workflowId?.value,
      nodeId: this.nodeId?.value,
      context: this.context,
      metadata: this.metadata,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      logs: this.logs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        message: log.message,
        data: log.data
      })),
      metrics: this.metrics
    };
  }

  /**
   * 从JSON对象创建工具执行
   * 
   * @param json JSON对象
   * @returns 工具执行
   */
  static fromJSON(json: Record<string, unknown>): ToolExecution {
    return new ToolExecution(
      ID.fromString(json['id'] as string),
      ID.fromString(json['toolId'] as string),
      ToolExecutionStatus.fromString(json['status'] as string),
      json['parameters'] as Record<string, unknown>,
      json['result'],
      json['error'] as string,
      new Date(json['startedAt'] as string),
      json['endedAt'] ? new Date(json['endedAt'] as string) : undefined,
      json['duration'] as number,
      json['executorId'] ? ID.fromString(json['executorId'] as string) : undefined,
      json['sessionId'] ? ID.fromString(json['sessionId'] as string) : undefined,
      json['threadId'] ? ID.fromString(json['threadId'] as string) : undefined,
      json['workflowId'] ? ID.fromString(json['workflowId'] as string) : undefined,
      json['nodeId'] ? ID.fromString(json['nodeId'] as string) : undefined,
      json['context'] as Record<string, unknown>,
      json['metadata'] as Record<string, unknown>,
      json['retryCount'] as number,
      json['maxRetries'] as number,
      (json['logs'] as Array<{
        timestamp: string;
        level: 'debug' | 'info' | 'warn' | 'error';
        message: string;
        data?: unknown;
      }>).map(log => ({
        timestamp: new Date(log.timestamp),
        level: log.level,
        message: log.message,
        data: log.data
      })),
      json['metrics'] as {
        tokenUsage?: {
          input: number;
          output: number;
          total: number;
        };
        cost?: number;
        memoryUsage?: number;
        cpuUsage?: number;
        networkRequests?: number;
      }
    );
  }
}