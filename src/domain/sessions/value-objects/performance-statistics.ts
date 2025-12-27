import { ValueObject } from '../../common/value-objects/value-object';

/**
 * 性能统计信息属性接口
 */
export interface PerformanceStatisticsProps {
  readonly averageExecutionTime: number;
  readonly maxExecutionTime: number;
  readonly minExecutionTime: number;
  readonly totalExecutionTime: number;
  readonly executionCount: number;
  readonly successRate: number;
  readonly failureRate: number;
}

/**
 * 性能统计信息值对象
 * 
 * 职责：表示性能统计信息
 */
export class PerformanceStatistics extends ValueObject<PerformanceStatisticsProps> {
  /**
   * 创建性能统计信息
   * @returns 性能统计信息实例
   */
  public static create(): PerformanceStatistics {
    return new PerformanceStatistics({
      averageExecutionTime: 0,
      maxExecutionTime: 0,
      minExecutionTime: 0,
      totalExecutionTime: 0,
      executionCount: 0,
      successRate: 0,
      failureRate: 0
    });
  }

  /**
   * 获取平均执行时间
   * @returns 平均执行时间（毫秒）
   */
  public get averageExecutionTime(): number {
    return this.props.averageExecutionTime;
  }

  /**
   * 获取最大执行时间
   * @returns 最大执行时间（毫秒）
   */
  public get maxExecutionTime(): number {
    return this.props.maxExecutionTime;
  }

  /**
   * 获取最小执行时间
   * @returns 最小执行时间（毫秒）
   */
  public get minExecutionTime(): number {
    return this.props.minExecutionTime;
  }

  /**
   * 获取总执行时间
   * @returns 总执行时间（毫秒）
   */
  public get totalExecutionTime(): number {
    return this.props.totalExecutionTime;
  }

  /**
   * 获取执行次数
   * @returns 执行次数
   */
  public get executionCount(): number {
    return this.props.executionCount;
  }

  /**
   * 获取成功率
   * @returns 成功率（0-1）
   */
  public get successRate(): number {
    return this.props.successRate;
  }

  /**
   * 获取失败率
   * @returns 失败率（0-1）
   */
  public get failureRate(): number {
    return this.props.failureRate;
  }

  /**
   * 添加执行记录
   * @param executionTime 执行时间（毫秒）
   * @param success 是否成功
   * @returns 新的性能统计信息实例
   */
  public addExecutionRecord(executionTime: number, success: boolean): PerformanceStatistics {
    const newExecutionCount = this.props.executionCount + 1;
    const newTotalExecutionTime = this.props.totalExecutionTime + executionTime;
    const newAverageExecutionTime = newTotalExecutionTime / newExecutionCount;
    
    const newMaxExecutionTime = Math.max(this.props.maxExecutionTime, executionTime);
    const newMinExecutionTime = this.props.minExecutionTime === 0 
      ? executionTime 
      : Math.min(this.props.minExecutionTime, executionTime);

    const successCount = success ? 1 : 0;
    const totalSuccessCount = this.props.successRate * this.props.executionCount + successCount;
    const newSuccessRate = totalSuccessCount / newExecutionCount;
    const newFailureRate = 1 - newSuccessRate;

    return new PerformanceStatistics({
      averageExecutionTime: newAverageExecutionTime,
      maxExecutionTime: newMaxExecutionTime,
      minExecutionTime: newMinExecutionTime,
      totalExecutionTime: newTotalExecutionTime,
      executionCount: newExecutionCount,
      successRate: newSuccessRate,
      failureRate: newFailureRate
    });
  }

  /**
   * 验证性能统计信息的有效性
   */
  public validate(): void {
    if (this.props.averageExecutionTime < 0) {
      throw new Error('平均执行时间不能为负数');
    }

    if (this.props.maxExecutionTime < 0) {
      throw new Error('最大执行时间不能为负数');
    }

    if (this.props.minExecutionTime < 0) {
      throw new Error('最小执行时间不能为负数');
    }

    if (this.props.totalExecutionTime < 0) {
      throw new Error('总执行时间不能为负数');
    }

    if (this.props.executionCount < 0) {
      throw new Error('执行次数不能为负数');
    }

    if (this.props.successRate < 0 || this.props.successRate > 1) {
      throw new Error('成功率必须在0-1之间');
    }

    if (this.props.failureRate < 0 || this.props.failureRate > 1) {
      throw new Error('失败率必须在0-1之间');
    }

    if (Math.abs(this.props.successRate + this.props.failureRate - 1) > 0.01) {
      throw new Error('成功率和失败率之和应该为1');
    }
  }
}