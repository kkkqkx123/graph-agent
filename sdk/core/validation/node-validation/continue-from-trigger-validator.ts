/**
 * ContinueFromTrigger节点验证函数
 * 提供ContinueFromTrigger节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';
import type { Result } from '../../../types/result';
import { ok, err } from '../../../utils/result-utils';

/**
 * ContinueFromTrigger节点配置schema（必须为空对象）
 */
const continueFromTriggerNodeConfigSchema = z.object({}).strict();

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
    return err([new ValidationError('CONTINUE_FROM_TRIGGER node must have no configuration', `node.${node.id}.config`)]);
  }

  return ok(node);
}