/**
 * Variable节点验证函数
 * 提供Variable节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok } from '@modular-agent/common-utils';
import { validateNodeType, validateNodeConfig } from '../../../core/validation/utils.js';

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
  const typeResult = validateNodeType(node, 'VARIABLE');
  if (typeResult.isErr()) {
    return typeResult;
  }

  const configResult = validateNodeConfig(
    node.config,
    variableNodeConfigSchema,
    node.id,
    'VARIABLE'
  );
  if (configResult.isErr()) {
    return configResult;
  }

  return ok(node);
}
