/**
 * Route节点验证函数
 * 提供Route节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';
import type { Result } from '../../../types/result';
import { ok, err } from '../../../utils/result-utils';

/**
 * Route节点配置schema
 */
const routeNodeConfigSchema = z.object({
  routes: z.array(z.object({
    condition: z.string().min(1, 'Route condition is required'),
    targetNodeId: z.string().min(1, 'Target node ID is required'),
    priority: z.number().optional()
  })).min(1, 'Routes array cannot be empty'),
  defaultTargetNodeId: z.string().optional()
});

/**
 * 验证Route节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateRouteNode(node: Node): Result<Node, ValidationError[]> {
  if (node.type !== NodeType.ROUTE) {
    return err([new ValidationError(`Invalid node type for route validator: ${node.type}`, `node.${node.id}`)]);
  }

  const result = routeNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ValidationError('Invalid route node configuration', `node.${node.id}.config`)]);
    }
    return err([new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`)]);
  }
  return ok(node);
}