/**
 * ID工具函数
 * 提供ID生成和验证功能
 */

import type { ID } from '../types/common';

/**
 * ID工具类
 */
export const IDUtils = {
  /**
   * 生成新ID（使用UUID v4）
   */
  generate(): ID {
    return crypto.randomUUID();
  },

  /**
   * 验证ID是否有效
   */
  isValid(id: ID): boolean {
    return typeof id === 'string' && id.length > 0;
  }
};