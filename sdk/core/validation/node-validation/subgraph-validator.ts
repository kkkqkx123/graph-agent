/**
 * 子图节点验证函数
 * 提供子图节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import { ValidationError } from '@modular-agent/types/errors';
import type { Result } from '@modular-agent/types/result';
import { ok, err } from '@modular-agent/common-utils';

/**
 * 子图节点配置schema
 */
const subgraphNodeConfigSchema = z.object({
  subgraphId: z.string().min(1, 'Subgraph ID is required'),
  async: z.boolean().optional().default(false)
});

/**
 * 验证子图节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateSubgraphNode(node: Node): Result<Node, ValidationError[]> {
  if (node.type !== NodeType.SUBGRAPH) {
    return err([new ValidationError(`Invalid node type for subgraph validator: ${node.type}`, `node.${node.id}`)]);
  }

  const result = subgraphNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ValidationError('Invalid subgraph node configuration', `node.${node.id}.config`)]);
    }
    return err([new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`)]);
  }
  return ok(node);
}