import { ValueObject } from '../../common/value-objects/value-object';
import { ID } from '../../common/value-objects/id';
import { ExecutionModeValue } from './execution-mode';
import { DomainError } from '../../common/errors/domain-error';

/**
 * 图执行上下文属性接口
 */
export interface GraphExecutionContextProps {
  executionId: ID;
  graphId: ID;
  mode: ExecutionModeValue;
  threadId?: string;
  sessionId?: string;
  userId?: ID;
  startTime: Date;
  endTime?: Date;
  timeout?: number;
  maxRetries: number;
  currentRetry: number;
  metadata: Record<string, unknown>;
  config: Record<string, unknown>;
}

/**
 * 图执行上下文值对象
 * 
 * 表示图执行的上下文信息
 */
export class GraphExecutionContextValue extends ValueObject<GraphExecutionContextProps> {
  constructor(props: GraphExecutionContextProps) {
    super(props);
    this.validate();
  }

  /**
   * 验证执行上下文
   */
  public validate(): void {
    if (!this.props.executionId) {
      throw new DomainError('执行ID不能为空');
    }
    if (!this.props.graphId) {
      throw new DomainError('图ID不能为空');
    }
    if (!this.props.mode) {
      throw new DomainError('执行模式不能为空');
    }
    if (!this.props.startTime) {
      throw new DomainError('开始时间不能为空');
    }
    if (this.props.maxRetries < 0) {
      throw new DomainError('最大重试次数不能为负数');
    }
    if (this.props.currentRetry < 0) {
      throw new DomainError('当前重试次数不能为负数');
    }
    if (this.props.currentRetry > this.props.maxRetries) {
      throw new DomainError('当前重试次数不能超过最大重试次数');
    }
    if (this.props.timeout !== undefined && this.props.timeout <= 0) {
      throw new DomainError('超时时间必须大于0');
    }
  }

  /**
   * 获取执行ID
   */
  public get executionId(): ID {
    return this.props.executionId;
  }

  /**
   * 获取图ID
   */
  public get graphId(): ID {
    return this.props.graphId;
  }

  /**
   * 获取执行模式
   */
  public get mode(): ExecutionModeValue {
    return this.props.mode;
  }

  /**
   * 获取线程ID
   */
  public get threadId(): string | undefined {
    return this.props.threadId;
  }

  /**
   * 获取会话ID
   */
  public get sessionId(): string | undefined {
    return this.props.sessionId;
  }

  /**
   * 获取用户ID
   */
  public get userId(): ID | undefined {
    return this.props.userId;
  }

  /**
   * 获取开始时间
   */
  public get startTime(): Date {
    return this.props.startTime;
  }

  /**
   * 获取结束时间
   */
  public get endTime(): Date | undefined {
    return this.props.endTime;
  }

  /**
   * 获取超时时间
   */
  public get timeout(): number | undefined {
    return this.props.timeout;
  }

  /**
   * 获取最大重试次数
   */
  public get maxRetries(): number {
    return this.props.maxRetries;
  }

  /**
   * 获取当前重试次数
   */
  public get currentRetry(): number {
    return this.props.currentRetry;
  }

  /**
   * 获取元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取配置
   */
  public get config(): Record<string, unknown> {
    return { ...this.props.config };
  }

  /**
   * 检查是否已完成
   */
  public isCompleted(): boolean {
    return this.props.endTime !== undefined;
  }

  /**
   * 检查是否超时
   */
  public isTimeout(): boolean {
    if (!this.props.timeout) {
      return false;
    }
    const elapsed = Date.now() - this.props.startTime.getTime();
    return elapsed > this.props.timeout;
  }

  /**
   * 检查是否可以重试
   */
  public canRetry(): boolean {
    return this.props.currentRetry < this.props.maxRetries;
  }

  /**
   * 检查是否为同步模式
   */
  public isSync(): boolean {
    return this.props.mode.isSync();
  }

  /**
   * 检查是否为异步模式
   */
  public isAsync(): boolean {
    return this.props.mode.isAsync();
  }

  /**
   * 检查是否为流式模式
   */
  public isStream(): boolean {
    return this.props.mode.isStream();
  }

  /**
   * 获取执行持续时间
   */
  public getDuration(): number {
    const endTime = this.props.endTime || new Date();
    return endTime.getTime() - this.props.startTime.getTime();
  }

  /**
   * 获取元数据值
   */
  public getMetadataValue(key: string): unknown {
    return this.props.metadata[key];
  }

  /**
   * 检查是否有指定的元数据
   */
  public hasMetadata(key: string): boolean {
    return key in this.props.metadata;
  }

  /**
   * 获取配置值
   */
  public getConfigValue(key: string): unknown {
    return this.props.config[key];
  }

  /**
   * 检查是否有指定的配置
   */
  public hasConfig(key: string): boolean {
    return key in this.props.config;
  }

