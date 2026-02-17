/**
 * 用户交互节点验证函数
 * 提供用户交互节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok } from '@modular-agent/common-utils';
import { validateNodeType, validateNodeConfig } from '../utils.js';

/**
 * 变量更新配置schema
 */
const variableUpdateConfigSchema = z.object({
  variableName: z.string().min(1, { message: 'Variable name is required' }),
  expression: z.string().min(1, { message: 'Expression is required' }),
  scope: z.enum(['global', 'thread', 'subgraph', 'loop'], {
    message: 'Variable scope must be one of: global, thread, subgraph, loop'
  })
});

/**
 * 消息配置schema
 */
const messageConfigSchema = z.object({
  role: z.literal('user', { message: 'Message role must be "user"' }),
  contentTemplate: z.string().min(1, { message: 'Content template is required' })
});

/**
 * 用户交互节点配置schema
 */
const userInteractionNodeConfigSchema = z.object({
  operationType: z.enum(['UPDATE_VARIABLES', 'ADD_MESSAGE'], {
    message: 'Operation type must be one of: UPDATE_VARIABLES, ADD_MESSAGE'
  }),
  variables: z.array(variableUpdateConfigSchema).optional(),
  message: messageConfigSchema.optional(),
  prompt: z.string().min(1, { message: 'Prompt is required' }),
  timeout: z.number().positive().optional(),
  metadata: z.record(z.string(), z.any()).optional()
}).refine(
  (data) => {
    // 验证：UPDATE_VARIABLES 必须有 variables
    if (data.operationType === 'UPDATE_VARIABLES') {
      return data.variables && data.variables.length > 0;
    }
    // 验证：ADD_MESSAGE 必须有 message
    if (data.operationType === 'ADD_MESSAGE') {
      return data.message !== undefined;
    }
    return true;
  },
  {
    message: 'Configuration must match operation type: UPDATE_VARIABLES requires variables, ADD_MESSAGE requires message',
    path: ['operationType']
  }
);

/**
 * 验证用户交互节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateUserInteractionNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  const typeResult = validateNodeType(node, 'USER_INTERACTION');
  if (typeResult.isErr()) {
    return typeResult;
  }

  const configResult = validateNodeConfig(
    node.config,
    userInteractionNodeConfigSchema,
    node.id,
    'USER_INTERACTION'
  );
  if (configResult.isErr()) {
    return configResult;
  }

  return ok(node);
}