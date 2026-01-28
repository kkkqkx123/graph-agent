/**
 * ID工具函数
 * 提供ID生成和验证功能
 */

import type { ID } from '../types/common';

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
 * 验证ID格式是否符合规范
 * @param id 要验证的ID
 * @param entityType 实体类型：workflow, thread, node, edge, checkpoint, toolCall, event
 * @returns 是否符合格式规范
 */
export function validateId(id: ID, entityType: string): boolean {
  const patterns: Record<string, RegExp> = {
    workflow: /^wflow_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,
    thread: /^thrd_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,
    node: /^node_[a-z0-9_]+$/,
    edge: /^edge_[a-z0-9_]+$/,
    checkpoint: /^ckpt_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,
    toolCall: /^call_\d+_[a-z0-9]+$/,
    event: /^evt_\d+_[a-z0-9]+$/
  };
  
  return patterns[entityType]?.test(id) || false;
}