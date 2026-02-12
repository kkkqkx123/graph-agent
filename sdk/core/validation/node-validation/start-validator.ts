/**
 * Start节点验证函数
 * 提供Start节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import { ValidationError } from '@modular-agent/types/errors';
import type { Result } from '@modular-agent/types/result';
import { ok, err } from '@modular-agent/common-utils';

/**
 * Start节点配置schema（必须为空对象）
 */
const startNodeConfigSchema = z.object({}).strict();

/**
 * 验证Start节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateStartNode(node: Node): Result<Node, ValidationError[]> {
  if (node.type !== NodeType.START) {
    return err([new ValidationError(`Invalid node type for start validator: ${node.type}`, `node.${node.id}`)]);
  }

  const result = startNodeConfigSchema.safeParse(node.config || {});
  if (!result.success) {
    return err([new ValidationError('START node must have no configuration', `node.${node.id}.config`)]);
  }
  return ok(node);
}