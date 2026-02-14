/**
 * Code节点验证函数
 * 提供Code节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

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
 * @returns 验证结果
 */
export function validateCodeNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  if (node.type !== NodeType.CODE) {
    return err([new ConfigurationValidationError(`Invalid node type for code validator: ${node.type}`, {
      configType: 'node',
      configPath: `node.${node.id}`
    })]);
  }

  const result = codeNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ConfigurationValidationError('Invalid code node configuration', {
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