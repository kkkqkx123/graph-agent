/**
 * Fork节点验证函数
 * 提供Fork节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok } from '@modular-agent/common-utils';
import { validateNodeType, validateNodeConfig } from '../utils.js';

/**
 * Fork节点配置schema
 */
const forkPathSchema = z.object({
  pathId: z.string().min(1, 'Path ID is required'),
  childNodeId: z.string().min(1, 'Child node ID is required')
});

const forkNodeConfigSchema = z.object({
  forkPaths: z.array(forkPathSchema).min(1, 'Fork paths must be a non-empty array'),
  forkStrategy: z.enum(['serial', 'parallel'])
}).refine(
  (data) => {
    // 验证pathId唯一性
    const pathIds = data.forkPaths.map(p => p.pathId);
    const uniquePathIds = new Set(pathIds);
    return pathIds.length === uniquePathIds.size;
  },
  { message: 'Fork path IDs must be unique', path: ['forkPaths'] }
);

/**
 * 验证Fork节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateForkNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  const typeResult = validateNodeType(node, 'FORK');
  if (typeResult.isErr()) {
    return typeResult;
  }

  const configResult = validateNodeConfig(
    node.config,
    forkNodeConfigSchema,
    node.id,
    'FORK'
  );
  if (configResult.isErr()) {
    return configResult;
  }

  return ok(node);
}