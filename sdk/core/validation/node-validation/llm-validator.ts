/**
 * LLM节点验证函数
 * 提供LLM节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import { ConfigurationValidationError } from '@modular-agent/types/errors';
import type { Result } from '@modular-agent/types/result';
import { ok, err } from '@modular-agent/common-utils';

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
export function validateLLMNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  if (node.type !== NodeType.LLM) {
    return err([new ConfigurationValidationError(`Invalid node type for LLM validator: ${node.type}`, {
      configType: 'node',
      configPath: `node.${node.id}`
    })]);
  }

  const result = llmNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ConfigurationValidationError('Invalid LLM node configuration', {
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