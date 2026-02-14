/**
 * 子图节点验证函数
 * 提供子图节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
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
export function validateSubgraphNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  if (node.type !== NodeType.SUBGRAPH) {
    return err([new ConfigurationValidationError(`Invalid node type for subgraph validator: ${node.type}`, {
      configType: 'node',
      configPath: `node.${node.id}`
    })]);
  }

  const result = subgraphNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ConfigurationValidationError('Invalid subgraph node configuration', {
        configType: 'node',
        configPath: `node.${node.id}.config`
      })]);
    }
    return err([new ConfigurationValidationError(error.message, {
      configType: 'node',
      configPath: `node.${node.id}.config.${error.path.join('.')}`
    })]);
  }
  return ok(node);
}