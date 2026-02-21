/**
 * 边数据结构（EdgeData）
 *
 * 设计说明：
 * - EdgeData 是 Edge 接口的实现类
 * - 提供边的基本数据存储和查询功能
 * - 作为核心实体，放在 core/entities 目录
 *
 * 核心职责：
 * - 存储边的配置和条件
 * - 提供边的查询方法
 * - 作为无状态数据结构，不包含执行逻辑
 *
 * 使用场景：
 * - 工作流定义中的边表示
 * - 图结构中的边数据
 * - 边验证和分析
 *
 * 注意事项：
 * - EdgeData 是无状态的数据结构，构建完成后不应被修改
 * - 边的条件评估由执行引擎负责
 * - 运行时通过 GraphRegistry 管理，确保不可变性
 */

import type {
  Edge,
  EdgeType,
  EdgeCondition,
  EdgeMetadata,
  ID
} from '@modular-agent/types';

/**
 * 边数据结构类
 * 核心职责：存储和管理边的配置和条件
 * 不包含执行逻辑，仅提供基础的边操作
 */
export class EdgeData implements Edge {
  /** 边唯一标识符 */
  public readonly id: ID;
  /** 源节点ID */
  public readonly sourceNodeId: ID;
  /** 目标节点ID */
  public readonly targetNodeId: ID;
  /** 边类型 */
  public readonly type: EdgeType;
  /** 可选的条件表达式（仅 CONDITIONAL 类型需要） */
  public readonly condition?: EdgeCondition;
  /** 可选的边标签 */
  public readonly label?: string;
  /** 可选的边描述 */
  public readonly description?: string;
  /** 边权重，用于多条条件边同时满足时的排序（数值越大优先级越高） */
  public readonly weight?: number;
  /** 可选的元数据 */
  public readonly metadata?: EdgeMetadata;

  constructor(data: Edge) {
    this.id = data.id;
    this.sourceNodeId = data.sourceNodeId;
    this.targetNodeId = data.targetNodeId;
    this.type = data.type;
    this.condition = data.condition;
    this.label = data.label;
    this.description = data.description;
    this.weight = data.weight;
    this.metadata = data.metadata;
  }

  /**
   * 检查是否为条件边
   */
  isConditional(): boolean {
    return this.type === 'CONDITIONAL';
  }

  /**
   * 检查是否为默认边
   */
  isDefault(): boolean {
    return this.type === 'DEFAULT';
  }

  /**
   * 检查是否有条件
   */
  hasCondition(): boolean {
    return this.condition !== undefined && this.condition !== null;
  }

  /**
   * 检查是否有权重
   */
  hasWeight(): boolean {
    return this.weight !== undefined && this.weight !== null;
  }

  /**
   * 获取权重（默认为0）
   */
  getWeight(): number {
    return this.weight ?? 0;
  }

  /**
   * 检查是否连接两个指定节点
   */
  connects(sourceNodeId: ID, targetNodeId: ID): boolean {
    return this.sourceNodeId === sourceNodeId && this.targetNodeId === targetNodeId;
  }

  /**
   * 检查是否从指定节点出发
   */
  startsFrom(nodeId: ID): boolean {
    return this.sourceNodeId === nodeId;
  }

  /**
   * 检查是否到达指定节点
   */
  endsAt(nodeId: ID): boolean {
    return this.targetNodeId === nodeId;
  }

  /**
   * 获取边的标签（如果没有标签则返回空字符串）
   */
  getLabel(): string {
    return this.label ?? '';
  }

  /**
   * 检查是否有标签
   */
  hasLabel(): boolean {
    return this.label !== undefined && this.label !== null && this.label.length > 0;
  }

  /**
   * 检查是否有描述
   */
  hasDescription(): boolean {
    return this.description !== undefined && this.description !== null && this.description.length > 0;
  }

  /**
   * 获取元数据中的标签
   * @returns 标签数组
   */
  getTags(): string[] {
    return this.metadata?.tags ?? [];
  }

  /**
   * 检查是否有指定标签
   * @param tag 标签名称
   * @returns 是否存在该标签
   */
  hasTag(tag: string): boolean {
    return this.getTags().includes(tag);
  }

  /**
   * 获取元数据中的自定义字段
   * @param key 字段键
   * @returns 字段值或undefined
   */
  getCustomField(key: string): unknown {
    return this.metadata?.customFields?.[key];
  }

  /**
   * 检查是否有自定义字段
   * @param key 字段键
   * @returns 是否存在该字段
   */
  hasCustomField(key: string): boolean {
    return this.metadata?.customFields !== undefined && Object.prototype.hasOwnProperty.call(this.metadata.customFields, key);
  }

  /**
   * 转换为纯对象
   */
  toJSON(): Edge {
    return {
      id: this.id,
      sourceNodeId: this.sourceNodeId,
      targetNodeId: this.targetNodeId,
      type: this.type,
      condition: this.condition,
      label: this.label,
      description: this.description,
      weight: this.weight,
      metadata: this.metadata
    };
  }
}