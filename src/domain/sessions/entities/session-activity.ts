import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';

/**
 * SessionActivity实体属性接口
 */
export interface SessionActivityProps {
  readonly id: ID;
  readonly sessionDefinitionId: ID;
  readonly lastActivityAt: Timestamp;
  readonly messageCount: number;
  readonly threadCount: number;
  readonly totalExecutionTime: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly averageResponseTime: number;
  readonly throughput: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

/**
 * SessionActivity实体
 * 
 * 职责：会话的活动跟踪和统计
 * 专注于：
 * - 活动跟踪
 * - 统计信息
 * - 性能指标
 */
export class SessionActivity extends Entity {
  private readonly props: SessionActivityProps;

  /**
   * 构造函数
   * @param props 会话活动属性
   */
  private constructor(props: SessionActivityProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新会话活动
   * @param sessionDefinitionId 会话定义ID
   * @returns 新会话活动实例
   */
  public static create(sessionDefinitionId: ID): SessionActivity {
    const now = Timestamp.now();
    const activityId = ID.generate();

    const props: SessionActivityProps = {
      id: activityId,
      sessionDefinitionId,
      lastActivityAt: now,
      messageCount: 0,
      threadCount: 0,
      totalExecutionTime: 0,
      successCount: 0,
      failureCount: 0,
      averageResponseTime: 0,
      throughput: 0,
      createdAt: now,
      updatedAt: now,
      version: Version.initial()
    };

    return new SessionActivity(props);
  }

  /**
   * 从已有属性重建会话活动
   * @param props 会话活动属性
   * @returns 会话活动实例
   */
  public static fromProps(props: SessionActivityProps): SessionActivity {
    return new SessionActivity(props);
  }

  /**
   * 获取活动ID
   * @returns 活动ID
   */
  public get activityId(): ID {
    return this.props.id;
  }

  /**
   * 获取会话定义ID
   * @returns 会话定义ID
   */
  public get sessionDefinitionId(): ID {
    return this.props.sessionDefinitionId;
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
   * 获取总执行时间
   * @returns 总执行时间（毫秒）
   */
  public get totalExecutionTime(): number {
    return this.props.totalExecutionTime;
  }

  /**
   * 获取成功次数
   * @returns 成功次数
   */
  public get successCount(): number {
    return this.props.successCount;
  }

  /**
   * 获取失败次数
   * @returns 失败次数
   */
  public get failureCount(): number {
    return this.props.failureCount;
  }

  /**
   * 获取平均响应时间
   * @returns 平均响应时间（毫秒）
   */
  public get averageResponseTime(): number {
    return this.props.averageResponseTime;
  }

  /**
   * 获取吞吐量
   * @returns 吞吐量（请求/秒）
   */
  public get throughput(): number {
    return this.props.throughput;
  }

  /**
   * 更新最后活动时间
   */
  public updateLastActivity(): void {
    const newProps: SessionActivityProps = {
      ...this.props,
      lastActivityAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 增加消息数量
   */
  public incrementMessageCount(): void {
    const newProps: SessionActivityProps = {
      ...this.props,
      messageCount: this.props.messageCount + 1,
      lastActivityAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 增加线程数量
   */
  public incrementThreadCount(): void {
    const newProps: SessionActivityProps = {
      ...this.props,
      threadCount: this.props.threadCount + 1,
      lastActivityAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 增加执行时间
   * @param executionTime 执行时间（毫秒）
   */
  public addExecutionTime(executionTime: number): void {
    if (executionTime < 0) {
      throw new Error('执行时间不能为负数');
    }

    const newTotalTime = this.props.totalExecutionTime + executionTime;
    const totalExecutions = this.props.successCount + this.props.failureCount;
    const newAverageTime = totalExecutions > 0 ? newTotalTime / totalExecutions : 0;

    const newProps: SessionActivityProps = {
      ...this.props,
      totalExecutionTime: newTotalTime,
      averageResponseTime: newAverageTime,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 记录成功执行
   * @param executionTime 执行时间（毫秒）
   */
  public recordSuccess(executionTime: number): void {
    if (executionTime < 0) {
      throw new Error('执行时间不能为负数');
    }

    const newSuccessCount = this.props.successCount + 1;
    const totalExecutions = newSuccessCount + this.props.failureCount;
    const newTotalTime = this.props.totalExecutionTime + executionTime;
    const newAverageTime = totalExecutions > 0 ? newTotalTime / totalExecutions : 0;

    // 计算吞吐量（每分钟的请求数）
    const sessionDuration = Timestamp.now().diff(this.props.createdAt) / 1000; // 秒
    const newThroughput = sessionDuration > 0 ? (totalExecutions / sessionDuration) * 60 : 0;

    const newProps: SessionActivityProps = {
      ...this.props,
      successCount: newSuccessCount,
      totalExecutionTime: newTotalTime,
      averageResponseTime: newAverageTime,
      throughput: newThroughput,
      lastActivityAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 记录失败执行
   * @param executionTime 执行时间（毫秒）
   */
  public recordFailure(executionTime: number): void {
    if (executionTime < 0) {
      throw new Error('执行时间不能为负数');
    }

    const newFailureCount = this.props.failureCount + 1;
    const totalExecutions = this.props.successCount + newFailureCount;
    const newTotalTime = this.props.totalExecutionTime + executionTime;
    const newAverageTime = totalExecutions > 0 ? newTotalTime / totalExecutions : 0;

    // 计算吞吐量（每分钟的请求数）
    const sessionDuration = Timestamp.now().diff(this.props.createdAt) / 1000; // 秒
    const newThroughput = sessionDuration > 0 ? (totalExecutions / sessionDuration) * 60 : 0;

    const newProps: SessionActivityProps = {
      ...this.props,
      failureCount: newFailureCount,
      totalExecutionTime: newTotalTime,
      averageResponseTime: newAverageTime,
      throughput: newThroughput,
      lastActivityAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 获取成功率
   * @returns 成功率（0-1）
   */
  public getSuccessRate(): number {
    const totalExecutions = this.props.successCount + this.props.failureCount;
    return totalExecutions > 0 ? this.props.successCount / totalExecutions : 0;
  }

  /**
   * 获取失败率
   * @returns 失败率（0-1）
   */
  public getFailureRate(): number {
    const totalExecutions = this.props.successCount + this.props.failureCount;
    return totalExecutions > 0 ? this.props.failureCount / totalExecutions : 0;
  }

  /**
   * 验证聚合的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new Error('活动ID不能为空');
    }

    if (!this.props.sessionDefinitionId) {
      throw new Error('会话定义ID不能为空');
    }

    if (!this.props.lastActivityAt) {
      throw new Error('最后活动时间不能为空');
    }

    if (this.props.messageCount < 0) {
      throw new Error('消息数量不能为负数');
    }

    if (this.props.threadCount < 0) {
      throw new Error('线程数量不能为负数');
    }

    if (this.props.totalExecutionTime < 0) {
      throw new Error('总执行时间不能为负数');
    }

    if (this.props.successCount < 0) {
      throw new Error('成功次数不能为负数');
    }

    if (this.props.failureCount < 0) {
      throw new Error('失败次数不能为负数');
    }

    if (this.props.averageResponseTime < 0) {
      throw new Error('平均响应时间不能为负数');
    }

    if (this.props.throughput < 0) {
      throw new Error('吞吐量不能为负数');
    }

    // 验证时间逻辑
    if (this.props.lastActivityAt.isBefore(this.props.createdAt)) {
      throw new Error('最后活动时间不能早于创建时间');
    }

    // 验证统计逻辑
    const totalExecutions = this.props.successCount + this.props.failureCount;
    if (totalExecutions > 0 && this.props.averageResponseTime <= 0) {
      throw new Error('有执行记录时平均响应时间必须大于0');
    }
  }


  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `session-activity:${this.props.id.toString()}`;
  }
}