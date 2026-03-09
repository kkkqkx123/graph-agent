/**
 * Route节点验证函数
 * 提供Route节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok } from '@modular-agent/common-utils';
import { validateNodeType, validateNodeConfig } from '../../../core/validation/utils.js';

/**
 * Route节点配置schema
 */
const routeNodeConfigSchema = z.object({
  routes: z.array(z.object({
    condition: z.object({
      expression: z.string().min(1, 'Route condition expression is required'),
      metadata: z.any().optional()
    }),
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
export function validateRouteNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  const typeResult = validateNodeType(node, 'ROUTE');
  if (typeResult.isErr()) {
    return typeResult;
  }

  const configResult = validateNodeConfig(
    node.config,
    routeNodeConfigSchema,
    node.id,
    'ROUTE'
  );
  if (configResult.isErr()) {
    return configResult;
  }

  return ok(node);
}
