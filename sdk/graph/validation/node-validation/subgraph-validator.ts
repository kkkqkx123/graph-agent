/**
 * 子图节点验证函数
 * 提供子图节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok } from '@modular-agent/common-utils';
import { validateNodeType, validateNodeConfig } from '../../../core/validation/utils.js';

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
export function validateSubgraphNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  const typeResult = validateNodeType(node, 'SUBGRAPH');
  if (typeResult.isErr()) {
    return typeResult;
  }

  const configResult = validateNodeConfig(
    node.config,
    subgraphNodeConfigSchema,
    node.id,
    'SUBGRAPH'
  );
  if (configResult.isErr()) {
    return configResult;
  }

  return ok(node);
}
