/**
 * 子图边界标记常量
 * 定义metadata中使用的key，避免命名冲突
 */

import type { ID } from './common';

/**
 * 子图边界标记metadata键名常量
 */
export const SUBGRAPH_METADATA_KEYS = {
  /** 边界类型：'entry' | 'exit' | 'internal' */
  BOUNDARY_TYPE: 'subgraphBoundaryType',
  /** 对应的原始SUBGRAPH节点ID */
  ORIGINAL_NODE_ID: 'originalSubgraphNodeId',
  /** 子图命名空间 */
  NAMESPACE: 'subgraphNamespace',
  /** 子图深度 */
  DEPTH: 'subgraphDepth'
} as const;

/**
 * 子图边界类型
 */
export type SubgraphBoundaryType = 'entry' | 'exit' | 'internal';

/**
 * 子图边界元数据接口
 */
export interface SubgraphBoundaryMetadata {
  /** 边界类型 */
  boundaryType: SubgraphBoundaryType;
  /** 对应的原始SUBGRAPH节点ID */
  originalSubgraphNodeId: ID;
  /** 子图命名空间 */
  namespace: string;
  /** 子图深度 */
  depth: number;
}