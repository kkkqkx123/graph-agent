/**
 * ADD_TOOL 节点验证函数
 * 提供 ADD_TOOL 节点的静态验证逻辑，使用 zod 进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import type { Result } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';
import { validateNodeType, validateNodeConfig } from '../../../core/validation/utils.js';

/**
 * 工具存在性检查接口
 */
interface HasToolChecker {
  hasTool(toolId: string): boolean;
}

/**
 * ADD_TOOL 节点配置 schema
 */
const addToolNodeConfigSchema = z.object({
  toolIds: z.array(z.string().min(1, 'Tool ID must not be empty')).min(1, 'At least one tool ID is required'),
  descriptionTemplate: z.string().optional(),
  scope: z.enum(['GLOBAL', 'THREAD', 'LOCAL']).optional(),
  overwrite: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

/**
 * 验证 ADD_TOOL 节点配置
 * @param node 节点定义
 * @param toolChecker 工具检查器（可选，用于验证工具存在性，如 ToolService）
 * @returns 验证结果
 */
export function validateAddToolNode(
  node: Node,
  toolChecker?: HasToolChecker
): Result<Node, ConfigurationValidationError[]> {
  const typeResult = validateNodeType(node, 'ADD_TOOL');
  if (typeResult.isErr()) {
    return typeResult;
  }

  const configResult = validateNodeConfig(
    node.config,
    addToolNodeConfigSchema,
    node.id,
    'ADD_TOOL'
  );
  if (configResult.isErr()) {
    return configResult;
  }

  // 如果提供了工具检查器，验证工具存在性
  if (toolChecker) {
    const config = node.config as any;
    const invalidToolIds: string[] = [];

    for (const toolId of config.toolIds) {
      if (!toolChecker.hasTool(toolId)) {
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
