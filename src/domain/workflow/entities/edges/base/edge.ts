import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';
import { EdgeType } from '../../value-objects/edge-type';

/**
 * Edge实体接口
 */
export interface EdgeProps {
  id: ID;
  graphId: ID;
  type: EdgeType;
  fromNodeId: ID;
  toNodeId: ID;
  condition?: string | undefined;
  weight?: number | undefined;
  properties: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  isDeleted: boolean;
}

/**
 * Edge实体
 * 
 * 表示图中的边
 */
export class Edge extends Entity {
  private readonly props: EdgeProps;

  /**
   * 构造函数
   * @param props 边属性
   */
  protected constructor(props: EdgeProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新边
   * @param graphId 图ID
   * @param type 边类型
   * @param fromNodeId 源节点ID
   * @param toNodeId 目标节点ID
   * @param condition 条件表达式
   * @param weight 权重
   * @param properties 边属性
   * @returns 新边实例
   */
  public static create(
    graphId: ID,
    type: EdgeType,
    fromNodeId: ID,
    toNodeId: ID,
    condition?: string,
    weight?: number,
    properties?: Record<string, unknown>
  ): Edge {
    const now = Timestamp.now();
    const edgeId = ID.generate();

    const props: EdgeProps = {
      id: edgeId,
      graphId,
      type,
      fromNodeId,
      toNodeId,
      condition: condition || undefined,
      weight: weight || undefined,
      properties: properties || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };

    return new Edge(props);
  }

  /**
   * 从已有属性重建边
   * @param props 边属性
   * @returns 边实例
   */
  public static fromProps(props: EdgeProps): Edge {
    return new Edge(props);
  }

  /**
   * 获取边ID
   * @returns 边ID
   */
  public get edgeId(): ID {
    return this.props.id;
  }

  /**
   * 获取图ID
   * @returns 图ID
   */
  public get graphId(): ID {
    return this.props.graphId;
  }

  /**
   * 获取边类型
   * @returns 边类型
   */
  public get type(): EdgeType {
    return this.props.type;
  }

  /**
   * 获取源节点ID
   * @returns 源节点ID
   */
  public get fromNodeId(): ID {
    return this.props.fromNodeId;
  }

  /**
   * 获取目标节点ID
   * @returns 目标节点ID
   */
  public get toNodeId(): ID {
    return this.props.toNodeId;
  }

  /**
   * 获取条件表达式
   * @returns 条件表达式
   */
  public get condition(): string | undefined {
    return this.props.condition;
  }

  /**
   * 获取权重
   * @returns 权重
   */
  public get weight(): number | undefined {
    return this.props.weight;
  }

  /**
   * 获取边属性
   * @returns 边属性
   */
  public get properties(): Record<string, unknown> {
    return { ...this.props.properties };
  }

  /**
   * 更新边类型
   * @param type 新类型
   */
  public updateType(type: EdgeType): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的边');
    }

    const newProps = {
      ...this.props,
      type,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    super.update();
  }

  /**
   * 更新条件表达式
   * @param condition 新条件表达式
   */
  public updateCondition(condition: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除边的条件');
    }

    const newProps = {
      ...this.props,
      condition,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    super.update();
  }

  /**
   * 更新权重
   * @param weight 新权重
   */
  public updateWeight(weight: number): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除边的权重');
    }

    const newProps = {
      ...this.props,
      weight,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    super.update();
  }

  /**
   * 更新边属性
   * @param properties 新属性
   */
  public updateProperties(properties: Record<string, unknown>): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除边的属性');
    }

    const newProps = {
      ...this.props,
      properties: { ...properties },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    super.update();
  }

  /**
   * 设置边属性
   * @param key 属性键
   * @param value 属性值
   */
  public setProperty(key: string, value: unknown): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法设置已删除边的属性');
    }

    const newProperties = { ...this.props.properties };
    newProperties[key] = value;

    const newProps = {
      ...this.props,
      properties: newProperties,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    super.update();
  }

  /**
   * 移除边属性
   * @param key 属性键
   */
  public removeProperty(key: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法移除已删除边的属性');
    }

    const newProperties = { ...this.props.properties };
    delete newProperties[key];

    const newProps = {
      ...this.props,
      properties: newProperties,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    super.update();
  }

  /**
   * 获取边属性值
   * @param key 属性键
   * @returns 属性值
   */
  public getProperty(key: string): unknown {
    return this.props.properties[key];
  }

  /**
   * 检查是否有指定属性
   * @param key 属性键
   * @returns 是否有属性
   */
  public hasProperty(key: string): boolean {
    return key in this.props.properties;
  }

  /**
   * 检查是否为自环边
   * @returns 是否为自环边
   */
  public isSelfLoop(): boolean {
    return this.props.fromNodeId.equals(this.props.toNodeId);
  }

  /**
   * 检查是否连接指定节点
   * @param nodeId 节点ID
   * @returns 是否连接指定节点
   */
  public connectsTo(nodeId: ID): boolean {
    return this.props.fromNodeId.equals(nodeId) || this.props.toNodeId.equals(nodeId);
  }

  /**
   * 检查是否从指定节点出发
   * @param nodeId 节点ID
   * @returns 是否从指定节点出发
   */
  public isFrom(nodeId: ID): boolean {
    return this.props.fromNodeId.equals(nodeId);
  }

  /**
   * 检查是否到达指定节点
   * @param nodeId 节点ID
   * @returns 是否到达指定节点
   */
  public isTo(nodeId: ID): boolean {
    return this.props.toNodeId.equals(nodeId);
  }

  /**
   * 获取反向边
   * @returns 反向边实例（不保存到数据库）
   */
  public getReverse(): Edge {
    return Edge.create(
      this.props.graphId,
      this.props.type,
      this.props.toNodeId,
      this.props.fromNodeId,
      this.props.condition,
      this.props.weight,
      this.props.properties
    );
  }

  /**
   * 标记边为已删除
   */
  public markAsDeleted(): void {
    if (this.props.isDeleted) {
      return;
    }

    const newProps = {
      ...this.props,
      isDeleted: true,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    super.update();
  }

  /**
   * 检查边是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.props.isDeleted;
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `edge:${this.props.id.toString()}`;
  }

  /**
   * 验证边的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new DomainError('边ID不能为空');
    }

    if (!this.props.graphId) {
      throw new DomainError('图ID不能为空');
    }

    if (!this.props.type) {
      throw new DomainError('边类型不能为空');
    }

    if (!this.props.fromNodeId) {
      throw new DomainError('源节点ID不能为空');
    }

    if (!this.props.toNodeId) {
      throw new DomainError('目标节点ID不能为空');
    }

    if (this.props.weight !== undefined && this.props.weight < 0) {
      throw new DomainError('权重不能为负数');
    }

    // 验证条件边的约束
    if (this.props.type.isConditional() && !this.props.condition) {
      throw new DomainError('条件边必须有条件表达式');
    }

    // 验证默认边的约束
    if (this.props.type.isDefault() && this.props.condition) {
      throw new DomainError('默认边不应该有条件表达式');
    }
  }

  /**
   * 验证实体的有效性
   */
  public validate(): void {
    this.validateInvariants();
    this.props.type.validate();
  }
}