/**
 * Edge类型定义
 * 定义工作流中节点之间的连接关系
 */

import type { ID, Metadata } from './common';

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
 * 条件类型枚举，提供常见条件模式
 */
export enum ConditionType {
  /** 等于 */
  EQUALS = 'equals',
  /** 不等于 */
  NOT_EQUALS = 'not_equals',
  /** 大于 */
  GREATER_THAN = 'greater_than',
  /** 小于 */
  LESS_THAN = 'less_than',
  /** 大于等于 */
  GREATER_EQUAL = 'greater_equal',
  /** 小于等于 */
  LESS_EQUAL = 'less_equal',
  /** 包含（字符串） */
  CONTAINS = 'contains',
  /** 不包含（字符串） */
  NOT_CONTAINS = 'not_contains',
  /** 在列表中 */
  IN = 'in',
  /** 不在列表中 */
  NOT_IN = 'not_in',
  /** 为空 */
  IS_NULL = 'is_null',
  /** 不为空 */
  IS_NOT_NULL = 'is_not_null',
  /** 为真 */
  IS_TRUE = 'is_true',
  /** 为假 */
  IS_FALSE = 'is_false',
  /** 自定义表达式 */
  CUSTOM = 'custom',
}

/**
 * 边条件类型
 */
export interface EdgeCondition {
  /** 条件类型 */
  type: ConditionType;
  /** 变量路径，支持嵌套访问，如 "user.age" 或 "output.status" */
  variablePath: string;
  /** 比较值（某些条件类型不需要，如 IS_NULL） */
  value?: any;
  /** 自定义表达式（仅 CUSTOM 类型使用） */
  customExpression?: string;
}

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