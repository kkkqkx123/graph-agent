/**
 * ContinueFromTrigger节点验证函数
 * 提供ContinueFromTrigger节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';
import { validateNodeType, validateNodeConfig } from '../utils.js';

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
export function validateContinueFromTriggerNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  const typeResult = validateNodeType(node, 'CONTINUE_FROM_TRIGGER');
  if (typeResult.isErr()) {
    return typeResult;
  }

  const configResult = validateNodeConfig(
    node.config || {},
    continueFromTriggerNodeConfigSchema,
    node.id,
    'CONTINUE_FROM_TRIGGER'
  );
  if (configResult.isErr()) {
    return configResult;
  }

  // 验证配置逻辑
  const config = node.config as any;
  
  // 如果配置了variableCallback，不能同时设置includeAll和includeVariables
  if (config.variableCallback?.includeAll && config.variableCallback?.includeVariables) {
    return err([new ConfigurationValidationError(
      'variableCallback cannot have both includeAll and includeVariables',
      {
        configType: 'node',
        configPath: `node.${node.id}.config.variableCallback`
      }
    )]);
  }

  return ok(node);
}