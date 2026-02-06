/**
 * Join节点验证函数
 * 提供Join节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

/**
 * Join节点配置schema
 * 
 * 说明：
 * - childThreadIds不在schema中定义，因为子线程ID是运行时动态值，
 *   在FORK节点执行时存储到执行上下文中，JOIN节点执行时从执行上下文读取。
 * - timeout 允许为 0（无超时）或正数。当为 0 时表示始终等待，不设置超时。
 */
const joinNodeConfigSchema = z.object({
  joinId: z.string().min(1, 'Join ID is required'),
  joinStrategy: z.enum(['ALL_COMPLETED', 'ANY_COMPLETED', 'ALL_FAILED', 'ANY_FAILED', 'SUCCESS_COUNT_THRESHOLD']),
  threshold: z.number().positive('Threshold must be positive').optional(),
  timeout: z.number().nonnegative('Timeout must be non-negative').optional()
}).refine(
  (data) => {
    if (data.joinStrategy === 'SUCCESS_COUNT_THRESHOLD' && data.threshold === undefined) {
      return false;
    }
    return true;
  },
  { message: 'Join node must have a valid threshold when using SUCCESS_COUNT_THRESHOLD strategy', path: ['threshold'] }
);

/**
 * 验证Join节点配置
 * @param node 节点定义
 * @throws ValidationError 当配置无效时抛出
 */
export function validateJoinNode(node: Node): void {
  if (node.type !== NodeType.JOIN) {
    throw new ValidationError(`Invalid node type for join validator: ${node.type}`, `node.${node.id}`);
  }

  const result = joinNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      throw new ValidationError('Invalid join node configuration', `node.${node.id}.config`);
    }
    throw new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`);
  }
}