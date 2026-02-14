/**
 * LoopEnd节点验证函数
 * 提供LoopEnd节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

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
export function validateLoopEndNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  if (node.type !== NodeType.LOOP_END) {
    return err([new ConfigurationValidationError(`Invalid node type for loop end validator: ${node.type}`, {
      configType: 'node',
      configPath: `node.${node.id}`
    })]);
  }

  const result = loopEndNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ConfigurationValidationError('Invalid loop end node configuration', {
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