import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version } from '../../common/value-objects';
import { ToolExecutionStatus } from '../value-objects/tool-execution-status';
import { Tool } from './tool';

/**
 * 工具执行指标接口
 */
export interface ToolExecutionMetrics {
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

/**
 * 工具执行日志接口
 */
export interface ToolExecutionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

/**
 * 工具执行实体属性接口
 */
export interface ToolExecutionProps {
  readonly id: ID;
  readonly toolId: ID;
  readonly status: ToolExecutionStatus;
  readonly parameters: Record<string, unknown>;
  readonly result?: unknown;
  readonly error?: string;
  readonly startedAt: Timestamp;
  readonly endedAt?: Timestamp;
  readonly duration?: number;
  readonly executorId?: ID;
  readonly sessionId?: ID;
  readonly threadId?: ID;
  readonly workflowId?: ID;
  readonly nodeId?: ID;
  readonly context: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly logs: ToolExecutionLog[];
  readonly metrics: ToolExecutionMetrics;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

/**
 * 工具执行实体
 *
 * 表示工具的一次执行记录
 * 职责：
 * - 执行状态管理
 * - 执行参数和结果管理
 * - 执行日志管理
 * - 执行指标管理
 *
 * 不负责：
 * - 业务逻辑判断（由ToolExecutionService负责）
 * - 序列化/反序列化（由Infrastructure层负责）
 */
export class ToolExecution extends Entity {
  private readonly props: ToolExecutionProps;

