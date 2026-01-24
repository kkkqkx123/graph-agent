import { ValueObject, ID, Timestamp } from '../../common/value-objects';
import { ValidationError } from '../../common/exceptions';

/**
 * ThreadDefinition值对象属性接口
 */
export interface ThreadDefinitionProps {
  readonly threadId: ID;
  readonly sessionId: ID;
  readonly workflowId?: ID;
  readonly title?: string;
  readonly description?: string;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Timestamp;
}

/**
 * ThreadDefinition值对象
 *
 * 表示线程的定义信息，是不可变的
 * 包含线程的基本属性和元数据
 */
export class ThreadDefinition extends ValueObject<ThreadDefinitionProps> {
  /**
   * 创建线程定义值对象
   * @param threadId 线程ID
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param title 线程标题
   * @param description 线程描述
   * @param metadata 元数据
   * @returns 线程定义值对象
   */
  public static create(
    threadId: ID,
    sessionId: ID,
    workflowId?: ID,
    title?: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): ThreadDefinition {
    const now = Timestamp.now();

    return new ThreadDefinition({
      threadId,
      sessionId,
      workflowId,
      title,
      description,
      metadata: metadata || {},
      createdAt: now,
    });
  }

  /**
   * 从已有属性重建线程定义
   * @param props 线程定义属性
   * @returns 线程定义值对象
   */
  public static fromProps(props: ThreadDefinitionProps): ThreadDefinition {
    return new ThreadDefinition(props);
  }

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  public get threadId(): ID {
    return this.props.threadId;
  }

  /**
   * 获取会话ID
   * @returns 会话ID
   */
  public get sessionId(): ID {
    return this.props.sessionId;
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get workflowId(): ID | undefined {
    return this.props.workflowId;
  }

  /**
   * 获取线程标题
   * @returns 线程标题
   */
  public get title(): string | undefined {
    return this.props.title;
  }

  /**
   * 获取线程描述
   * @returns 线程描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取创建时间
   * @returns 创建时间
   */
  public get createdAt(): Timestamp {
    return this.props.createdAt;
  }

  /**
   * 更新标题（创建新实例）
   * @param title 新标题
   * @returns 新的线程定义值对象
   */
  public updateTitle(title: string): ThreadDefinition {
    return new ThreadDefinition({
      ...this.props,
      title,
    });
  }

  /**
   * 更新描述（创建新实例）
   * @param description 新描述
   * @returns 新的线程定义值对象
   */
  public updateDescription(description: string): ThreadDefinition {
    return new ThreadDefinition({
      ...this.props,
      description,
    });
  }

  /**
   * 更新元数据（创建新实例）
   * @param metadata 新元数据
   * @returns 新的线程定义值对象
   */
  public updateMetadata(metadata: Record<string, unknown>): ThreadDefinition {
    return new ThreadDefinition({
      ...this.props,
      metadata: { ...metadata },
    });
  }

  /**
   * 验证线程定义的有效性
   */
  public validate(): void {
    if (!this.props.threadId) {
      throw new ValidationError('线程ID不能为空');
    }

    if (!this.props.sessionId) {
      throw new ValidationError('会话ID不能为空');
    }

    if (this.props.title && this.props.title.trim().length === 0) {
      throw new ValidationError('线程标题不能为空字符串');
    }

    if (this.props.description && this.props.description.trim().length === 0) {
      throw new ValidationError('线程描述不能为空字符串');
    }
  }
}
