import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { SessionConfig } from '../value-objects/session-config';

/**
 * SessionDefinition实体属性接口
 */
export interface SessionDefinitionProps {
  readonly id: ID;
  readonly userId?: ID;
  readonly title?: string;
  readonly config: SessionConfig;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly createdBy?: ID;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

/**
 * SessionDefinition实体
 * 
 * 职责：会话的基本定义和配置管理
 * 专注于：
 * - 会话的基本属性定义
 * - 配置管理
 * - 元数据管理
 */
export class SessionDefinition extends Entity {
  private readonly props: SessionDefinitionProps;

  /**
   * 构造函数
   * @param props 会话定义属性
   */
  private constructor(props: SessionDefinitionProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新会话定义
   * @param userId 用户ID
   * @param title 会话标题
   * @param config 会话配置
   * @param metadata 元数据
   * @param createdBy 创建者ID
   * @returns 新会话定义实例
   */
  public static create(
    userId?: ID,
    title?: string,
    config?: SessionConfig,
    metadata?: Record<string, unknown>,
    createdBy?: ID
  ): SessionDefinition {
    const now = Timestamp.now();
    const sessionId = ID.generate();
    const sessionConfig = config || SessionConfig.default();

    const props: SessionDefinitionProps = {
      id: sessionId,
      userId,
      title,
      config: sessionConfig,
      metadata: metadata || {},
      createdAt: now,
      createdBy,
      updatedAt: now,
      version: Version.initial()
    };

    return new SessionDefinition(props);
  }

  /**
   * 从已有属性重建会话定义
   * @param props 会话定义属性
   * @returns 会话定义实例
   */
  public static fromProps(props: SessionDefinitionProps): SessionDefinition {
    return new SessionDefinition(props);
  }

  /**
   * 获取会话ID
   * @returns 会话ID
   */
  public get sessionId(): ID {
    return this.props.id;
  }

  /**
   * 获取用户ID
   * @returns 用户ID
   */
  public get userId(): ID | undefined {
    return this.props.userId;
  }

  /**
   * 获取会话标题
   * @returns 会话标题
   */
  public get title(): string | undefined {
    return this.props.title;
  }

  /**
   * 获取会话配置
   * @returns 会话配置
   */
  public get config(): SessionConfig {
    return this.props.config;
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
   * 更新会话标题
   * @param title 新标题
   */
  public updateTitle(title: string): void {
    const newProps: SessionDefinitionProps = {
      ...this.props,
      title,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新会话配置
   * @param newConfig 新配置
   */
  public updateConfig(newConfig: SessionConfig): void {
    const newProps: SessionDefinitionProps = {
      ...this.props,
      config: newConfig,
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
    const newProps: SessionDefinitionProps = {
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
      throw new Error('会话ID不能为空');
    }

    if (!this.props.config) {
      throw new Error('会话配置不能为空');
    }

    if (this.props.title && this.props.title.trim().length === 0) {
      throw new Error('会话标题不能为空字符串');
    }
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    this.validateInvariants();
    this.props.config.validate();
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `session-definition:${this.props.id.toString()}`;
  }
}