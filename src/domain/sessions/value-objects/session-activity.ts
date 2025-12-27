import { ValueObject } from '../../common/value-objects/value-object';
import { Timestamp } from '../../common/value-objects/timestamp';
import { LLMStatistics } from './statiscs/llm-statistics';
import { PerformanceStatistics } from './statiscs/performance-statistics';
import { ResourceUsage } from './statiscs/resource-usage';
import { OperationStatistics } from './statiscs/operation-statistics';

/**
 * 会话活动值对象属性接口
 */
export interface SessionActivityProps {
  readonly lastActivityAt: Timestamp;
  readonly messageCount: number;
  readonly threadCount: number;
  readonly llmStatistics: LLMStatistics;
  readonly performance: PerformanceStatistics;
  readonly resourceUsage: ResourceUsage;
  readonly operationStatistics: OperationStatistics;
}

/**
 * 会话活动值对象
 * 
 * 职责：表示会话的活动状态和统计数据
 * 包含基础统计、LLM使用统计、性能统计、资源监控和操作统计
 */
export class SessionActivity extends ValueObject<SessionActivityProps> {
  /**
   * 创建新的会话活动
   * @param lastActivityAt 最后活动时间
   * @param messageCount 消息数量
   * @param threadCount 线程数量
   * @returns 会话活动实例
   */
  public static create(
    lastActivityAt?: Timestamp,
    messageCount: number = 0,
    threadCount: number = 0
  ): SessionActivity {
    return new SessionActivity({
      lastActivityAt: lastActivityAt || Timestamp.now(),
      messageCount,
      threadCount,
      llmStatistics: LLMStatistics.create(),
      performance: PerformanceStatistics.create(),
      resourceUsage: ResourceUsage.create(),
      operationStatistics: OperationStatistics.create()
    });
  }

  /**
   * 获取最后活动时间
   * @returns 最后活动时间
   */
  public get lastActivityAt(): Timestamp {
    return this.props.lastActivityAt;
  }

  /**
   * 获取消息数量
   * @returns 消息数量
   */
  public get messageCount(): number {
    return this.props.messageCount;
  }

  /**
   * 获取线程数量
   * @returns 线程数量
   */
  public get threadCount(): number {
    return this.props.threadCount;
  }

  /**
   * 获取LLM统计信息
   * @returns LLM统计信息
   */
  public get llmStatistics(): LLMStatistics {
    return this.props.llmStatistics;
  }

  /**
   * 获取性能统计信息
   * @returns 性能统计信息
   */
  public get performance(): PerformanceStatistics {
    return this.props.performance;
  }

  /**
   * 获取资源使用情况
   * @returns 资源使用情况
   */
  public get resourceUsage(): ResourceUsage {
    return this.props.resourceUsage;
  }

  /**
   * 获取操作统计信息
   * @returns 操作统计信息
   */
  public get operationStatistics(): OperationStatistics {
    return this.props.operationStatistics;
  }

  /**
   * 更新最后活动时间
   * @returns 新的会话活动实例
   */
  public updateLastActivity(): SessionActivity {
    return new SessionActivity({
      ...this.props,
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 增加消息数量
   * @returns 新的会话活动实例
   */
  public incrementMessageCount(): SessionActivity {
    return new SessionActivity({
      ...this.props,
      messageCount: this.props.messageCount + 1,
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 增加线程数量
   * @returns 新的会话活动实例
   */
  public incrementThreadCount(): SessionActivity {
    return new SessionActivity({
      ...this.props,
      threadCount: this.props.threadCount + 1,
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 更新LLM统计信息
   * @param llmStatistics 新的LLM统计信息
   * @returns 新的会话活动实例
   */
  public updateLLMStatistics(llmStatistics: LLMStatistics): SessionActivity {
    return new SessionActivity({
      ...this.props,
      llmStatistics,
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 更新性能统计信息
   * @param performance 新的性能统计信息
   * @returns 新的会话活动实例
   */
  public updatePerformance(performance: PerformanceStatistics): SessionActivity {
    return new SessionActivity({
      ...this.props,
      performance,
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 更新资源使用情况
   * @param resourceUsage 新的资源使用情况
   * @returns 新的会话活动实例
   */
  public updateResourceUsage(resourceUsage: ResourceUsage): SessionActivity {
    return new SessionActivity({
      ...this.props,
      resourceUsage,
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 更新操作统计信息
   * @param operationStatistics 新的操作统计信息
   * @returns 新的会话活动实例
   */
  public updateOperationStatistics(operationStatistics: OperationStatistics): SessionActivity {
    return new SessionActivity({
      ...this.props,
      operationStatistics,
      lastActivityAt: Timestamp.now()
    });
  }

  /**
   * 比较两个会话活动是否相等
   * @param activity 另一个会话活动
   * @returns 是否相等
   */
  public override equals(activity?: SessionActivity): boolean {
    if (activity === null || activity === undefined) {
      return false;
    }
    return (
      this.props.lastActivityAt.equals(activity.lastActivityAt) &&
      this.props.messageCount === activity.messageCount &&
      this.props.threadCount === activity.threadCount
    );
  }

  /**
   * 获取会话活动的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return JSON.stringify({
      lastActivityAt: this.props.lastActivityAt.toString(),
      messageCount: this.props.messageCount,
      threadCount: this.props.threadCount,
      totalTokens: this.props.llmStatistics.totalTokens,
      totalCost: this.props.llmStatistics.totalCost,
      averageExecutionTime: this.props.performance.averageExecutionTime
    });
  }

  /**
   * 验证会话活动的有效性
   */
  public validate(): void {
    if (this.props.messageCount < 0) {
      throw new Error('消息数量不能为负数');
    }

    if (this.props.threadCount < 0) {
      throw new Error('线程数量不能为负数');
    }

    // 验证子统计信息
    this.props.llmStatistics.validate();
    this.props.performance.validate();
    this.props.resourceUsage.validate();
    this.props.operationStatistics.validate();
  }
}