  /**
   * 创建新的执行上下文
   */
  public static create(
    executionId: ID,
    graphId: ID,
    mode: ExecutionModeValue,
    options?: {
      threadId?: string;
      sessionId?: string;
      userId?: ID;
      timeout?: number;
      maxRetries?: number;
      metadata?: Record<string, unknown>;
      config?: Record<string, unknown>;
    }
  ): GraphExecutionContextValue {
    return new GraphExecutionContextValue({
      executionId,
      graphId,
      mode,
      threadId: options?.threadId,
      sessionId: options?.sessionId,
      userId: options?.userId,
      startTime: new Date(),
      timeout: options?.timeout,
      maxRetries: options?.maxRetries ?? 3,
      currentRetry: 0,
      metadata: options?.metadata ?? {},
      config: options?.config ?? {}
    });
  }

  /**
   * 标记为完成
   */
  public markCompleted(): GraphExecutionContextValue {
    if (this.isCompleted()) {
      return this;
    }
    return new GraphExecutionContextValue({
      ...this.props,
      endTime: new Date()
    });
  }

  /**
   * 增加重试次数
   */
  public incrementRetry(): GraphExecutionContextValue {
    if (!this.canRetry()) {
      throw new DomainError('已达到最大重试次数');
    }
    return new GraphExecutionContextValue({
      ...this.props,
      currentRetry: this.props.currentRetry + 1
    });
  }

  /**
   * 重置重试次数
   */
  public resetRetry(): GraphExecutionContextValue {
    return new GraphExecutionContextValue({
      ...this.props,
      currentRetry: 0
    });
  }

  /**
   * 复制并修改执行上下文
   */
  public withChanges(changes: Partial<GraphExecutionContextProps>): GraphExecutionContextValue {
    return new GraphExecutionContextValue({
      ...this.props,
      ...changes
    });
  }

  /**
   * 复制并添加元数据
   */
  public withMetadata(key: string, value: unknown): GraphExecutionContextValue {
    return new GraphExecutionContextValue({
      ...this.props,
      metadata: {
        ...this.props.metadata,
        [key]: value
      }
    });
  }

  /**
   * 复制并移除元数据
   */
  public withoutMetadata(key: string): GraphExecutionContextValue {
    const newMetadata = { ...this.props.metadata };
    delete newMetadata[key];
    return new GraphExecutionContextValue({
      ...this.props,
      metadata: newMetadata
    });
  }

  /**
   * 复制并添加配置
   */
  public withConfig(key: string, value: unknown): GraphExecutionContextValue {
    return new GraphExecutionContextValue({
      ...this.props,
      config: {
        ...this.props.config,
        [key]: value
      }
    });
  }

  /**
   * 复制并移除配置
   */
  public withoutConfig(key: string): GraphExecutionContextValue {
    const newConfig = { ...this.props.config };
    delete newConfig[key];
    return new GraphExecutionContextValue({
      ...this.props,
      config: newConfig
    });
  }

  /**
   * 比较两个执行上下文是否相等
   */
  public override equals(vo?: ValueObject<GraphExecutionContextProps>): boolean {
    if (!vo) return false;
    const other = vo as GraphExecutionContextValue;
    return (
      this.props.executionId.equals(other.props.executionId) &&
      this.props.graphId.equals(other.props.graphId) &&
      this.props.mode.equals(other.props.mode)
    );
  }

  /**
   * 转换为JSON对象
   */
  public toJSON(): Record<string, unknown> {
    return {
      executionId: this.props.executionId.toString(),
      graphId: this.props.graphId.toString(),
      mode: this.props.mode.toJSON(),
      threadId: this.props.threadId,
      sessionId: this.props.sessionId,
      userId: this.props.userId?.toString(),
      startTime: this.props.startTime.toISOString(),
      endTime: this.props.endTime?.toISOString(),
      timeout: this.props.timeout,
      maxRetries: this.props.maxRetries,
      currentRetry: this.props.currentRetry,
      metadata: this.props.metadata,
      config: this.props.config
    };
  }

  /**
   * 从JSON对象创建执行上下文
   */
  public static fromJSON(json: Record<string, unknown>): GraphExecutionContextValue {
    try {
      return new GraphExecutionContextValue({
        executionId: ID.fromString(json['executionId'] as string),
        graphId: ID.fromString(json['graphId'] as string),
        mode: ExecutionModeValue.fromString(json['mode'] as string),
        threadId: json['threadId'] as string,
        sessionId: json['sessionId'] as string,
        userId: json['userId'] ? ID.fromString(json['userId'] as string) : undefined,
        startTime: new Date(json['startTime'] as string),
        endTime: json['endTime'] ? new Date(json['endTime'] as string) : undefined,
        timeout: json['timeout'] as number,
        maxRetries: json['maxRetries'] as number,
        currentRetry: json['currentRetry'] as number,
        metadata: json['metadata'] as Record<string, unknown>,
        config: json['config'] as Record<string, unknown>
      });
    } catch (error) {
      throw new DomainError(`无法从JSON创建图执行上下文: ${error}`);
    }
  }
}