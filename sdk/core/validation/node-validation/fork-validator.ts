/**
 * Fork节点验证函数
 * 提供Fork节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

/**
 * Fork节点配置schema
 */
const forkNodeConfigSchema = z.object({
  forkId: z.string().min(1, 'Fork ID is required'),
  forkStrategy: z.enum(['SERIAL', 'PARALLEL']),
  childNodeIds: z.array(z.string()).optional()
});

/**
 * 验证Fork节点配置
 * @param node 节点定义
 * @throws ValidationError 当配置无效时抛出
 */
export function validateForkNode(node: Node): void {
  if (node.type !== NodeType.FORK) {
    throw new ValidationError(`Invalid node type for fork validator: ${node.type}`, `node.${node.id}`);
  }

  const result = forkNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      throw new ValidationError('Invalid fork node configuration', `node.${node.id}.config`);
    }
    throw new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`);
  }
}