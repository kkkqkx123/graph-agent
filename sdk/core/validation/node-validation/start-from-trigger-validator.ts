/**
 * StartFromTrigger节点验证函数
 * 提供StartFromTrigger节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';
import type { Result } from '../../../types/result';
import { ok, err } from '../../../utils/result-utils';

/**
 * START_FROM_TRIGGER 节点配置 schema
 * 空配置，仅作为标识
 */
const startFromTriggerNodeConfigSchema = z.strictObject({});

/**
 * 验证 START_FROM_TRIGGER 节点
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateStartFromTriggerNode(node: Node): Result<Node, ValidationError[]> {
  if (node.type !== NodeType.START_FROM_TRIGGER) {
    return err([new ValidationError(`Invalid node type for start-from-trigger validator: ${node.type}`, `node.${node.id}`)]);
  }

  const result = startFromTriggerNodeConfigSchema.safeParse(node.config || {});
  if (!result.success) {
    return err([new ValidationError('START_FROM_TRIGGER node must have no configuration', `node.${node.id}.config`)]);
  }

  return ok(node);
}