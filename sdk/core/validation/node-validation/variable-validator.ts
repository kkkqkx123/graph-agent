/**
 * Variable节点验证函数
 * 提供Variable节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

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
 * @throws ValidationError 当配置无效时抛出
 */
export function validateVariableNode(node: Node): void {
  if (node.type !== NodeType.VARIABLE) {
    throw new ValidationError(`Invalid node type for variable validator: ${node.type}`, `node.${node.id}`);
  }

  const result = variableNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      throw new ValidationError('Invalid variable node configuration', `node.${node.id}.config`);
    }
    throw new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`);
  }
}