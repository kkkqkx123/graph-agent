import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { ThreadPriority } from '../value-objects/thread-priority';

/**
 * ThreadDefinition实体属性接口
 */
export interface ThreadDefinitionProps {
  readonly id: ID;
  readonly sessionId: ID;
  readonly workflowId?: ID;
  readonly title?: string;
  readonly description?: string;
  readonly priority: ThreadPriority;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly createdBy?: ID;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

/**
 * ThreadDefinition实体
 * 
 * 职责：线程的基本定义和元数据管理
 * 专注于：
 * - 线程的基本属性定义
 * - 元数据管理
 * - 创建信息管理
 */
export class ThreadDefinition extends Entity {
  private readonly props: ThreadDefinitionProps;

  /**
   * 构造函数
   * @param props 线程定义属性
   */
  private constructor(props: ThreadDefinitionProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新线程定义
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param priority 线程优先级
   * @param title 线程标题
   * @param description 线程描述
   * @param metadata 元数据
   * @param createdBy 创建者ID
   * @returns 新线程定义实例
   */
  public static create(
    sessionId: ID,
    workflowId?: ID,
    priority?: ThreadPriority,
    title?: string,
    description?: string,
    metadata?: Record<string, unknown>,
    createdBy?: ID
  ): ThreadDefinition {
    const now = Timestamp.now();
    const threadId = ID.generate();
    const threadPriority = priority || ThreadPriority.normal();

    const props: ThreadDefinitionProps = {
      id: threadId,
      sessionId,
      workflowId,
      priority: threadPriority,
      title,
      description,
      metadata: metadata || {},
      createdAt: now,
      createdBy,
      updatedAt: now,
      version: Version.initial()
    };

    return new ThreadDefinition(props);
  }

  /**
   * 从已有属性重建线程定义
   * @param props 线程定义属性
   * @returns 线程定义实例
   */
  public static fromProps(props: ThreadDefinitionProps): ThreadDefinition {
    return new ThreadDefinition(props);
  }

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  public get threadId(): ID {
    return this.props.id;
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
   * 获取线程优先级
   * @returns 线程优先级
   */
  public get priority(): ThreadPriority {
    return this.props.priority;
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
   * 获取创建者ID
   * @returns 创建者ID
   */
  public get createdBy(): ID | undefined {
    return this.props.createdBy;
  }

  /**
   * 更新线程标题
   * @param title 新标题
   */
  public updateTitle(title: string): void {
    const newProps: ThreadDefinitionProps = {
      ...this.props,
      title,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新线程描述
   * @param description 新描述
   */
  public updateDescription(description: string): void {
    const newProps: ThreadDefinitionProps = {
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新线程优先级
   * @param priority 新优先级
   */
  public updatePriority(priority: ThreadPriority): void {
    const newProps: ThreadDefinitionProps = {
      ...this.props,
      priority,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   */
  public updateMetadata(metadata: Record<string, unknown>): void {
    const newProps: ThreadDefinitionProps = {
      ...this.props,
      metadata: { ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 验证聚合的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new Error('线程ID不能为空');
    }

    if (!this.props.sessionId) {
      throw new Error('会话ID不能为空');
    }

    if (!this.props.priority) {
      throw new Error('线程优先级不能为空');
    }

    if (this.props.title && this.props.title.trim().length === 0) {
      throw new Error('线程标题不能为空字符串');
    }

    if (this.props.description && this.props.description.trim().length === 0) {
      throw new Error('线程描述不能为空字符串');
    }
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    this.validateInvariants();
    this.props.priority.validate();
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `thread-definition:${this.props.id.toString()}`;
  }
}