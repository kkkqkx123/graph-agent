/**
 * LLM节点验证函数
 * 提供LLM节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';
import type { Result } from '../../../types/result';
import { ok, err } from '../../../utils/result-utils';

/**
 * LLM节点配置schema
 */
const llmNodeConfigSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
  prompt: z.string().optional(),
  parameters: z.record(z.string(), z.any()).optional(),
  maxToolCallsPerRequest: z.number().min(1, 'Max tool calls per request must be at least 1').optional(),
  dynamicTools: z.object({
    toolIds: z.array(z.string().min(1, 'Tool ID must not be empty')).min(1, 'At least one tool ID is required'),
    descriptionTemplate: z.string().optional()
  }).optional()
});

/**
 * 验证LLM节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateLLMNode(node: Node): Result<Node, ValidationError[]> {
  if (node.type !== NodeType.LLM) {
    return err([new ValidationError(`Invalid node type for LLM validator: ${node.type}`, `node.${node.id}`)]);
  }

  const result = llmNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ValidationError('Invalid LLM node configuration', `node.${node.id}.config`)]);
    }
    return err([new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`)]);
  }
  return ok(node);
}