/**
 * LoopEnd节点验证函数
 * 提供LoopEnd节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok } from '@modular-agent/common-utils';
import { validateNodeType, validateNodeConfig } from '../../../core/validation/utils.js';

/**
 * LoopEnd节点配置schema
 */
const loopEndNodeConfigSchema = z.object({
  loopId: z.string().min(1, 'Loop ID is required'),
  breakCondition: z.object({
    expression: z.string().min(1, 'Break condition expression is required'),
    metadata: z.any().optional()
  }).optional(),
  loopStartNodeId: z.string().optional()
});

/**
 * 验证LoopEnd节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateLoopEndNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  const typeResult = validateNodeType(node, 'LOOP_END');
  if (typeResult.isErr()) {
    return typeResult;
  }

  const configResult = validateNodeConfig(
    node.config,
    loopEndNodeConfigSchema,
    node.id,
    'LOOP_END'
  );
  if (configResult.isErr()) {
    return configResult;
  }

  return ok(node);
}
