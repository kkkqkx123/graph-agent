/**
 * Edge类型定义
 * 定义工作流中节点之间的连接关系
 */

import type { ID, Metadata } from './common';
import type { Condition } from './condition';

/**
 * 边类型枚举
 */
export enum EdgeType {
  /** 默认边，无条件连接，总是可以通过 */
  DEFAULT = 'DEFAULT',
  /** 条件边，需要条件评估，满足条件才能通过 */
  CONDITIONAL = 'CONDITIONAL',
}

/**
 * 边条件类型（使用统一的 Condition 类型）
 */
export type EdgeCondition = Condition;

/**
 * 边元数据类型
 */
export interface EdgeMetadata {
  /** 标签数组 */
  tags?: string[];
  /** 自定义字段对象 */
  customFields?: Metadata;
}

/**
 * 边定义类型
 */
export interface Edge {
  /** 边唯一标识符 */
  id: ID;
  /** 源节点ID */
  sourceNodeId: ID;
  /** 目标节点ID */
  targetNodeId: ID;
  /** 边类型 */
  type: EdgeType;
  /** 可选的条件表达式（仅 CONDITIONAL 类型需要） */
  condition?: EdgeCondition;
  /** 可选的边标签 */
  label?: string;
  /** 可选的边描述 */
  description?: string;
  /** 边权重，用于多条条件边同时满足时的排序（数值越大优先级越高） */
  weight?: number;
  /** 可选的元数据 */
  metadata?: EdgeMetadata;
}