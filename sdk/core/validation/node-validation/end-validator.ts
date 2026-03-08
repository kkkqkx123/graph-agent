/**
 * End节点验证函数
 * 提供End节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok } from '@modular-agent/common-utils';
import { validateNodeType, validateNodeConfig } from '../utils.js';

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
  const typeResult = validateNodeType(node, 'END');
  if (typeResult.isErr()) {
    return typeResult;
  }

  const configResult = validateNodeConfig(
    node.config || {},
    endNodeConfigSchema,
    node.id,
    'END'
  );
  if (configResult.isErr()) {
    return configResult;
  }

  return ok(node);
}
