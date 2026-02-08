/**
 * LoopEnd节点验证函数
 * 提供LoopEnd节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';
import type { Result } from '../../../types/result';
import { ok, err } from '../../../utils/result-utils';

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
export function validateLoopEndNode(node: Node): Result<Node, ValidationError[]> {
  if (node.type !== NodeType.LOOP_END) {
    return err([new ValidationError(`Invalid node type for loop end validator: ${node.type}`, `node.${node.id}`)]);
  }

  const result = loopEndNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ValidationError('Invalid loop end node configuration', `node.${node.id}.config`)]);
    }
    return err([new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`)]);
  }
  return ok(node);
}