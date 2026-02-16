/**
 * ADD_TOOL节点验证函数
 * 提供ADD_TOOL节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';

/**
 * ADD_TOOL节点配置schema
 */
const addToolNodeConfigSchema = z.object({
  toolIds: z.array(z.string().min(1, 'Tool ID must not be empty')).min(1, 'At least one tool ID is required'),
  descriptionTemplate: z.string().optional(),
  scope: z.enum(['THREAD', 'WORKFLOW', 'GLOBAL']).optional(),
  overwrite: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

/**
 * 验证ADD_TOOL节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateAddToolNode(node: Node): Result<Node, ConfigurationValidationError[]> {
  if (node.type !== NodeType.ADD_TOOL) {
    return err([new ConfigurationValidationError(`Invalid node type for ADD_TOOL validator: ${node.type}`, {
      configType: 'node',
      configPath: `node.${node.id}`
    })]);
  }

  const result = addToolNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ConfigurationValidationError('Invalid ADD_TOOL node configuration', {
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