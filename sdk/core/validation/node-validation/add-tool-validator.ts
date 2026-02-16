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
import type { ToolRegistry } from '../../tools/tool-registry';

/**
 * ADD_TOOL节点配置schema
 */
const addToolNodeConfigSchema = z.object({
  toolIds: z.array(z.string().min(1, 'Tool ID must not be empty')).min(1, 'At least one tool ID is required'),
  descriptionTemplate: z.string().optional(),
  scope: z.enum(['THREAD', 'WORKFLOW', 'global']).optional(),
  overwrite: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

/**
 * 验证ADD_TOOL节点配置
 * @param node 节点定义
 * @param toolRegistry 工具注册器（可选，用于验证工具存在性）
 * @returns 验证结果
 */
export function validateAddToolNode(
  node: Node,
  toolRegistry?: ToolRegistry
): Result<Node, ConfigurationValidationError[]> {
  if (node.type !== 'ADD_TOOL') {
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

  // 如果提供了工具注册器，验证工具存在性
  if (toolRegistry) {
    const config = node.config as any;
    const invalidToolIds: string[] = [];

    for (const toolId of config.toolIds) {
      if (!toolRegistry.has(toolId)) {
        invalidToolIds.push(toolId);
      }
    }

    if (invalidToolIds.length > 0) {
      return err([new ConfigurationValidationError(
        `Tool IDs not found in registry: ${invalidToolIds.join(', ')}`,
        {
          configType: 'node',
          configPath: `node.${node.id}.config.toolIds`,
          value: invalidToolIds
        }
      )]);
    }
  }

  return ok(node);
}