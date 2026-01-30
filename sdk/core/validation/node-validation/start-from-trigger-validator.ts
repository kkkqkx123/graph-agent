/**
 * StartFromTrigger节点验证函数
 * 提供StartFromTrigger节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '../../../types/node';
import { NodeType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

/**
 * StartFromTrigger节点配置schema
 * 与SubgraphNodeConfig保持一致
 */
const startFromTriggerNodeConfigSchema = z.object({
  subgraphId: z.string().min(1, 'Subgraph ID is required'),
  inputMapping: z.record(z.string(), z.string()),
  outputMapping: z.record(z.string(), z.string()),
  async: z.boolean()
});

/**
 * 验证StartFromTrigger节点配置
 * @param node 节点定义
 * @throws ValidationError 当配置无效时抛出
 */
export function validateStartFromTriggerNode(node: Node): void {
  if (node.type !== NodeType.START_FROM_TRIGGER) {
    throw new ValidationError(`Invalid node type for start-from-trigger validator: ${node.type}`, `node.${node.id}`);
  }

  const result = startFromTriggerNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      throw new ValidationError('Invalid start-from-trigger node configuration', `node.${node.id}.config`);
    }
    throw new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`);
  }
}