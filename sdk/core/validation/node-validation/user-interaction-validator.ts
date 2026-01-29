/**
 * 用户交互节点验证函数
 * 提供用户交互节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

/**
 * 用户交互节点配置schema
 */
const userInteractionNodeConfigSchema = z.object({
  userInteractionType: z.enum(['ask_for_approval', 'ask_for_input', 'ask_for_selection', 'show_message'], {
    message: 'User interaction type must be one of: ask_for_approval, ask_for_input, ask_for_selection, show_message'
  }),
  showMessage: z.string().optional(),
  userInput: z.any().optional()
});

/**
 * 验证用户交互节点配置
 * @param node 节点定义
 * @throws ValidationError 当配置无效时抛出
 */
export function validateUserInteractionNode(node: Node): void {
  if (node.type !== NodeType.USER_INTERACTION) {
    throw new ValidationError(`Invalid node type for user interaction validator: ${node.type}`, `node.${node.id}`);
  }

  const result = userInteractionNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      throw new ValidationError('Invalid user interaction node configuration', `node.${node.id}.config`);
    }
    throw new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`);
  }
}