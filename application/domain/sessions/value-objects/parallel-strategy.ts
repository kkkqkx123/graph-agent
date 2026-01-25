import { ValueObject } from '../../common/value-objects';
import { ValidationError } from '../../common/exceptions';

/**
 * 并行策略类型
 */
export type ParallelStrategyType = 'sequential' | 'parallel' | 'hybrid';

/**
 * 并行策略值对象属性接口
 */
export interface ParallelStrategyProps {
  readonly value: ParallelStrategyType;
  readonly maxConcurrentThreads?: number;
}

/**
 * 并行策略值对象
 *
 * 职责：表示会话的并行执行策略
 */
export class ParallelStrategy extends ValueObject<ParallelStrategyProps> {
  public validate(): void {
    if (!this.props.value) {
      throw new ValidationError('并行策略类型不能为空');
    }

    if (!['sequential', 'parallel', 'hybrid'].includes(this.props.value)) {
      throw new ValidationError(`无效的并行策略类型: ${this.props.value}`);
    }

    if (this.props.maxConcurrentThreads !== undefined && this.props.maxConcurrentThreads <= 0) {
      throw new ValidationError('最大并发线程数必须大于0');
    }
  }
  /**
   * 创建顺序执行策略
   * @returns 顺序策略实例
   */
  public static sequential(): ParallelStrategy {
    return new ParallelStrategy({
      value: 'sequential',
      maxConcurrentThreads: 1,
    });
  }

  /**
   * 创建并行执行策略
   * @param maxConcurrentThreads 最大并发线程数
   * @returns 并行策略实例
   */
  public static parallel(maxConcurrentThreads: number = 5): ParallelStrategy {
    if (maxConcurrentThreads <= 0) {
      throw new ValidationError('最大并发线程数必须大于0');
    }

    return new ParallelStrategy({
      value: 'parallel',
      maxConcurrentThreads,
    });
  }

  /**
   * 创建混合执行策略
   * @param maxConcurrentThreads 最大并发线程数
   * @returns 混合策略实例
   */
  public static hybrid(maxConcurrentThreads: number = 3): ParallelStrategy {
    if (maxConcurrentThreads <= 0) {
      throw new ValidationError('最大并发线程数必须大于0');
    }

    return new ParallelStrategy({
      value: 'hybrid',
      maxConcurrentThreads,
    });
  }

  /**
   * 检查策略是否允许更改
   * @param hasActiveThreads 是否有活跃线程
   * @returns 是否允许更改
   */
  public canChange(hasActiveThreads: boolean): boolean {
    if (hasActiveThreads) {
      return false;
    }
    return true;
  }

  /**
   * 获取策略类型
   * @returns 策略类型
   */
  public get type(): ParallelStrategyType {
    return this.props.value;
  }

  /**
   * 获取最大并发线程数
   * @returns 最大并发线程数
   */
  public get maxConcurrentThreads(): number {
    return this.props.maxConcurrentThreads || 1;
  }

  /**
   * 检查是否为顺序策略
   * @returns 是否为顺序策略
   */
  public isSequential(): boolean {
    return this.props.value === 'sequential';
  }

  /**
   * 检查是否为并行策略
   * @returns 是否为并行策略
   */
  public isParallel(): boolean {
    return this.props.value === 'parallel';
  }

  /**
   * 检查是否为混合策略
   * @returns 是否为混合策略
   */
  public isHybrid(): boolean {
    return this.props.value === 'hybrid';
  }
}
