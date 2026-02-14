/**
 * 工作流关系类型定义
 */

import type { ID } from '../common';

/**
 * 工作流关系信息
 * 用于维护工作流间的父子关系链
 */
export interface WorkflowRelationship {
  /** 工作流ID */
  workflowId: ID;
  /** 父工作流ID（如果有） */
  parentWorkflowId?: ID;
  /** 子工作流ID列表 */
  childWorkflowIds: Set<ID>;
  /** 引用此工作流的SUBGRAPH节点ID映射 */
  referencedBy: Map<ID, ID>; // key: SUBGRAPH节点ID, value: 父工作流ID
  /** 关系深度 */
  depth: number;
}

/**
 * 工作流层次结构信息
 */
export interface WorkflowHierarchy {
  /** 祖先链（从根到父） */
  ancestors: ID[];
  /** 后代链（从子到孙） */
  descendants: ID[];
  /** 在层次结构中的深度 */
  depth: number;
  /** 根工作流ID */
  rootWorkflowId: ID;
}