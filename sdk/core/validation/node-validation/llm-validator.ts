/**
 * LLM节点验证函数
 * 提供LLM节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

/**
 * LLM节点配置schema
 */
const llmNodeConfigSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
  parameters: z.record(z.string(), z.any()).optional()
});

/**
 * 验证LLM节点配置
 * @param node 节点定义
 * @throws ValidationError 当配置无效时抛出
 */
export function validateLLMNode(node: Node): void {
  if (node.type !== NodeType.LLM) {
    throw new ValidationError(`Invalid node type for LLM validator: ${node.type}`, `node.${node.id}`);
  }

  const result = llmNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      throw new ValidationError('Invalid LLM node configuration', `node.${node.id}.config`);
    }
    throw new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`);
  }
}