/**
 * ID工具函数
 * 提供ID生成和验证功能
 */

import { z } from 'zod';
import type { ID } from '@modular-agent/types';

/**
 * 生成新ID（使用UUID v4）
 */
export function generateId(): ID {
  return crypto.randomUUID();
}

/**
 * 验证ID是否有效
 */
export function isValidId(id: ID): boolean {
  return typeof id === 'string' && id.length > 0;
}

/**
 * ID格式schemas
 */
const idSchemas = {
  workflow: z.string().regex(/^wflow_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i, 'Invalid workflow ID format'),
  thread: z.string().regex(/^thrd_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i, 'Invalid thread ID format'),
  node: z.string().regex(/^node_[a-z0-9_]+$/, 'Invalid node ID format'),
  edge: z.string().regex(/^edge_[a-z0-9_]+$/, 'Invalid edge ID format'),
  checkpoint: z.string().regex(/^ckpt_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i, 'Invalid checkpoint ID format'),
  toolCall: z.string().regex(/^call_\d+_[a-z0-9]+$/, 'Invalid tool call ID format'),
  event: z.string().regex(/^evt_\d+_[a-z0-9]+$/, 'Invalid event ID format')
} as const;

/**
 * 验证ID格式是否符合规范
 * @param id 要验证的ID
 * @param entityType 实体类型：workflow, thread, node, edge, checkpoint, toolCall, event
 * @returns 是否符合格式规范
 */
export function validateId(id: ID, entityType: string): boolean {
  const schema = idSchemas[entityType as keyof typeof idSchemas];
  if (!schema) {
    return false;
  }
  const result = schema.safeParse(id);
  return result.success;
}

/**
 * 生成带命名空间前缀的节点ID
 * @param prefix 命名空间前缀
 * @param originalId 原始节点ID
 * @returns 带前缀的新节点ID
 */
export function generateNamespacedNodeId(prefix: string, originalId: ID): ID {
  // 移除原始ID的node_前缀（如果有）
  const baseId = originalId.replace(/^node_/, '');
  return `node_${prefix}_${baseId}`;
}

/**
 * 生成带命名空间前缀的边ID
 * @param prefix 命名空间前缀
 * @param originalId 原始边ID
 * @returns 带前缀的新边ID
 */
export function generateNamespacedEdgeId(prefix: string, originalId: ID): ID {
  // 移除原始ID的edge_前缀（如果有）
  const baseId = originalId.replace(/^edge_/, '');
  return `edge_${prefix}_${baseId}`;
}

/**
 * 从命名空间ID中提取原始ID
 * @param namespacedId 带命名空间的ID
 * @returns 原始ID
 */
export function extractOriginalId(namespacedId: ID): ID {
  // 移除命名空间前缀，保留原始ID
  const parts = namespacedId.split('_');
  if (parts.length >= 3) {
    // 格式: node_prefix_originalId 或 edge_prefix_originalId
    return parts.slice(2).join('_');
  }
  return namespacedId;
}

/**
 * 生成子工作流命名空间前缀
 * @param subworkflowId 子工作流ID
 * @param subgraphNodeId SUBGRAPH节点ID
 * @returns 命名空间前缀
 */
export function generateSubgraphNamespace(subworkflowId: ID, subgraphNodeId: ID): string {
  // 使用子工作流ID和SUBGRAPH节点ID的哈希值生成唯一前缀
  const combined = `${subworkflowId}_${subgraphNodeId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return `sg_${Math.abs(hash).toString(16)}`;
}

/**
 * 检查ID是否为命名空间ID
 * @param id 要检查的ID
 * @returns 是否为命名空间ID
 */
export function isNamespacedId(id: ID): boolean {
  return /^node_sg_[a-f0-9]+_/.test(id) || /^edge_sg_[a-f0-9]+_/.test(id);
}