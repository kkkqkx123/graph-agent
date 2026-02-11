/**
 * LoopStart节点验证函数
 * 提供LoopStart节点的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { Node } from '@modular-agent/types/node';
import { NodeType } from '@modular-agent/types/node';
import { ValidationError } from '@modular-agent/types/errors';
import type { Result } from '@modular-agent/types/result';
import { ok, err } from '@modular-agent/common-utils/result-utils';

/**
 * 循环数据源schema
 * 
 * DataSource 支持两种形式：
 * 1. 直接值：数组、对象、数字、字符串
 * 2. 变量表达式字符串：{{variable.path}} 形式
 * 
 * 注意：变量表达式的实际解析和验证在运行时由 loopStartHandler 负责
 */
const dataSourceSchema = z.object({
  iterable: z.any().refine(
    (val) => val !== undefined && val !== null,
    'Iterable is required'
  ),
  variableName: z.string().min(1, 'Variable name is required')
});

/**
 * LoopStart节点配置schema
 * 
 * 支持两种模式：
 * 1. 数据驱动循环：提供 dataSource（包含 iterable 和 variableName）
 * 2. 计数循环：不提供 dataSource，仅使用 maxIterations
 */
const loopStartNodeConfigSchema = z.object({
  loopId: z.string().min(1, 'Loop ID is required'),
  dataSource: dataSourceSchema.optional(),
  maxIterations: z.number().positive('Max iterations must be positive')
});

/**
 * 验证LoopStart节点配置
 * @param node 节点定义
 * @returns 验证结果
 */
export function validateLoopStartNode(node: Node): Result<Node, ValidationError[]> {
  if (node.type !== NodeType.LOOP_START) {
    return err([new ValidationError(`Invalid node type for loop start validator: ${node.type}`, `node.${node.id}`)]);
  }

  const result = loopStartNodeConfigSchema.safeParse(node.config);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ValidationError('Invalid loop start node configuration', `node.${node.id}.config`)]);
    }
    return err([new ValidationError(error.message, `node.${node.id}.config.${error.path.join('.')}`)]);
  }
  return ok(node);
}