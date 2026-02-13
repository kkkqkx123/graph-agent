/**
 * Variable节点验证函数
 * 提供Variable节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import { ConfigurationValidationError } from '@modular-agent/types/errors';
import type { Result } from '@modular-agent/types/result';
import { ok, err } from '@modular-agent/common-utils';

/**
 * Variable节点配置schema
 */
const variableNodeConfigSchema = z.object({
  variableName: z.string().min(1, 'Variable name is required'),
  variableType: z.enum(['number', 'string', 'boolean', 'array', 'object']),
  expression: z.string().min(1, 'Expression is required'),
  scope: z.enum(['global', 'thread', 'subgraph', 'loop']).optional(),
  readonly: z.boolean().optional()
});

/**
 * 验证Variable节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateVariableNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  if (node.type !== NodeType.VARIABLE) {
    return err([new ConfigurationValidationError(`Invalid node type for variable validator: ${node.type}`, {
      configType: 'node',
      configPath: `node.${node.id}`
    })]);
  }

  const result = variableNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ConfigurationValidationError('Invalid variable node configuration', {
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