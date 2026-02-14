/**
 * ID映射相关类型定义
 * 用于预处理阶段的ID映射和配置更新
 */

import type { ID } from '../common';
import type { Node } from '../node';
import type { NodeType } from '../node/base';

/**
 * ID映射表
 * 记录原始ID到索引ID的映射关系
 */
export interface IdMapping {
  /** 节点ID映射：原始ID -> 索引ID */
  nodeIds: Map<ID, number>;
  
  /** 边ID映射：原始ID -> 索引ID */
  edgeIds: Map<ID, number>;
  
  /** 反向映射：索引ID -> 原始ID */
  reverseNodeIds: Map<number, ID>;
  reverseEdgeIds: Map<number, ID>;
  
  /** 子图命名空间映射 */
  subgraphNamespaces: Map<ID, string>;
}

/**
 * 节点配置更新器接口
 * 定义如何更新节点配置中的ID引用
 */
export interface NodeConfigUpdater {
  /** 节点类型 */
  nodeType: NodeType;
  
  /**
   * 检查配置是否包含ID引用
   * @param config 节点配置
   * @returns 是否包含ID引用
   */
  containsIdReferences(config: any): boolean;
  
  /**
   * 更新配置中的ID引用
   * @param config 节点配置
   * @param idMapping ID映射表
   * @returns 更新后的配置
   */
  updateIdReferences(config: any, idMapping: IdMapping): any;
}

/**
 * 子图关系类型
 */
export interface SubgraphRelationship {
  /** 父工作流ID */
  parentWorkflowId: ID;
  /** SUBGRAPH节点ID */
  subgraphNodeId: ID;
  /** 子工作流ID */
  childWorkflowId: ID;
  /** 子图命名空间 */
  namespace: string;
}