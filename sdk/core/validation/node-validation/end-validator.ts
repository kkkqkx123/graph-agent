/**
 * End节点验证函数
 * 提供End节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import { ConfigurationValidationError } from '@modular-agent/types/errors';
import type { Result } from '@modular-agent/types/result';
import { ok, err } from '@modular-agent/common-utils';

/**
 * End节点配置schema（必须为空对象）
 */
const endNodeConfigSchema = z.object({}).strict();

/**
 * 验证End节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateEndNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  if (node.type !== NodeType.END) {
    return err([new ConfigurationValidationError(`Invalid node type for end validator: ${node.type}`, {
      configType: 'node',
      configPath: `node.${node.id}`
    })]);
  }

  const result = endNodeConfigSchema.safeParse(node.config || {});
  if (!result.success) {
    return err([new ConfigurationValidationError('END node must have no configuration', {
      configType: 'node',
      configPath: `node.${node.id}.config`
    })]);
  }
  return ok(node);
}