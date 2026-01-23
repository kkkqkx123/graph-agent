import { ValueObject } from '../../common/value-objects';

/**
 * 节点重试策略属性接口
 */
export interface NodeRetryStrategyProps {
  /** 是否启用重试 */
  readonly enabled: boolean;
  /** 最大重试次数 */
  readonly maxRetries: number;
  /** 重试延迟（毫秒） */
  readonly retryDelay: number;
  /** 是否使用指数退避 */
  readonly useExponentialBackoff: boolean;
  /** 指数退避的基数 */
  readonly exponentialBase: number;
  /** 最大重试延迟（毫秒） */
  readonly maxRetryDelay: number;
}

/**
 * 节点重试策略值对象
 *
 * 定义节点的重试行为，包括重试次数、延迟等配置
 */
export class NodeRetryStrategy extends ValueObject<NodeRetryStrategyProps> {
  private constructor(props: NodeRetryStrategyProps) {
    super(props);
    this.validate();
  }

  /**
   * 验证重试策略的有效性
   */
  public validate(): void {
    if (this.props.maxRetries < 0) {
      throw new Error('最大重试次数不能为负数');
    }

    if (this.props.retryDelay < 0) {
      throw new Error('重试延迟不能为负数');
    }

    if (this.props.exponentialBase < 1) {
      throw new Error('指数退避基数必须大于等于1');
    }

    if (this.props.maxRetryDelay < this.props.retryDelay) {
      throw new Error('最大重试延迟不能小于重试延迟');
    }
  }

  /**
   * 创建禁用重试的策略
   */
  public static disabled(): NodeRetryStrategy {
    return new NodeRetryStrategy({
      enabled: false,
      maxRetries: 0,
      retryDelay: 0,
      useExponentialBackoff: false,
      exponentialBase: 2,
      maxRetryDelay: 0,
    });
  }

  /**
   * 创建启用重试的策略
   * @param maxRetries 最大重试次数
   * @param retryDelay 重试延迟（毫秒）
   * @param useExponentialBackoff 是否使用指数退避
   */
  public static enabled(
    maxRetries: number = 3,
    retryDelay: number = 1000,
    useExponentialBackoff: boolean = false
  ): NodeRetryStrategy {
    return new NodeRetryStrategy({
      enabled: true,
      maxRetries,
      retryDelay,
      useExponentialBackoff,
      exponentialBase: 2,
      maxRetryDelay: useExponentialBackoff ? 60000 : retryDelay,
    });
  }

  /**
   * 创建使用指数退避的重试策略
   * @param maxRetries 最大重试次数
   * @param baseDelay 基础延迟（毫秒）
   * @param exponentialBase 指数基数
   * @param maxDelay 最大延迟（毫秒）
   */
  public static withExponentialBackoff(
    maxRetries: number = 3,
    baseDelay: number = 1000,
    exponentialBase: number = 2,
    maxDelay: number = 60000
  ): NodeRetryStrategy {
    return new NodeRetryStrategy({
      enabled: true,
      maxRetries,
      retryDelay: baseDelay,
      useExponentialBackoff: true,
      exponentialBase,
      maxRetryDelay: maxDelay,
    });
  }

  /**
   * 从配置对象创建重试策略
   */
  public static fromConfig(config: Partial<NodeRetryStrategyProps>): NodeRetryStrategy {
    return new NodeRetryStrategy({
      enabled: config.enabled ?? true,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      useExponentialBackoff: config.useExponentialBackoff ?? false,
      exponentialBase: config.exponentialBase ?? 2,
      maxRetryDelay: config.maxRetryDelay ?? (config.useExponentialBackoff ? 60000 : config.retryDelay ?? 1000),
    });
  }

  /**
   * 检查是否启用重试
   */
  public isEnabled(): boolean {
    return this.props.enabled;
  }

  /**
   * 获取最大重试次数
   */
  public getMaxRetries(): number {
    return this.props.maxRetries;
  }

  /**
   * 获取重试延迟
   */
  public getRetryDelay(): number {
    return this.props.retryDelay;
  }

  /**
   * 检查是否使用指数退避
   */
  public isUsingExponentialBackoff(): boolean {
    return this.props.useExponentialBackoff;
  }

  /**
   * 获取指数退避基数
   */
  public getExponentialBase(): number {
    return this.props.exponentialBase;
  }

  /**
   * 获取最大重试延迟
   */
  public getMaxRetryDelay(): number {
    return this.props.maxRetryDelay;
  }

  /**
   * 计算第n次重试的延迟时间
   * @param attempt 重试次数（从0开始）
   */
  public calculateRetryDelay(attempt: number): number {
    if (!this.props.enabled) {
      return 0;
    }

    if (!this.props.useExponentialBackoff) {
      return this.props.retryDelay;
    }

    // 指数退避计算
    const delay = this.props.retryDelay * Math.pow(this.props.exponentialBase, attempt);
    return Math.min(delay, this.props.maxRetryDelay);
  }

  /**
   * 比较两个重试策略是否相等
   */
  public override equals(vo?: ValueObject<NodeRetryStrategyProps>): boolean {
    if (!vo) return false;
    const other = vo as NodeRetryStrategy;
    return (
      this.props.enabled === other.props.enabled &&
      this.props.maxRetries === other.props.maxRetries &&
      this.props.retryDelay === other.props.retryDelay &&
      this.props.useExponentialBackoff === other.props.useExponentialBackoff &&
      this.props.exponentialBase === other.props.exponentialBase &&
      this.props.maxRetryDelay === other.props.maxRetryDelay
    );
  }

  /**
   * 转换为字符串表示
   */
  public override toString(): string {
    if (!this.props.enabled) {
      return 'NodeRetryStrategy(disabled)';
    }
    return `NodeRetryStrategy(enabled, maxRetries=${this.props.maxRetries}, delay=${this.props.retryDelay}ms${this.props.useExponentialBackoff ? ', exponential' : ''})`;
  }

  /**
   * 转换为配置对象
   */
  public toConfig(): NodeRetryStrategyProps {
    return { ...this.props };
  }
}