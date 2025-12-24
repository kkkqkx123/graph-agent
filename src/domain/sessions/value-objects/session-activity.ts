import { ValueObject } from '../../common/value-objects/value-object';
import { Timestamp } from '../../common/value-objects/timestamp';

/**
 * 会话活动值对象属性接口
 */
export interface SessionActivityProps {
  readonly lastActivityAt: Timestamp;
  readonly messageCount: number;
  readonly threadCount: number;
}

/**
 * 会话活动值对象
 * 
 * 职责：表示会话的活动状态数据
 * 只包含数据，不包含业务逻辑
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
      threadCount
    });
  }

  /**
   * 获取最后活动时间
   * @returns 最后活动时间
   */
  public getLastActivityAt(): Timestamp {
    return this.props.lastActivityAt;
  }

  /**
   * 获取消息数量
   * @returns 消息数量
   */
  public getMessageCount(): number {
    return this.props.messageCount;
  }

  /**
   * 获取线程数量
   * @returns 线程数量
   */
  public getThreadCount(): number {
    return this.props.threadCount;
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
   * 比较两个会话活动是否相等
   * @param activity 另一个会话活动
   * @returns 是否相等
   */
  public override equals(activity?: SessionActivity): boolean {
    if (activity === null || activity === undefined) {
      return false;
    }
    return (
      this.props.lastActivityAt.equals(activity.getLastActivityAt()) &&
      this.props.messageCount === activity.getMessageCount() &&
      this.props.threadCount === activity.getThreadCount()
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
      threadCount: this.props.threadCount
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
  }
}