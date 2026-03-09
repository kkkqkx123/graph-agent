/**
 * StartFromTrigger节点验证函数
 * 提供StartFromTrigger节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok } from '@modular-agent/common-utils';
import { validateNodeType, validateNodeConfig } from '../utils.js';

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
export function validateStartFromTriggerNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  const typeResult = validateNodeType(node, 'START_FROM_TRIGGER');
  if (typeResult.isErr()) {
    return typeResult;
  }

  const configResult = validateNodeConfig(
    node.config || {},
    startFromTriggerNodeConfigSchema,
    node.id,
    'START_FROM_TRIGGER'
  );
  if (configResult.isErr()) {
    return configResult;
  }

  return ok(node);
}
