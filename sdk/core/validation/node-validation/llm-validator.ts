/**
 * LLM节点验证函数
 * 提供LLM节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok } from '@modular-agent/common-utils';
import { validateNodeType, validateNodeConfig } from '../utils.js';

/**
 * LLM节点配置schema
 */
const llmNodeConfigSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required'),
  prompt: z.string().optional(),
  parameters: z.record(z.string(), z.any()).optional(),
  maxToolCallsPerRequest: z.number().min(1, 'Max tool calls per request must be at least 1').optional()
});

/**
 * 验证LLM节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateLLMNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  const typeResult = validateNodeType(node, 'LLM');
  if (typeResult.isErr()) {
    return typeResult;
  }

  const configResult = validateNodeConfig(
    node.config,
    llmNodeConfigSchema,
    node.id,
    'LLM'
  );
  if (configResult.isErr()) {
    return configResult;
  }

  return ok(node);
}