  /**
   * 构造函数
   * @param props 工具执行属性
   */
  private constructor(props: ToolExecutionProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新的工具执行
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
  public static create(
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
    const now = Timestamp.now();
    const id = ID.generate();
    const startedAt = Timestamp.now();

    const props: ToolExecutionProps = {
      id,
      toolId,
      status: ToolExecutionStatus.PENDING,
      parameters,
      result: undefined,
      error: undefined,
      startedAt,
      endedAt: undefined,
      duration: undefined,
      executorId,
      sessionId,
      threadId,
      workflowId,
      nodeId,
      context,
      metadata,
      retryCount: 0,
      maxRetries: 3,
      logs: [],
      metrics: {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial()
    };

    return new ToolExecution(props);
  }

  /**
   * 从已有属性重建工具执行
   * @param props 工具执行属性
   * @returns 工具执行实例
   */
  public static fromProps(props: ToolExecutionProps): ToolExecution {
    return new ToolExecution(props);
  }

  /**
   * 从JSON对象创建工具执行
   * @param json JSON对象
   * @returns 工具执行
   */
  public static fromJSON(json: Record<string, unknown>): ToolExecution {
    const props: ToolExecutionProps = {
      id: ID.fromString(json['id'] as string),
      toolId: ID.fromString(json['toolId'] as string),
      status: ToolExecutionStatus.fromString(json['status'] as string),
      parameters: json['parameters'] as Record<string, unknown>,
      result: json['result'],
      error: json['error'] as string,
      startedAt: Timestamp.fromDate(new Date(json['startedAt'] as string)),
      endedAt: json['endedAt'] ? Timestamp.fromDate(new Date(json['endedAt'] as string)) : undefined,
      duration: json['duration'] as number,
      executorId: json['executorId'] ? ID.fromString(json['executorId'] as string) : undefined,
      sessionId: json['sessionId'] ? ID.fromString(json['sessionId'] as string) : undefined,
      threadId: json['threadId'] ? ID.fromString(json['threadId'] as string) : undefined,
      workflowId: json['workflowId'] ? ID.fromString(json['workflowId'] as string) : undefined,
      nodeId: json['nodeId'] ? ID.fromString(json['nodeId'] as string) : undefined,
      context: json['context'] as Record<string, unknown>,
      metadata: json['metadata'] as Record<string, unknown>,
      retryCount: json['retryCount'] as number,
      maxRetries: json['maxRetries'] as number,
      logs: (json['logs'] as Array<{
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
      metrics: json['metrics'] as ToolExecutionMetrics,
      createdAt: Timestamp.fromDate(new Date(json['createdAt'] as string)),
      updatedAt: Timestamp.fromDate(new Date(json['updatedAt'] as string)),
      version: Version.create(json['version'] as string)
    };

    return new ToolExecution(props);
  }

  // 属性访问器

  /**
   * 获取执行ID
   */
  public get executionId(): ID {
    return this.props.id;
  }

  /**
   * 获取工具ID
   */
  public get toolId(): ID {
    return this.props.toolId;
  }

  /**
   * 获取执行状态
   */
  public get status(): ToolExecutionStatus {
    return this.props.status;
  }

  /**
   * 获取执行参数
   */
  public get parameters(): Record<string, unknown> {
    return this.props.parameters;
  }

  /**
   * 获取执行结果
   */
  public get result(): unknown | undefined {
    return this.props.result;
  }

  /**
   * 获取执行错误
   */
  public get error(): string | undefined {
    return this.props.error;
  }

  /**
   * 获取执行开始时间
   */
  public get startedAt(): Timestamp {
    return this.props.startedAt;
  }

  /**
   * 获取执行结束时间
   */
  public get endedAt(): Timestamp | undefined {
    return this.props.endedAt;
  }

  /**
   * 获取执行持续时间（毫秒）
   */
  public get duration(): number | undefined {
    return this.props.duration;
  }

  /**
   * 获取执行者ID
   */
  public get executorId(): ID | undefined {
    return this.props.executorId;
  }

  /**
   * 获取会话ID
   */
  public get sessionId(): ID | undefined {
    return this.props.sessionId;
  }

  /**
   * 获取线程ID
   */
  public get threadId(): ID | undefined {
    return this.props.threadId;
  }

  /**
   * 获取工作流ID
   */
  public get workflowId(): ID | undefined {
    return this.props.workflowId;
  }

  /**
   * 获取节点ID
   */
  public get nodeId(): ID | undefined {
    return this.props.nodeId;
  }

  /**
   * 获取执行上下文
   */
  public get context(): Record<string, unknown> {
    return this.props.context;
  }

  /**
   * 获取执行元数据
   */
  public get metadata(): Record<string, unknown> {
    return this.props.metadata;
  }

  /**
   * 获取重试次数
   */
  public get retryCount(): number {
    return this.props.retryCount;
  }

  /**
   * 获取最大重试次数
   */
  public get maxRetries(): number {
    return this.props.maxRetries;
  }

  /**
   * 获取执行日志
   */
  public get logs(): ToolExecutionLog[] {
    return [...this.props.logs];
  }

  /**
   * 获取执行指标
   */
  public get metrics(): ToolExecutionMetrics {
    return { ...this.props.metrics };
  }

  // 状态管理方法

  /**
   * 开始执行
   * @returns 更新后的工具执行
   */
  public start(): ToolExecution {
    return new ToolExecution({
      ...this.props,
      status: ToolExecutionStatus.RUNNING,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 完成执行
   * @param result 执行结果
   * @param metrics 执行指标
   * @returns 更新后的工具执行
   */
  public complete(
    result: unknown,
    metrics?: ToolExecutionMetrics
  ): ToolExecution {
    const now = Timestamp.now();
    const duration = now.diff(this.props.startedAt);

    return new ToolExecution({
      ...this.props,
      status: ToolExecutionStatus.COMPLETED,
      result,
      endedAt: now,
      duration,
      metrics: metrics || this.props.metrics,
      updatedAt: now,
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 执行失败
   * @param error 错误信息
   * @param metrics 执行指标
   * @returns 更新后的工具执行
   */
  public fail(
    error: string,
    metrics?: ToolExecutionMetrics
  ): ToolExecution {
    const now = Timestamp.now();
    const duration = now.diff(this.props.startedAt);

    return new ToolExecution({
      ...this.props,
      status: ToolExecutionStatus.FAILED,
      error,
      endedAt: now,
      duration,
      metrics: metrics || this.props.metrics,
      updatedAt: now,
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 取消执行
   * @param reason 取消原因
   * @returns 更新后的工具执行
   */
  public cancel(reason?: string): ToolExecution {
    const now = Timestamp.now();
    const duration = now.diff(this.props.startedAt);

    return new ToolExecution({
      ...this.props,
      status: ToolExecutionStatus.CANCELLED,
      error: reason || 'Execution cancelled',
      endedAt: now,
      duration,
      updatedAt: now,
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 重试执行
   * @returns 更新后的工具执行
   */
  public retry(): ToolExecution {
    if (this.retryCount >= this.maxRetries) {
      return this;
    }

    const now = Timestamp.now();

    return new ToolExecution({
      ...this.props,
      status: ToolExecutionStatus.PENDING,
      result: undefined,
      error: undefined,
      startedAt: now,
      endedAt: undefined,
      duration: undefined,
      retryCount: this.props.retryCount + 1,
      updatedAt: now,
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 添加日志
   * @param level 日志级别
   * @param message 日志消息
   * @param data 日志数据
   * @returns 更新后的工具执行
   */
  public addLog(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: unknown
  ): ToolExecution {
    const log: ToolExecutionLog = {
      timestamp: new Date(),
      level,
      message,
      data
    };

    return new ToolExecution({
      ...this.props,
      logs: [...this.props.logs, log],
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 更新指标
   * @param metrics 执行指标
   * @returns 更新后的工具执行
   */
  public updateMetrics(metrics: ToolExecutionMetrics): ToolExecution {
    return new ToolExecution({
      ...this.props,
      metrics: { ...this.props.metrics, ...metrics },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @returns 更新后的工具执行
   */
  public updateMetadata(metadata: Record<string, unknown>): ToolExecution {
    return new ToolExecution({
      ...this.props,
      metadata: { ...this.props.metadata, ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }

  // 查询方法

  /**
   * 检查是否可以重试
   * @returns 是否可以重试
   */
  public canRetry(): boolean {
    return this.status === ToolExecutionStatus.FAILED && this.retryCount < this.maxRetries;
  }

  /**
   * 检查是否正在运行
   * @returns 是否正在运行
   */
  public isRunning(): boolean {
    return this.status === ToolExecutionStatus.RUNNING;
  }

  /**
   * 检查是否已完成
   * @returns 是否已完成
   */
  public isCompleted(): boolean {
    return this.status === ToolExecutionStatus.COMPLETED;
  }

  /**
   * 检查是否已失败
   * @returns 是否已失败
   */
  public isFailed(): boolean {
    return this.status === ToolExecutionStatus.FAILED;
  }

  /**
   * 检查是否已取消
   * @returns 是否已取消
   */
  public isCancelled(): boolean {
    return this.status === ToolExecutionStatus.CANCELLED;
  }

  /**
   * 检查是否已完成（包括成功、失败和取消）
   * @returns 是否已完成
   */
  public isFinished(): boolean {
    return [
      ToolExecutionStatus.COMPLETED,
      ToolExecutionStatus.FAILED,
      ToolExecutionStatus.CANCELLED
    ].includes(this.status);
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `tool-execution:${this.props.id.toString()}`;
  }

  /**
   * 获取工具执行属性（用于持久化）
   * @returns 工具执行属性
   */
  public toProps(): ToolExecutionProps {
    return this.props;
  }

  /**
   * 转换为JSON对象
   * @returns JSON对象
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.props.id.value,
      toolId: this.props.toolId.value,
      status: this.props.status.value,
      parameters: this.props.parameters,
      result: this.props.result,
      error: this.props.error,
      startedAt: this.props.startedAt.toDate().toISOString(),
      endedAt: this.props.endedAt?.toDate().toISOString(),
      duration: this.props.duration,
      executorId: this.props.executorId?.value,
      sessionId: this.props.sessionId?.value,
      threadId: this.props.threadId?.value,
      workflowId: this.props.workflowId?.value,
      nodeId: this.props.nodeId?.value,
      context: this.props.context,
      metadata: this.props.metadata,
      retryCount: this.props.retryCount,
      maxRetries: this.props.maxRetries,
      logs: this.props.logs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        message: log.message,
        data: log.data
      })),
      metrics: this.props.metrics,
      createdAt: this.props.createdAt.toDate().toISOString(),
      updatedAt: this.props.updatedAt.toDate().toISOString(),
      version: this.props.version.toString()
    };
  }
}