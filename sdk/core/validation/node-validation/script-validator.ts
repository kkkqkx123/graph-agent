/**
 * Code节点验证函数
 * 提供Code节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok } from '@modular-agent/common-utils';
import { validateNodeType, validateNodeConfig } from '../utils.js';

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
export function validateScriptNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  const typeResult = validateNodeType(node, 'SCRIPT');
  if (typeResult.isErr()) {
    return typeResult;
  }

  const configResult = validateNodeConfig(
    node.config,
    codeNodeConfigSchema,
    node.id,
    'SCRIPT'
  );
  if (configResult.isErr()) {
    return configResult;
  }

  return ok(node);
}
