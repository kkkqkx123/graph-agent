/**
 * Start节点验证函数
 * 提供Start节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok } from '@modular-agent/common-utils';
import { validateNodeType, validateNodeConfig } from '../utils.js';

/**
 * Start节点配置schema（必须为空对象）
 */
const startNodeConfigSchema = z.object({}).strict();

/**
 * 验证Start节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateStartNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  const typeResult = validateNodeType(node, 'START');
  if (typeResult.isErr()) {
    return typeResult;
  }

  const configResult = validateNodeConfig(
    node.config || {},
    startNodeConfigSchema,
    node.id,
    'START'
  );
  if (configResult.isErr()) {
    return configResult;
  }

  return ok(node);
}