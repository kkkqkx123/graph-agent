/**
 * Edge类型定义
 * 定义工作流中节点之间的连接关系
 */

/**
 * 边类型枚举
 */
export enum EdgeType {
  /** 默认边 */
  DEFAULT = 'DEFAULT',
  /** 条件边 */
  CONDITIONAL = 'CONDITIONAL',
  /** 并行边 */
  PARALLEL = 'PARALLEL',
  /** 合并边 */
  MERGE = 'MERGE',
  /** 循环边 */
  LOOP = 'LOOP',
  /** 错误处理边 */
  ERROR = 'ERROR'
}

/**
 * 边条件类型
 */
export interface EdgeCondition {
  /** 条件表达式 */
  expression: string;
  /** 条件操作符 */
  operator?: string;
  /** 比较值 */
  value?: any;
  /** 逻辑操作符（AND/OR） */
  logicalOperator?: 'AND' | 'OR';
}

/**
 * 边元数据类型
 */
export interface EdgeMetadata {
  /** 标签数组 */
  tags?: string[];
  /** 自定义字段对象 */
  customFields?: Record<string, any>;
}

/**
 * 边定义类型
 */
export interface Edge {
  /** 边唯一标识符 */
  id: string;
  /** 源节点ID */
  sourceNodeId: string;
  /** 目标节点ID */
  targetNodeId: string;
  /** 边类型 */
  type: EdgeType;
  /** 可选的条件表达式 */
  condition?: EdgeCondition;
  /** 可选的边标签 */
  label?: string;
  /** 可选的边描述 */
  description?: string;
  /** 边权重，用于路由决策和排序 */
  weight?: number;
  /** 边优先级，用于路由决策和排序 */
  priority?: number;
  /** 可选的元数据 */
  metadata?: EdgeMetadata;
}