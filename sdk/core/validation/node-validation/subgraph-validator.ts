/**
 * 子图节点验证函数
 * 提供子图节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

/**
 * 子图节点配置schema
 */
const subgraphNodeConfigSchema = z.object({
  subgraphId: z.string().min(1, 'Subgraph ID is required'),
  inputMapping: z.record(
    z.string().min(1, 'Input mapping key cannot be empty'),
    z.string().min(1, 'Input mapping value cannot be empty')
  ).optional().default({}),
  outputMapping: z.record(
    z.string().min(1, 'Output mapping key cannot be empty'),
    z.string().min(1, 'Output mapping value cannot be empty')
  ).optional().default({}),
  async: z.boolean()
});

/**
 * 验证子图节点配置
 * @param node 节点定义
 * @throws ValidationError 当配置无效时抛出
 */
export function validateSubgraphNode(node: Node): void {
  if (node.type !== NodeType.SUBGRAPH) {
    throw new ValidationError(`Invalid node type for subgraph validator: ${node.type}`, `node.${node.id}`);
  }

  const result = subgraphNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      throw new ValidationError('Invalid subgraph node configuration', `node.${node.id}.config`);
    }
    throw new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`);
  }
}