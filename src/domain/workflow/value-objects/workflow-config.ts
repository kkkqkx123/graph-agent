import { ValueObject } from '../../common/value-objects/value-object';
import { DomainError } from '../../common/errors/domain-error';

/**
 * 工作流配置接口
 */
export interface WorkflowConfigProps {
  maxExecutionTime: number; // 最大执行时间（秒）
  retryCount: number; // 重试次数
  timeoutSeconds: number; // 超时时间（秒）
  enableLogging: boolean; // 是否启用日志
  enableMetrics: boolean; // 是否启用指标收集
  enableCheckpointing: boolean; // 是否启用检查点
  checkpointInterval: number; // 检查点间隔（秒）
  maxConcurrentThreads: number; // 最大并发线程数
  metadata: Record<string, unknown>; // 元数据
  [key: string]: unknown;
}

/**
 * 工作流配置值对象
 * 
 * 用于表示工作流的配置信息
 */
export class WorkflowConfig extends ValueObject<WorkflowConfigProps> {
  /**
   * 创建默认配置
   * @returns 默认配置实例
   */
  public static default(): WorkflowConfig {
    return new WorkflowConfig({
      maxExecutionTime: 3600, // 1小时
      retryCount: 3,
      timeoutSeconds: 1800, // 30分钟
      enableLogging: true,
      enableMetrics: true,
      enableCheckpointing: true,
      checkpointInterval: 300, // 5分钟
      maxConcurrentThreads: 10,
      metadata: {}
    });
  }

  /**
   * 创建自定义配置
   * @param config 配置参数
   * @returns 配置实例
   */
  public static create(config: Partial<WorkflowConfigProps>): WorkflowConfig {
    const defaultConfig = this.default();
    return new WorkflowConfig({
      ...defaultConfig.value,
      ...config
    });
  }

  /**
   * 获取最大执行时间
   * @returns 最大执行时间（秒）
   */
  public getMaxExecutionTime(): number {
    return this.props.maxExecutionTime;
  }

  /**
   * 获取重试次数
   * @returns 重试次数
   */
  public getRetryCount(): number {
    return this.props.retryCount;
  }

  /**
   * 获取超时时间
   * @returns 超时时间（秒）
   */
  public getTimeoutSeconds(): number {
    return this.props.timeoutSeconds;
  }

  /**
   * 检查是否启用日志
   * @returns 是否启用日志
   */
  public isLoggingEnabled(): boolean {
    return this.props.enableLogging;
  }

  /**
   * 检查是否启用指标收集
   * @returns 是否启用指标收集
   */
  public isMetricsEnabled(): boolean {
    return this.props.enableMetrics;
  }

  /**
   * 检查是否启用检查点
   * @returns 是否启用检查点
   */
  public isCheckpointingEnabled(): boolean {
    return this.props.enableCheckpointing;
  }

  /**
   * 获取检查点间隔
   * @returns 检查点间隔（秒）
   */
  public getCheckpointInterval(): number {
    return this.props.checkpointInterval;
  }

  /**
   * 获取最大并发线程数
   * @returns 最大并发线程数
   */
  public getMaxConcurrentThreads(): number {
    return this.props.maxConcurrentThreads;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public getMetadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 更新配置
   * @param updates 更新的配置
   * @returns 新的配置实例
   */
  public update(updates: Partial<WorkflowConfigProps>): WorkflowConfig {
    return new WorkflowConfig({
      ...this.props,
      ...updates
    });
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @returns 新的配置实例
   */
  public updateMetadata(metadata: Record<string, unknown>): WorkflowConfig {
    return new WorkflowConfig({
      ...this.props,
      metadata: { ...metadata }
    });
  }

  /**
   * 添加元数据项
   * @param key 键
   * @param value 值
   * @returns 新的配置实例
   */
  public addMetadata(key: string, value: unknown): WorkflowConfig {
    return new WorkflowConfig({
      ...this.props,
      metadata: {
        ...this.props.metadata,
        [key]: value
      }
    });
  }

  /**
   * 移除元数据项
   * @param key 键
   * @returns 新的配置实例
   */
  public removeMetadata(key: string): WorkflowConfig {
    const newMetadata = { ...this.props.metadata };
    delete newMetadata[key];

    return new WorkflowConfig({
      ...this.props,
      metadata: newMetadata
    });
  }

  /**
   * 比较两个配置是否相等
   * @param config 另一个配置
   * @returns 是否相等
   */
  public override equals(config?: WorkflowConfig): boolean {
    if (config === null || config === undefined) {
      return false;
    }

    return (
      this.props.maxExecutionTime === config.getMaxExecutionTime() &&
      this.props.retryCount === config.getRetryCount() &&
      this.props.timeoutSeconds === config.getTimeoutSeconds() &&
      this.props.enableLogging === config.isLoggingEnabled() &&
      this.props.enableMetrics === config.isMetricsEnabled() &&
      this.props.enableCheckpointing === config.isCheckpointingEnabled() &&
      this.props.checkpointInterval === config.getCheckpointInterval() &&
      this.props.maxConcurrentThreads === config.getMaxConcurrentThreads() &&
      JSON.stringify(this.props.metadata) === JSON.stringify(config.getMetadata())
    );
  }

  /**
   * 验证配置的有效性
   */
  public validate(): void {
    if (this.props.maxExecutionTime <= 0) {
      throw new DomainError('最大执行时间必须大于0');
    }

    if (this.props.retryCount < 0) {
      throw new DomainError('重试次数不能为负数');
    }

    if (this.props.timeoutSeconds <= 0) {
      throw new DomainError('超时时间必须大于0');
    }

    if (this.props.timeoutSeconds > this.props.maxExecutionTime) {
      throw new DomainError('超时时间不能大于最大执行时间');
    }

    if (this.props.checkpointInterval <= 0) {
      throw new DomainError('检查点间隔必须大于0');
    }

    if (this.props.maxConcurrentThreads <= 0) {
      throw new DomainError('最大并发线程数必须大于0');
    }

    if (this.props.enableCheckpointing && this.props.checkpointInterval > this.props.timeoutSeconds) {
      throw new DomainError('检查点间隔不能大于超时时间');
    }
  }

  /**
   * 获取配置的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return JSON.stringify(this.props);
  }

  /**
   * 获取配置的摘要信息
   * @returns 摘要信息
   */
  public getSummary(): Record<string, unknown> {
    return {
      maxExecutionTime: this.props.maxExecutionTime,
      retryCount: this.props.retryCount,
      timeoutSeconds: this.props.timeoutSeconds,
      enableLogging: this.props.enableLogging,
      enableMetrics: this.props.enableMetrics,
      enableCheckpointing: this.props.enableCheckpointing,
      checkpointInterval: this.props.checkpointInterval,
      maxConcurrentThreads: this.props.maxConcurrentThreads,
      metadataKeys: Object.keys(this.props.metadata)
    };
  }
}