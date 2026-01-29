/**
 * Tool节点验证函数
 * 提供Tool节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

/**
 * Tool节点配置schema
 */
const toolNodeConfigSchema = z.object({
  toolName: z.string().min(1, 'Tool name is required'),
  parameters: z.record(z.string(), z.any()),
  timeout: z.number().positive('Timeout must be positive').optional(),
  retries: z.number().nonnegative('Retries must be non-negative').optional(),
  retryDelay: z.number().nonnegative('Retry delay must be non-negative').optional()
});

/**
 * 验证Tool节点配置
 * @param node 节点定义
 * @throws ValidationError 当配置无效时抛出
 */
export function validateToolNode(node: Node): void {
  if (node.type !== NodeType.TOOL) {
    throw new ValidationError(`Invalid node type for tool validator: ${node.type}`, `node.${node.id}`);
  }

  const result = toolNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      throw new ValidationError('Invalid tool node configuration', `node.${node.id}.config`);
    }
    throw new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`);
  }
}