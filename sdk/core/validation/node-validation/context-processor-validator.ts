/**
 * ContextProcessor节点验证函数
 * 提供ContextProcessor节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

/**
 * ContextProcessor节点配置schema
 */
const contextProcessorNodeConfigSchema = z.object({
  processorType: z.enum(['transform', 'filter', 'merge', 'split']),
  rules: z.array(z.object({
    sourcePath: z.string().min(1, 'Source path is required'),
    targetPath: z.string().min(1, 'Target path is required'),
    transform: z.string().optional()
  })).min(1, 'Rules array cannot be empty')
});

/**
 * 验证ContextProcessor节点配置
 * @param node 节点定义
 * @throws ValidationError 当配置无效时抛出
 */
export function validateContextProcessorNode(node: Node): void {
  if (node.type !== NodeType.CONTEXT_PROCESSOR) {
    throw new ValidationError(`Invalid node type for context processor validator: ${node.type}`, `node.${node.id}`);
  }

  const result = contextProcessorNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      throw new ValidationError('Invalid context processor node configuration', `node.${node.id}.config`);
    }
    throw new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`);
  }
}