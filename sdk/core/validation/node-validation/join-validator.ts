/**
 * Join节点验证函数
 * 提供Join节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

/**
 * Join节点配置schema
 *
 * 说明：
 * - childThreadIds不在schema中定义，因为子线程ID是运行时动态值，
 *   在FORK节点执行时存储到执行上下文中，JOIN节点执行时从执行上下文读取。
 * - timeout 允许为 0（无超时）或正数。当为 0 时表示始终等待，不设置超时。
 * - forkPathIds 必须与配对的FORK节点的forkPaths中的pathId完全一致（包括顺序）
 * - mainPathId 指定主线程路径，必须是forkPathIds中的一个值
 */
const joinNodeConfigSchema = z.object({
  forkPathIds: z.array(z.string()).min(1, 'Fork path IDs must be a non-empty array'),
  joinStrategy: z.enum(['ALL_COMPLETED', 'ANY_COMPLETED', 'ALL_FAILED', 'ANY_FAILED', 'SUCCESS_COUNT_THRESHOLD']),
  threshold: z.number().positive('Threshold must be positive').optional(),
  timeout: z.number().nonnegative('Timeout must be non-negative').optional(),
  mainPathId: z.string().min(1, 'Main path ID is required')
}).refine(
  (data) => {
    if (data.joinStrategy === 'SUCCESS_COUNT_THRESHOLD' && data.threshold === undefined) {
      return false;
    }
    return true;
  },
  { message: 'Join node must have a valid threshold when using SUCCESS_COUNT_THRESHOLD strategy', path: ['threshold'] }
).refine(
  (data) => {
    return data.forkPathIds.includes(data.mainPathId);
  },
  { message: 'mainPathId must be one of the forkPathIds', path: ['mainPathId'] }
);

/**
 * 验证Join节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateJoinNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  if (node.type !== NodeType.JOIN) {
    return err([new ConfigurationValidationError(`Invalid node type for join validator: ${node.type}`, {
      configType: 'node',
      configPath: `node.${node.id}`
    })]);
  }

  const result = joinNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ConfigurationValidationError('Invalid join node configuration', {
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