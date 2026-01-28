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