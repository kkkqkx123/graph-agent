/**
 * ContinueFromTrigger节点验证函数
 * 提供ContinueFromTrigger节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import { ValidationError } from '@modular-agent/types/errors';
import type { Result } from '@modular-agent/types/result';
import { ok, err } from '@modular-agent/common-utils';

/**
 * ContinueFromTrigger节点配置schema
 */
const continueFromTriggerNodeConfigSchema = z.object({
  variableCallback: z.object({
    includeVariables: z.array(z.string()).optional(),
    includeAll: z.boolean().optional()
  }).optional(),
  conversationHistoryCallback: z.object({
    lastN: z.number().int().positive().optional(),
    lastNByRole: z.object({
      role: z.enum(['system', 'user', 'assistant', 'tool']),
      count: z.number().int().positive()
    }).optional(),
    byRole: z.enum(['system', 'user', 'assistant', 'tool']).optional(),
    range: z.object({
      start: z.number().int().nonnegative(),
      end: z.number().int().positive()
    }).optional()
  }).optional()
}).strict();

/**
 * 验证ContinueFromTrigger节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateContinueFromTriggerNode(node: Node): Result<Node, ValidationError[]> {
  if (node.type !== NodeType.CONTINUE_FROM_TRIGGER) {
    return err([new ValidationError(`Invalid node type for continue-from-trigger validator: ${node.type}`, `node.${node.id}`)]);
  }

  const result = continueFromTriggerNodeConfigSchema.safeParse(node.config || {});
  if (!result.success) {
    const errors = result.error.issues.map((err: any) =>
      new ValidationError(
        `Invalid CONTINUE_FROM_TRIGGER node configuration: ${err.message}`,
        `node.${node.id}.config`
      )
    );
    return err(errors);
  }

  // 验证配置逻辑
  const config = node.config as any;
  
  // 如果配置了variableCallback，不能同时设置includeAll和includeVariables
  if (config.variableCallback?.includeAll && config.variableCallback?.includeVariables) {
    return err([new ValidationError(
      'variableCallback cannot have both includeAll and includeVariables',
      `node.${node.id}.config.variableCallback`
    )]);
  }

  return ok(node);
}