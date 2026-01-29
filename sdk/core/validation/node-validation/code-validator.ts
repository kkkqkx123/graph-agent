/**
 * Code节点验证函数
 * 提供Code节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

/**
 * Code节点配置schema
 */
const codeNodeConfigSchema = z.object({
  scriptName: z.string().min(1, 'Script name is required'),
  scriptType: z.enum(['shell', 'cmd', 'powershell', 'python', 'javascript']),
  risk: z.enum(['none', 'low', 'medium', 'high']),
  timeout: z.number().positive('Timeout must be positive').optional(),
  retries: z.number().nonnegative('Retries must be non-negative').optional(),
  retryDelay: z.number().nonnegative('Retry delay must be non-negative').optional(),
  inline: z.boolean().optional()
});

/**
 * 验证Code节点配置
 * @param node 节点定义
 * @throws ValidationError 当配置无效时抛出
 */
export function validateCodeNode(node: Node): void {
  if (node.type !== NodeType.CODE) {
    throw new ValidationError(`Invalid node type for code validator: ${node.type}`, `node.${node.id}`);
  }

  const result = codeNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      throw new ValidationError('Invalid code node configuration', `node.${node.id}.config`);
    }
    throw new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`);
  }
}