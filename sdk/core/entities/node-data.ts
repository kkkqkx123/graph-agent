/**
 * 节点数据结构（NodeData）
 *
 * 设计说明：
 * - NodeData 是 Node 接口的实现类
 * - 提供节点的基本数据存储和查询功能
 * - 作为核心实体，放在 core/entities 目录
 *
 * 核心职责：
 * - 存储节点的配置和属性
 * - 提供节点的查询方法
 * - 作为无状态数据结构，不包含执行逻辑
 *
 * 使用场景：
 * - 工作流定义中的节点表示
 * - 图结构中的节点数据
 * - 节点验证和分析
 *
 * 注意事项：
 * - NodeData 是无状态的数据结构，构建完成后不应被修改
 * - 节点的执行逻辑由 NodeHandler 负责
 * - 运行时通过 GraphRegistry 管理，确保不可变性
 */

import type {
  Node,
  NodeType,
  Metadata,
  ID,
  NodeProperty,
  NodeHook,
  NodeConfig
} from '@modular-agent/types';

/**
 * 节点数据结构类
 * 核心职责：存储和管理节点的配置和属性
 * 不包含执行逻辑，仅提供基础的节点操作
 */
export class NodeData implements Node {
  /** 节点唯一标识符 */
  public readonly id: ID;
  /** 节点类型 */
  public readonly type: NodeType;
  /** 节点名称 */
  public readonly name: string;
  /** 可选的节点描述 */
  public readonly description?: string;
  /** 节点配置，根据节点类型不同而不同 */
  public readonly config: NodeConfig;
  /** 可选的元数据 */
  public readonly metadata?: Metadata;
  /** 出边ID数组，用于路由决策 */
  public outgoingEdgeIds: ID[];
  /** 入边ID数组，用于反向追踪 */
  public incomingEdgeIds: ID[];
  /** 可选的动态属性对象 */
  public readonly properties?: NodeProperty[];
  /** 可选的Hook配置数组 */
  public readonly hooks?: NodeHook[];
  /** 节点执行前是否创建检查点 */
  public readonly checkpointBeforeExecute?: boolean;
  /** 节点执行后是否创建检查点 */
  public readonly checkpointAfterExecute?: boolean;

  constructor(data: Node) {
    this.id = data.id;
    this.type = data.type;
    this.name = data.name;
    this.description = data.description;
    this.config = data.config;
    this.metadata = data.metadata;
    this.outgoingEdgeIds = [...(data.outgoingEdgeIds || [])];
    this.incomingEdgeIds = [...(data.incomingEdgeIds || [])];
    this.properties = data.properties;
    this.hooks = data.hooks;
    this.checkpointBeforeExecute = data.checkpointBeforeExecute;
    this.checkpointAfterExecute = data.checkpointAfterExecute;
  }

  /**
   * 添加出边ID
   * 注意：此方法仅用于构建阶段，运行时不应调用
   */
  addOutgoingEdge(edgeId: ID): void {
    if (!this.outgoingEdgeIds.includes(edgeId)) {
      this.outgoingEdgeIds.push(edgeId);
    }
  }

  /**
   * 添加入边ID
   * 注意：此方法仅用于构建阶段，运行时不应调用
   */
  addIncomingEdge(edgeId: ID): void {
    if (!this.incomingEdgeIds.includes(edgeId)) {
      this.incomingEdgeIds.push(edgeId);
    }
  }

  /**
   * 移除出边ID
   * 注意：此方法仅用于构建阶段，运行时不应调用
   */
  removeOutgoingEdge(edgeId: ID): void {
    const index = this.outgoingEdgeIds.indexOf(edgeId);
    if (index > -1) {
      this.outgoingEdgeIds.splice(index, 1);
    }
  }

  /**
   * 移除入边ID
   * 注意：此方法仅用于构建阶段，运行时不应调用
   */
  removeIncomingEdge(edgeId: ID): void {
    const index = this.incomingEdgeIds.indexOf(edgeId);
    if (index > -1) {
      this.incomingEdgeIds.splice(index, 1);
    }
  }

  /**
   * 获取出边数量
   */
  getOutgoingEdgeCount(): number {
    return this.outgoingEdgeIds.length;
  }

  /**
   * 获取入边数量
   */
  getIncomingEdgeCount(): number {
    return this.incomingEdgeIds.length;
  }

  /**
   * 检查是否有出边
   */
  hasOutgoingEdges(): boolean {
    return this.outgoingEdgeIds.length > 0;
  }

  /**
   * 检查是否有入边
   */
  hasIncomingEdges(): boolean {
    return this.incomingEdgeIds.length > 0;
  }

  /**
   * 转换为纯对象
   */
  toJSON(): Node {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      description: this.description,
      config: this.config,
      metadata: this.metadata,
      outgoingEdgeIds: [...this.outgoingEdgeIds],
      incomingEdgeIds: [...this.incomingEdgeIds],
      properties: this.properties,
      hooks: this.hooks,
      checkpointBeforeExecute: this.checkpointBeforeExecute,
      checkpointAfterExecute: this.checkpointAfterExecute
    };
  }

  /**
   * 获取属性值
   * @param key 属性键
   * @returns 属性值或undefined
   */
  getPropertyValue(key: string): unknown {
    return this.properties?.find(prop => prop.key === key)?.value;
  }

  /**
   * 检查是否有指定属性
   * @param key 属性键
   * @returns 是否存在该属性
   */
  hasProperty(key: string): boolean {
    return this.properties?.some(prop => prop.key === key) ?? false;
  }

  /**
   * 获取指定类型的Hook
   * @param hookType Hook类型
   * @returns Hook数组
   */
  getHooksByType(hookType: string): NodeHook[] {
    return this.hooks?.filter(hook => hook.hookType === hookType) ?? [];
  }

  /**
   * 检查是否有Hook
   * @returns 是否有Hook配置
   */
  hasHooks(): boolean {
    return this.hooks !== undefined && this.hooks.length > 0;
  }
}