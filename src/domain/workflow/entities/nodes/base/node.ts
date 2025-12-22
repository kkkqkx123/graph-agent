import { Entity } from '../../../../common/base/entity';
import { ID } from '../../../../common/value-objects/id';
import { Timestamp } from '../../../../common/value-objects/timestamp';
import { Version } from '../../../../common/value-objects/version';
import { DomainError } from '../../../../common/errors/domain-error';
import { NodeType } from '../../../value-objects/node-type';

/**
 * 节点位置接口
 */
export interface NodePosition {
  x: number;
  y: number;
}

/**
 * Node实体接口
 */
export interface NodeProps {
  id: ID;
  workflowId: ID;
  type: NodeType;
  name?: string | undefined;
  description?: string | undefined;
  position?: NodePosition | undefined;
  properties: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: Version;
  isDeleted: boolean;
}

/**
 * Node实体
 * 
 * 表示图中的节点
 */
export class Node extends Entity {
  private readonly props: NodeProps;

  /**
   * 构造函数
   * @param props 节点属性
   */
  protected constructor(props: NodeProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新节点
   * @param workflowId 图ID
   * @param type 节点类型
   * @param name 节点名称
   * @param description 节点描述
   * @param position 节点位置
   * @param properties 节点属性
   * @returns 新节点实例
   */
  public static create(
    workflowId: ID,
    type: NodeType,
    name?: string,
    description?: string,
    position?: NodePosition,
    properties?: Record<string, unknown>
  ): Node {
    const now = Timestamp.now();
    const nodeId = ID.generate();

    const props: NodeProps = {
      id: nodeId,
      workflowId,
      type,
      name: name || undefined,
      description: description || undefined,
      position: position || undefined,
      properties: properties || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };

    return new Node(props);
  }

  /**
   * 从已有属性重建节点
   * @param props 节点属性
   * @returns 节点实例
   */
  public static fromProps(props: NodeProps): Node {
    return new Node(props);
  }

  /**
   * 获取节点ID
   * @returns 节点ID
   */
  public get nodeId(): ID {
    return this.props.id;
  }

  /**
   * 获取图ID
   * @returns 图ID
   */
  public get workflowId(): ID {
    return this.props.workflowId;
  }

  /**
   * 获取节点类型
   * @returns 节点类型
   */
  public get type(): NodeType {
    return this.props.type;
  }

  /**
   * 获取节点名称
   * @returns 节点名称
   */
  public get name(): string | undefined {
    return this.props.name;
  }

  /**
   * 获取节点描述
   * @returns 节点描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取节点位置
   * @returns 节点位置
   */
  public get position(): NodePosition | undefined {
    return this.props.position;
  }

  /**
   * 获取节点属性
   * @returns 节点属性
   */
  public get properties(): Record<string, unknown> {
    return { ...this.props.properties };
  }

  /**
   * 更新节点名称
   * @param name 新名称
   */
  public updateName(name: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的节点');
    }

    const newProps = {
      ...this.props,
      name,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    super.update();
  }

  /**
   * 更新节点描述
   * @param description 新描述
   */
  public updateDescription(description: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除的节点');
    }

    const newProps = {
      ...this.props,
      description,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    super.update();
  }

  /**
   * 更新节点位置
   * @param position 新位置
   */
  public updatePosition(position: NodePosition): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除节点的位置');
    }

    const newProps = {
      ...this.props,
      position,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };

    (this as any).props = Object.freeze(newProps);
    super.update();
  }

  /**
   * 更新节点属性
   * @param properties 新属性
   */
  public updateProperties(properties: Record<string, unknown>): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法更新已删除节点的属性');
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
   * 设置节点属性
   * @param key 属性键
   * @param value 属性值
   */
  public setProperty(key: string, value: unknown): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法设置已删除节点的属性');
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
   * 移除节点属性
   * @param key 属性键
   */
  public removeProperty(key: string): void {
    if (this.props.isDeleted) {
      throw new DomainError('无法移除已删除节点的属性');
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
   * 获取节点属性值
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
   * 标记节点为已删除
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
   * 检查节点是否已删除
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
    return `node:${this.props.id.toString()}`;
  }

  /**
   * 验证节点的不变性
   */
  public validateInvariants(): void {
    if (!this.props.id) {
      throw new DomainError('节点ID不能为空');
    }

    if (!this.props.workflowId) {
      throw new DomainError('图ID不能为空');
    }

    if (!this.props.type) {
      throw new DomainError('节点类型不能为空');
    }

    // 验证位置的有效性
    if (this.props.position) {
      if (typeof this.props.position.x !== 'number' || typeof this.props.position.y !== 'number') {
        throw new DomainError('节点位置坐标必须是数字');
      }
    }

    // 验证开始节点的约束
    if (this.props.type.isStart() && this.props.name) {
      // 开始节点通常不需要名称，或者有特定命名规则
    }

    // 验证结束节点的约束
    if (this.props.type.isEnd() && this.props.name) {
      // 结束节点通常不需要名称，或者有特定命名规则
    }
  }

  /**
   * 验证实体的有效性
   */
  public validate(): void {
    this.validateInvariants();
    this.props.type.validate();
  }

  /**
   * 转换为JSON对象
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.props.id.toString(),
      workflowId: this.props.workflowId.toString(),
      type: this.props.type.toString(),
      name: this.props.name,
      description: this.props.description,
      position: this.props.position,
      properties: this.props.properties,
      createdAt: this.props.createdAt.toString(),
      updatedAt: this.props.updatedAt.toString(),
      version: this.props.version.toString(),
      isDeleted: this.props.isDeleted
    };
  }
}