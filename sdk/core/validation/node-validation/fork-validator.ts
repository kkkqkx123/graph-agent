/**
 * Fork节点验证函数
 * 提供Fork节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

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
  if (node.type !== NodeType.FORK) {
    return err([new ConfigurationValidationError(`Invalid node type for fork validator: ${node.type}`, {
      configType: 'node',
      configPath: `node.${node.id}`
    })]);
  }

  const result = forkNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ConfigurationValidationError('Invalid fork node configuration', {
        configType: 'node',
        configPath: `node.${node.id}.config`
      })]);
    }
    return err([new ConfigurationValidationError(error.message, {
      configType: 'node',
      configPath: `node.${node.id}.config.${error.path.join('.')}`
    })]);
  }
  return ok(node);
}